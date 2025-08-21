using Cadence.Domain.Entities;

namespace Cadence.Domain.Scheduling.Graph;

// Helper class to represent the project graph (DAG) for algorithms.
public class ProjectGraph
{
    public IReadOnlyDictionary<Guid, Note> Nodes { get; }
    public IReadOnlyDictionary<Guid, List<Guid>> AdjacencyList { get; } // Successors
    public IReadOnlyDictionary<Guid, List<Guid>> PredecessorsList { get; } // Predecessors

    public ProjectGraph(Piece piece)
    {
        var nodes = piece.Notes.ToDictionary(n => n.Id, n => n);
        var adj = new Dictionary<Guid, List<Guid>>();
        var preds = new Dictionary<Guid, List<Guid>>();

        foreach (var note in piece.Notes)
        {
            adj[note.Id] = new List<Guid>();
            preds[note.Id] = new List<Guid>();
        }

        foreach (var dep in piece.Dependencies)
        {
            if (adj.ContainsKey(dep.PredecessorNoteId) && preds.ContainsKey(dep.SuccessorNoteId))
            {
                adj[dep.PredecessorNoteId].Add(dep.SuccessorNoteId);
                preds[dep.SuccessorNoteId].Add(dep.PredecessorNoteId);
            }
        }

        Nodes = nodes;
        AdjacencyList = adj;
        PredecessorsList = preds;
    }
}