using Cadence.Domain.Common;

namespace Cadence.Domain.Entities;

// T056: Represents a dependency between two Notes (Predecessor -> Successor).
public class Dependency : EntityBase
{
    public Guid PieceId { get; private set; }

    public Guid PredecessorNoteId { get; private set; }
    public Guid SuccessorNoteId { get; private set; }

    public Dependency(Guid id, Guid pieceId, Guid predecessorNoteId, Guid successorNoteId)
        : base(id)
    {
        if (predecessorNoteId == successorNoteId)
        {
            throw new ArgumentException("Predecessor and Successor cannot be the same Note.");
        }

        PieceId = pieceId;
        PredecessorNoteId = predecessorNoteId;
        SuccessorNoteId = successorNoteId;
    }

    // EF Core constructor
    private Dependency() { }
}