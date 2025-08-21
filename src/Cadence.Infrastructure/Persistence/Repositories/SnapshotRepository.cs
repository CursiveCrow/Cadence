using Cadence.Application.Contracts.Persistence;
using Cadence.Domain.Scheduling;
using Microsoft.EntityFrameworkCore;

namespace Cadence.Infrastructure.Persistence.Repositories;

public class SnapshotRepository : RepositoryBase<ScheduleSnapshot>, ISnapshotRepository
{
    public SnapshotRepository(CadenceContext context) : base(context) { }

    public async Task<ScheduleSnapshot?> GetSnapshotWithDetailsAsync(Guid id)
    {
        // Eagerly load the ScheduledNotes (handled automatically by OwnsMany configuration)
        return await _context.ScheduleSnapshots
            .FirstOrDefaultAsync(s => s.Id == id);
    }

    public async Task<IReadOnlyList<ScheduleSnapshot>> ListByPieceAsync(Guid pieceId)
    {
        return await _context.ScheduleSnapshots
            .Where(s => s.PieceId == pieceId)
            .OrderByDescending(s => s.CreatedUtc)
            .ToListAsync();
    }
}