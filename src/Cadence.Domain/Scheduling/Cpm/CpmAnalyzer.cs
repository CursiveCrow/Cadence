using Cadence.Domain.Scheduling.Graph;
using Cadence.Domain.ValueObjects;

namespace Cadence.Domain.Scheduling.Cpm;

// T132 & T133: Performs the Critical Path Method analysis.
public static class CpmAnalyzer
{
    public static CpmAnalysis Analyze(ProjectGraph graph, IReadOnlyList<Guid> topologicalOrder)
    {
        // T132: Forward Pass
        var earlyMetrics = CalculateForwardPass(graph, topologicalOrder);

        Beats projectDuration = Beats.Zero;
        if (earlyMetrics.Count > 0)
        {
             projectDuration = new Beats(earlyMetrics.Values.Max(m => m.EarlyFinish.Value));
        }

        // T133: Backward Pass
        var finalMetrics = CalculateBackwardPass(graph, topologicalOrder, earlyMetrics, projectDuration);

        return new CpmAnalysis(finalMetrics);
    }

    // T132: Forward Pass (ES/EF)
    private static Dictionary<Guid, (Beats EarlyStart, Beats EarlyFinish)> CalculateForwardPass(ProjectGraph graph, IReadOnlyList<Guid> topologicalOrder)
    {
        var metrics = new Dictionary<Guid, (Beats, Beats)>();

        foreach (var nodeId in topologicalOrder)
        {
            var node = graph.Nodes[nodeId];
            var predecessors = graph.PredecessorsList[nodeId];

            // ES[i] = max(EF[preds(i)])
            Beats earlyStart = Beats.Zero;
            if (predecessors.Count > 0)
            {
                earlyStart = new Beats(predecessors.Max(predId => metrics[predId].EarlyFinish.Value));
            }

            // EF[i] = ES[i] + d[i]
            Beats earlyFinish = earlyStart + node.DurationBeats;

            metrics[nodeId] = (earlyStart, earlyFinish);
        }
        return metrics;
    }

    // T133: Backward Pass (LS/LF)
    private static Dictionary<Guid, CpmMetrics> CalculateBackwardPass(
        ProjectGraph graph,
        IReadOnlyList<Guid> topologicalOrder,
        Dictionary<Guid, (Beats EarlyStart, Beats EarlyFinish)> earlyMetrics,
        Beats projectDuration)
    {
        var finalMetrics = new Dictionary<Guid, CpmMetrics>();
        var reverseOrder = topologicalOrder.Reverse();

        foreach (var nodeId in reverseOrder)
        {
            var node = graph.Nodes[nodeId];
            var successors = graph.AdjacencyList[nodeId];

            // LF[i] = min(LS[succs(i)])
            Beats lateFinish;
            if (successors.Count == 0)
            {
                // Terminal node: LF = Project Duration
                lateFinish = projectDuration;
            }
            else
            {
                lateFinish = new Beats(successors.Min(succId => finalMetrics[succId].LateStart.Value));
            }

            // LS[i] = LF[i] - d[i]
            Beats lateStart = lateFinish - node.DurationBeats;

            var (earlyStart, earlyFinish) = earlyMetrics[nodeId];

            finalMetrics[nodeId] = new CpmMetrics(
                nodeId,
                node.DurationBeats,
                earlyStart,
                earlyFinish,
                lateStart,
                lateFinish
            );
        }
        return finalMetrics;
    }
}