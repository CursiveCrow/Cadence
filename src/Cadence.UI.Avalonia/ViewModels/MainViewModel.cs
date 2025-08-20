using System.Collections.ObjectModel;
using Cadence.Domain.Entities;
using Cadence.Domain.Sheet;

namespace Cadence.UI.ViewModels;

public sealed class MainViewModel
{
    public ObservableCollection<SheetNodeVm> SheetNodes { get; } = new();

    public MainViewModel()
    {
        // Design-time: create a tiny in-memory piece and show basic nodes
        var piece = new Piece { Title = "Album v1" };
        var ch = new Chord { Name = "Design Theme" };
        piece.Chords.Add(ch);
        piece.Notes.Add(new Note { Title = "Draft melody", DurationBeats = 3, ChordId = ch.Id });
        piece.Notes.Add(new Note { Title = "Harmony pass", DurationBeats = 5, ChordId = ch.Id });

        var builder = new DefaultGraphBuilder();
        var graph = builder.Build(piece, null, new SheetOptions(OverlayDependencies: false, AlignByScheduleTime: false, AggregateChordProgress: true));
        foreach (var n in graph.Nodes)
            SheetNodes.Add(new SheetNodeVm(n.Label, n.Type.ToString()));
    }
}

public sealed class SheetNodeVm(string label, string type)
{
    public string Label { get; } = label;
    public string Type { get; } = type;
}
