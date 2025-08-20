using Cadence.Domain.Common;

namespace Cadence.Domain.Entities;

public enum NoteStatus { Planned, InProgress, Blocked, Done }

public sealed class Piece
{
    public Id Id { get; init; } = Id.New();
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public DateTimeOffset StartUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset DeadlineUtc { get; set; } = DateTimeOffset.UtcNow.AddDays(7);
    public int BeatsPerMeasure { get; set; } = 8;
    public double MinutesPerBeat { get; set; } = 60;

    public List<Measure> Measures { get; } = new();
    public List<Chord> Chords { get; } = new();
    public List<Note> Notes { get; } = new();
    public List<Dependency> Dependencies { get; } = new();
}

public sealed class Measure
{
    public Id Id { get; init; } = Id.New();
    public int Index { get; set; }
    public DateTimeOffset StartUtc { get; set; }
    public DateTimeOffset EndUtc { get; set; }
    public int CapacityBeats { get; set; } = 8;
    public bool IsWorkday { get; set; } = true;
    public string? Label { get; set; }
}

public sealed class Chord
{
    public Id Id { get; init; } = Id.New();
    public string Name { get; set; } = "";
    public int Priority { get; set; }
    public string? Color { get; set; }
    public DateTimeOffset? SoftDueStartUtc { get; set; }
    public DateTimeOffset? SoftDueEndUtc { get; set; }
}

public sealed class Note
{
    public Id Id { get; init; } = Id.New();
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public double DurationBeats { get; set; }
    public DateTimeOffset? EarliestStartUtc { get; set; }
    public DateTimeOffset? DueByUtc { get; set; }
    public bool Mandatory { get; set; } = true;
    public string? Context { get; set; }
    public NoteStatus Status { get; set; } = NoteStatus.Planned;
    public Id? ChordId { get; set; }
    public int? LockedMeasureIndex { get; set; }
    public (DateTimeOffset Start, DateTimeOffset End)? LockedSpanUtc { get; set; }
}

public sealed class Dependency
{
    public Id Id { get; init; } = Id.New();
    public Id PredecessorNoteId { get; init; }
    public Id SuccessorNoteId { get; init; }
}
