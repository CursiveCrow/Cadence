namespace Cadence.Domain.Scheduling;

/// <summary>
/// Contains information about the schedule feasibility and any issues encountered. Immutable.
/// </summary>
public record ScheduleDiagnostics(
    bool IsFeasible,
    IReadOnlyList<string> Messages,
    IReadOnlyList<Guid>? CriticalPath = null,
    double? CapacityDeficitBeats = null
)
{
    public static ScheduleDiagnostics Feasible() => new(true, Array.Empty<string>());
    public static ScheduleDiagnostics Infeasible(string message, IReadOnlyList<Guid>? criticalPath = null, double? deficit = null) =>
        new(false, new[] { message }, criticalPath, deficit);
}