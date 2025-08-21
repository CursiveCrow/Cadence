using Cadence.Domain.Entities;

namespace Cadence.Application.Contracts.Persistence;

public interface IDependencyRepository : IRepository<Dependency>
{
    Task<IReadOnlyList<Dependency>> ListByPieceAsync(Guid pieceId);
    Task<IReadOnlyList<Dependency>> ListByNoteAsync(Guid noteId);
}

