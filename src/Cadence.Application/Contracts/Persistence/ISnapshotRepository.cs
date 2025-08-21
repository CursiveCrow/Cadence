using Cadence.Domain.Scheduling;

namespace Cadence.Application.Contracts.Persistence;

public interface ISnapshotRepository : IRepository<ScheduleSnapshot>
{
    Task<ScheduleSnapshot?> GetSnapshotWithDetailsAsync(Guid id);
    Task<IReadOnlyList<ScheduleSnapshot>> ListByPieceAsync(Guid pieceId);
}