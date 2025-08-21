using Cadence.Application.Contracts.Persistence;
using Cadence.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Cadence.Infrastructure.Persistence.Repositories;

public class PieceRepository : RepositoryBase<Piece>, IPieceRepository
{
    public PieceRepository(CadenceContext context) : base(context) { }

    public async Task<Piece?> GetPieceWithDetailsAsync(Guid id)
    {
        // Eager load the entire aggregate graph
        return await _context.Pieces
            .Include(p => p.Measures)
            .Include(p => p.Chords)
            .Include(p => p.Notes)
            .Include(p => p.Dependencies)
            .FirstOrDefaultAsync(p => p.Id == id);
    }
}