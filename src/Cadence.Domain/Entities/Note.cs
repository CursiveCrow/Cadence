using Cadence.Domain.Common;
using Cadence.Domain.ValueObjects;
using Cadence.Domain.Enums;

namespace Cadence.Domain.Entities;

// T055: Represents an Atomic task.
public class Note : EntityBase
{
    public Guid PieceId { get; private set; }
    public Guid? ChordId { get; private set; }

    public string Title { get; private set; }
    public string? Description { get; private set; }

    public Beats DurationBeats { get; private set; }

    // Constraints
    public DateTimeOffset? EarliestStartUtc { get; private set; }
    public DateTimeOffset? DueByUtc { get; private set; }
    public bool Mandatory { get; private set; } = true;

    public string? Context { get; private set; }
    public NoteStatus Status { get; private set; } = NoteStatus.Planned;

    // Locks
    public int? LockedMeasureIndex { get; private set; }
    public DateTimeOffset? LockedStartUtc { get; private set; }
    public DateTimeOffset? LockedEndUtc { get; private set; }

    public Note(Guid id, Guid pieceId, string title, Beats durationBeats, Guid? chordId = null,
                DateTimeOffset? earliestStartUtc = null, DateTimeOffset? dueByUtc = null)
        : base(id)
    {
        Guard.AgainstNullOrEmpty(title, nameof(title));
        Guard.AgainstZeroOrNegative(durationBeats.Value, nameof(durationBeats));

        if (earliestStartUtc.HasValue && dueByUtc.HasValue)
        {
            Guard.AgainstInvalidDateRange(earliestStartUtc.Value, dueByUtc.Value, nameof(earliestStartUtc), nameof(dueByUtc));
        }

        PieceId = pieceId;
        Title = title;
        DurationBeats = durationBeats;
        ChordId = chordId;
        EarliestStartUtc = earliestStartUtc;
        DueByUtc = dueByUtc;
    }

    public void LockToMeasure(int measureIndex)
    {
        Guard.AgainstNegative(measureIndex, nameof(measureIndex));
        LockedMeasureIndex = measureIndex;
        LockedStartUtc = null;
        LockedEndUtc = null;
    }

    public void Unlock()
    {
        LockedMeasureIndex = null;
        LockedStartUtc = null;
        LockedEndUtc = null;
    }

    // EF Core constructor
    private Note() { }
}