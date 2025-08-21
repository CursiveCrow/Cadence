using Cadence.Application.Contracts.Persistence;
using Cadence.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Cadence.Infrastructure.Persistence.Repositories;

public class NoteRepository : RepositoryBase<Note>, INoteRepository
{
    public NoteRepository(CadenceContext context) : base(context) { }

    public async Task<IReadOnlyList<Note>> ListByPieceAsync(Guid pieceId)
    {
        return await _context.Notes
            .Where(n => n.PieceId == pieceId)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<Note>> ListByChordAsync(Guid chordId)
    {
        return await _context.Notes
            .Where(n => n.ChordId == chordId)
            .ToListAsync();
    }
}

