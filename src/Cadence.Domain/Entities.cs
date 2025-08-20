using System.Collections.ObjectModel;

namespace Cadence.Domain;

public enum NoteStatus { Planned, InProgress, Blocked, Done }

public sealed class Piece
{
    public required Guid Id { get; init; }
    public required string Title { get; set; }
    public DateTimeOffset StartUtc { get; set; }
    public DateTimeOffset DeadlineUtc { get; set; }
    public int BeatsPerMeasure { get; set; } = 8;
    public double MinutesPerBeat { get; set; } = 60;

    public List<Measure> Measures { get; } = new();
    public List<Chord> Chords { get; } = new();
    public List<Note> Notes { get; } = new();
    public List<Dependency> Dependencies { get; } = new();
}

public sealed class Measure
{
    public required Guid Id { get; init; }
    public required int Index { get; set; }  // 0..N
    public required DateTimeOffset StartUtc { get; set; }
    public required DateTimeOffset EndUtc { get; set; }
    public required int CapacityBeats { get; set; }
    public bool IsWorkday { get; set; } = true;
    public string? Label { get; set; }
}

public sealed class Chord
{
    public required Guid Id { get; init; }
    public required string Name { get; set; }
    public int Priority { get; set; }
    public string? Color { get; set; }
    public DateTimeOffset? SoftDueStartUtc { get; set; }
    public DateTimeOffset? SoftDueEndUtc { get; set; }
}

public sealed class Note
{
    public required Guid Id { get; init; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public double DurationBeats { get; set; }
    public DateTimeOffset? EarliestStartUtc { get; set; }
    public DateTimeOffset? DueByUtc { get; set; }
    public bool Mandatory { get; set; } = true;
    public NoteStatus Status { get; set; } = NoteStatus.Planned;
    public Guid? ChordId { get; set; }
    public int? LockedMeasureIndex { get; set; }
    public (DateTimeOffset Start, DateTimeOffset End)? LockedSpanUtc { get; set; }
}

public sealed class Dependency
{
    public required Guid Id { get; init; }
    public required Guid PredecessorNoteId { get; init; }
    public required Guid SuccessorNoteId { get; init; }
}
