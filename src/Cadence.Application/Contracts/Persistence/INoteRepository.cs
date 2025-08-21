using Cadence.Domain.Entities;

namespace Cadence.Application.Contracts.Persistence;

public interface INoteRepository : IRepository<Note>
{
    Task<IReadOnlyList<Note>> ListByPieceAsync(Guid pieceId);
    Task<IReadOnlyList<Note>> ListByChordAsync(Guid chordId);
}

