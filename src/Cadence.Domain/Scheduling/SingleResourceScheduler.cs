using Cadence.Domain.Entities;

namespace Cadence.Domain.Scheduling;

public sealed class SingleResourceScheduler : IScheduler
{
    public Task<ScheduleSnapshot> RunAsync(Piece piece, ScheduleMode mode, CancellationToken ct = default)
    {
        // TODO: Replace with CPM + capacity-aware SSGS implementation.
        // For now, return an empty snapshot with a diagnostic message.
        var snap = new ScheduleSnapshot
        {
            PieceId = piece.Id,
            Mode = mode,
            Notes = Array.Empty<ScheduledNote>(),
            Diagnostic = "Scheduler not yet implemented. Replace stub with CPM+SSGS."
        };
        return Task.FromResult(snap);
    }
}
