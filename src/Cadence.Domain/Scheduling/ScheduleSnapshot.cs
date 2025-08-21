using Cadence.Domain.Enums;
using Cadence.Domain.Common;

namespace Cadence.Domain.Scheduling;

/// <summary>
/// Represents the result of a scheduling run.
/// </summary>
public class ScheduleSnapshot : EntityBase
{
    public Guid PieceId { get; private set; }
    public DateTimeOffset CreatedUtc { get; private set; }
    public ScheduleMode Mode { get; private set; }

    // Navigation property for the results.
    private readonly List<ScheduledNote> _scheduledNotes = new();
    public IReadOnlyList<ScheduledNote> ScheduledNotes => _scheduledNotes.AsReadOnly();

    // Diagnostics associated with this run
    public ScheduleDiagnostics Diagnostics { get; private set; }

    public ScheduleSnapshot(
        Guid id,
        Guid pieceId,
        ScheduleMode mode,
        IEnumerable<ScheduledNote> scheduledNotes,
        ScheduleDiagnostics diagnostics) : base(id)
    {
        PieceId = pieceId;
        CreatedUtc = DateTimeOffset.UtcNow;
        Mode = mode;
        _scheduledNotes.AddRange(scheduledNotes);
        Diagnostics = Guard.AgainstNull(diagnostics, nameof(diagnostics));
    }

    // EF Core constructor
    private ScheduleSnapshot() {}
}