using Cadence.Domain.Entities;

namespace Cadence.Domain.Scheduling.Graph;

// T131: Produces a deterministic topological ordering using Kahn's algorithm.
public static class TopologicalSort
{
    public static IReadOnlyList<Guid> Sort(ProjectGraph graph)
    {
        // Calculate in-degrees
        var inDegree = graph.Nodes.Keys.ToDictionary(id => id, id => 0);
        foreach (var entry in graph.AdjacencyList)
        {
            foreach (var successorId in entry.Value)
            {
                inDegree[successorId]++;
            }
        }

        // Initialize the queue (SortedSet for determinism)
        var comparer = Comparer<Guid>.Create((a, b) => CompareNodes(graph.Nodes[a], graph.Nodes[b]));
        var queue = new SortedSet<Guid>(comparer);

        foreach (var entry in inDegree)
        {
            if (entry.Value == 0)
            {
                queue.Add(entry.Key);
            }
        }

        var sortedList = new List<Guid>();
        while (queue.Count > 0)
        {
            var currentNodeId = queue.Min;
            queue.Remove(currentNodeId);
            sortedList.Add(currentNodeId);

            if (graph.AdjacencyList.TryGetValue(currentNodeId, out var successors))
            {
                // Process successors
                foreach (var successorId in successors)
                {
                    inDegree[successorId]--;
                    if (inDegree[successorId] == 0)
                    {
                        queue.Add(successorId);
                    }
                }
            }
        }

        if (sortedList.Count != graph.Nodes.Count)
        {
            // Should have been caught by DagValidator
            throw new InvalidOperationException("The graph contains a cycle.");
        }

        return sortedList;
    }

    // T131: Deterministic comparison logic.
    private static int CompareNodes(Note a, Note b)
    {
        // Primary: Title
        int titleComparison = string.Compare(a.Title, b.Title, StringComparison.Ordinal);
        if (titleComparison != 0) return titleComparison;

        // Secondary: GUID
        return a.Id.CompareTo(b.Id);
    }
}