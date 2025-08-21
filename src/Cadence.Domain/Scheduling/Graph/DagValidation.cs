namespace Cadence.Domain.Scheduling.Graph;

// T130: Validates if the ProjectGraph is a DAG and detects cycles using DFS.
public static class DagValidator
{
    public record ValidationResult(bool IsValid, IReadOnlyList<Guid>? CyclePath)
    {
        public static ValidationResult Success() => new(true, null);
        public static ValidationResult Failure(IReadOnlyList<Guid> cyclePath) => new(false, cyclePath);
    }

    public static ValidationResult Validate(ProjectGraph graph)
    {
        var visited = new HashSet<Guid>();
        var recursionStack = new HashSet<Guid>();

        foreach (var nodeId in graph.Nodes.Keys)
        {
            if (!visited.Contains(nodeId))
            {
                var cycle = FindCycleDfs(graph, nodeId, visited, recursionStack, new List<Guid>());
                if (cycle != null)
                {
                    return ValidationResult.Failure(cycle);
                }
            }
        }
        return ValidationResult.Success();
    }

    private static List<Guid>? FindCycleDfs(ProjectGraph graph, Guid currentNodeId, HashSet<Guid> visited, HashSet<Guid> recursionStack, List<Guid> currentPath)
    {
        visited.Add(currentNodeId);
        recursionStack.Add(currentNodeId);
        currentPath.Add(currentNodeId);

        if (graph.AdjacencyList.TryGetValue(currentNodeId, out var successors))
        {
            foreach (var successorId in successors)
            {
                if (!visited.Contains(successorId))
                {
                    var cycle = FindCycleDfs(graph, successorId, visited, recursionStack, currentPath);
                    if (cycle != null) return cycle;
                }
                else if (recursionStack.Contains(successorId))
                {
                    // Back edge detected (cycle). Extract the explicit path.
                    var cycleStartIndex = currentPath.IndexOf(successorId);
                    var cycle = currentPath.Skip(cycleStartIndex).ToList();
                    cycle.Add(successorId); // Close the loop A->B->C->A
                    return cycle;
                }
            }
        }

        // Backtrack
        recursionStack.Remove(currentNodeId);
        currentPath.RemoveAt(currentPath.Count - 1);
        return null;
    }
}