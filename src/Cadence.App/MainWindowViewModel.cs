using System.Collections.ObjectModel;
using System.Text.Json;
using System.Text.Json.Serialization;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Cadence.Domain;

namespace Cadence.App;

public partial class MainWindowViewModel : ObservableObject
{
    [ObservableProperty] private bool showDependencies;
    [ObservableProperty] private bool alignBySchedule;

    public ObservableCollection<MeasureVm> Measures { get; } = new();
    public ObservableCollection<ChordVm> Chords { get; } = new();
    public ObservableCollection<NoteVm> Notes { get; } = new();

    private Piece? _piece;
    private readonly IScheduler _scheduler = new SimpleAsapScheduler();

    public MainWindowViewModel()
    {
        // Load sample on startup for convenience
        if (File.Exists("fixtures/sample-piece.json"))
        {
            LoadFromJson(File.ReadAllText("fixtures/sample-piece.json"));
        }
    }

    [RelayCommand]
    private void LoadSeed()
    {
        if (File.Exists("fixtures/sample-piece.json"))
        {
            LoadFromJson(File.ReadAllText("fixtures/sample-piece.json"));
        }
    }

    [RelayCommand]
    private async Task RunScheduler()
    {
        if (_piece is null) return;
        var snap = await _scheduler.RunAsync(_piece, ScheduleMode.Forward);
        // naive placement: compute canvas positions based on scheduled start
        // Convert timespan to pixels (1 minute = 2 px, just for demo)
        double pxPerMinute = 2.0;

        Notes.Clear();
        foreach (var sn in snap.Notes)
        {
            var n = _piece.Notes.First(x => x.Id == sn.NoteId);
            var chord = _piece.Chords.FirstOrDefault(c => c.Id == n.ChordId);
            var minutes = (sn.EndUtc - sn.StartUtc).TotalMinutes;
            Notes.Add(new NoteVm
            {
                Title = n.Title,
                DurationText = $"{n.DurationBeats:0.##} beats",
                ChordName = chord?.Name ?? "(no chord)",
                CanvasLeft = (sn.StartUtc - _piece.StartUtc).TotalMinutes * pxPerMinute,
                CanvasTop = (chord is null ? 0 : 60 + _piece.Chords.IndexOf(chord) * 50),
                Color = chord is null ? "#FFD" : "#E6F3FF"
            });
        }

        // Measures display
        Measures.Clear();
        foreach (var m in _piece.Measures)
        {
            Measures.Add(new MeasureVm
            {
                Label = $"{m.StartUtc:MMM d}",
                CapacityText = $"cap: {m.CapacityBeats} beats"
            });
        }

        // Chords ribbon
        Chords.Clear();
        foreach (var c in _piece.Chords)
        {
            Chords.Add(new ChordVm { Name = c.Name });
        }
    }

    private void LoadFromJson(string json)
    {
        var seed = JsonSerializer.Deserialize<SeedPiece>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        })!;

        var piece = new Piece
        {
            Id = Guid.NewGuid(),
            Title = seed.Piece.Title,
            StartUtc = DateTimeOffset.Parse(seed.Piece.StartUtc),
            DeadlineUtc = DateTimeOffset.Parse(seed.Piece.DeadlineUtc),
            BeatsPerMeasure = seed.Piece.BeatsPerMeasure,
            MinutesPerBeat = seed.Piece.MinutesPerBeat
        };

        foreach (var (m, idx) in seed.Measures.Select((m,i)=>(m,i)))
        {
            piece.Measures.Add(new Measure
            {
                Id = Guid.NewGuid(),
                Index = idx,
                StartUtc = DateTimeOffset.Parse(m.StartUtc),
                EndUtc = DateTimeOffset.Parse(m.EndUtc),
                CapacityBeats = m.CapacityBeats,
                IsWorkday = true
            });
        }

        var chordIdMap = new Dictionary<string, Guid>();
        foreach (var c in seed.Chords)
        {
            var id = Guid.NewGuid();
            chordIdMap[c.Id ?? Guid.NewGuid().ToString()] = id;
            piece.Chords.Add(new Chord { Id = id, Name = c.Name, Priority = c.Priority, Color = c.Color });
        }

        var noteIdMap = new Dictionary<string, Guid>();
        foreach (var n in seed.Notes)
        {
            var id = Guid.NewGuid();
            noteIdMap[n.Id ?? Guid.NewGuid().ToString()] = id;
            piece.Notes.Add(new Note
            {
                Id = id,
                Title = n.Title,
                Description = null,
                DurationBeats = n.DurationBeats,
                EarliestStartUtc = n.EarliestStartUtc is null ? null : DateTimeOffset.Parse(n.EarliestStartUtc),
                DueByUtc = n.DueByUtc is null ? null : DateTimeOffset.Parse(n.DueByUtc),
                ChordId = n.ChordId is not null && chordIdMap.TryGetValue(n.ChordId, out var cid) ? cid : null
            });
        }

        foreach (var d in seed.Dependencies)
        {
            var pred = noteIdMap[d.PredecessorNoteId];
            var succ = noteIdMap[d.SuccessorNoteId];
            piece.Dependencies.Add(new Dependency { Id = Guid.NewGuid(), PredecessorNoteId = pred, SuccessorNoteId = succ });
        }

        _piece = piece;
    }
}

public sealed class MeasureVm
{
    public string Label { get; set; } = "";
    public string CapacityText { get; set; } = "";
}

public sealed class ChordVm
{
    public string Name { get; set; } = "";
}

public sealed class NoteVm : ObservableObject
{
    public string Title { get; set; } = "";
    public string DurationText { get; set; } = "";
    public string ChordName { get; set; } = "";
    public double CanvasLeft { get; set; }
    public double CanvasTop { get; set; }
    public string Color { get; set; } = "#FFD";
}

// Seed JSON DTOs
file class SeedPiece
{
    public required SeedPieceHeader Piece { get; init; }
    public required List<SeedMeasure> Measures { get; init; }
    public required List<SeedChord> Chords { get; init; }
    public required List<SeedNote> Notes { get; init; }
    public required List<SeedDep> Dependencies { get; init; }
}

file class SeedPieceHeader
{
    public required string Title { get; init; }
    public required string StartUtc { get; init; }
    public required string DeadlineUtc { get; init; }
    public required int BeatsPerMeasure { get; init; }
    public required double MinutesPerBeat { get; init; }
}

file class SeedMeasure
{
    public required int Index { get; init; }
    public required string StartUtc { get; init; }
    public required string EndUtc { get; init; }
    public required int CapacityBeats { get; init; }
}

file class SeedChord
{
    public string? Id { get; init; }
    public required string Name { get; init; }
    public int Priority { get; init; }
    public string? Color { get; init; }
}

file class SeedNote
{
    public string? Id { get; init; }
    public required string Title { get; init; }
    public double DurationBeats { get; init; }
    public string? EarliestStartUtc { get; init; }
    public string? DueByUtc { get; init; }
    public string? ChordId { get; init; }
}

file class SeedDep
{
    public required string PredecessorNoteId { get; init; }
    public required string SuccessorNoteId { get; init; }
}
