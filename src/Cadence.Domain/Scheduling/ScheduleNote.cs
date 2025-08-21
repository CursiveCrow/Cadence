namespace Cadence.Domain.Scheduling;

/// <summary>
/// Represents a specific placement of a Note in the schedule. Immutable.
/// </summary>
public record ScheduledNote(
    Guid NoteId,
    DateTimeOffset StartUtc,
    DateTimeOffset EndUtc
);