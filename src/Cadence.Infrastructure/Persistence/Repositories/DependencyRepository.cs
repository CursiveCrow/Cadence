using Cadence.Application.Contracts.Persistence;
using Cadence.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Cadence.Infrastructure.Persistence.Repositories;

public class DependencyRepository : RepositoryBase<Dependency>, IDependencyRepository
{
    public DependencyRepository(CadenceContext context) : base(context) { }

    public async Task<IReadOnlyList<Dependency>> ListByPieceAsync(Guid pieceId)
    {
        return await _context.Dependencies
            .Where(d => d.PieceId == pieceId)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<Dependency>> ListByNoteAsync(Guid noteId)
    {
        return await _context.Dependencies
            .Where(d => d.PredecessorNoteId == noteId || d.SuccessorNoteId == noteId)
            .ToListAsync();
    }
}

