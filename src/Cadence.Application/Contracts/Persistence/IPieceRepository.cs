using Cadence.Domain.Entities;

namespace Cadence.Application.Contracts.Persistence;

public interface IPieceRepository : IRepository<Piece>
{
    // Specific method to load the entire aggregate (Piece + children) required for scheduling
    Task<Piece?> GetPieceWithDetailsAsync(Guid id);
    Task<IReadOnlyList<Piece>> ListAllAsync();
}