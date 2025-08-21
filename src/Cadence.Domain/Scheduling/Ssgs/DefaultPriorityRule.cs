using Cadence.Domain.Entities;
using Cadence.Domain.Scheduling.Cpm;

namespace Cadence.Domain.Scheduling.Ssgs;

// T141: Rule: min slack → earliest due → longest processing time (+ stable tiebreak).
public class DefaultPriorityRule : IPriorityRule
{
    public int Compare(Note a, Note b, CpmAnalysis cpmAnalysis)
    {
        var metricsA = cpmAnalysis.GetMetrics(a.Id);
        var metricsB = cpmAnalysis.GetMetrics(b.Id);

        // 1. Minimum Slack (smaller slack = higher priority)
        int slackComparison = metricsA.Slack.Value.CompareTo(metricsB.Slack.Value);
        if (slackComparison != 0) return slackComparison;

        // 2. Earliest Due Date (earlier due date = higher priority)
        if (a.DueByUtc.HasValue && b.DueByUtc.HasValue)
        {
            int dueComparison = a.DueByUtc.Value.CompareTo(b.DueByUtc.Value);
            if (dueComparison != 0) return dueComparison;
        }
        else if (a.DueByUtc.HasValue) return -1;
        else if (b.DueByUtc.HasValue) return 1;

        // 3. Longest Processing Time (longer duration = higher priority)
        // Note the reversed comparison (B vs A)
        int durationComparison = metricsB.Duration.Value.CompareTo(metricsA.Duration.Value);
        if (durationComparison != 0) return durationComparison;

        // 4. Stable Tiebreakers
        // 4a. Title
        int titleComparison = string.Compare(a.Title, b.Title, StringComparison.Ordinal);
        if (titleComparison != 0) return titleComparison;

        // 4b. GUID
        return a.Id.CompareTo(b.Id);
    }
}