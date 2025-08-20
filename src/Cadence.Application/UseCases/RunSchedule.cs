using Cadence.Domain.Entities;
using Cadence.Domain.Scheduling;

namespace Cadence.Application.UseCases;

public static class RunSchedule
{
    public static Task<ScheduleSnapshot> ExecuteAsync(Piece piece, IScheduler scheduler, ScheduleMode mode, CancellationToken ct = default)
        => scheduler.RunAsync(piece, mode, ct);
}
