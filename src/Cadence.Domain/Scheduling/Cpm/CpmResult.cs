using Cadence.Domain.ValueObjects;

namespace Cadence.Domain.Scheduling.Cpm;

// Metrics for a single node.
public record CpmMetrics(
    Guid NoteId,
    Beats Duration,
    Beats EarlyStart,
    Beats EarlyFinish,
    Beats LateStart,
    Beats LateFinish
)
{
    public Beats Slack => LateStart - EarlyStart;
    // Using a small tolerance for double comparison
    public bool IsCritical => Math.Abs(Slack.Value) < 0.0001;
}

// Complete results of a CPM analysis.
public class CpmAnalysis
{
    private readonly Dictionary<Guid, CpmMetrics> _metrics;

    public CpmAnalysis(Dictionary<Guid, CpmMetrics> metrics)
    {
        _metrics = metrics;
    }

    public CpmMetrics GetMetrics(Guid nodeId) => _metrics[nodeId];

    public IReadOnlyDictionary<Guid, CpmMetrics> AllMetrics => _metrics;

    public Beats ProjectDuration => _metrics.Count > 0 ? new Beats(_metrics.Values.Max(m => m.EarlyFinish.Value)) : Beats.Zero;

    public IReadOnlyList<Guid> GetCriticalPathNodes()
    {
        // Returns all nodes with zero slack.
        return _metrics.Values
            .Where(m => m.IsCritical)
            .OrderBy(m => m.EarlyStart.Value)
            .Select(m => m.NoteId)
            .ToList();
    }
}