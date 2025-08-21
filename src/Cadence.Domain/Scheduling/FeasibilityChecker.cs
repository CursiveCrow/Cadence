using Cadence.Domain.Entities;
using Cadence.Domain.Scheduling.Cpm;
using Cadence.Domain.ValueObjects;
using Cadence.Domain.Enums;

namespace Cadence.Domain.Scheduling;

// T134: Checks if the project is theoretically feasible based on capacity vs critical path.
public static class FeasibilityChecker
{
    public static ScheduleDiagnostics Check(Piece piece, CpmAnalysis cpmAnalysis)
    {
        // Calculate total available capacity
        double totalCapacityValue = piece.Measures
            .Where(m => m.Availability == AvailabilityType.Workday)
            .Sum(m => m.CapacityBeats.Value);
        // Note: Buffers (T139) are not yet considered here.

        Beats totalCapacity = new Beats(totalCapacityValue);
        Beats criticalPathDuration = cpmAnalysis.ProjectDuration;

        if (criticalPathDuration.Value > totalCapacity.Value)
        {
            // Infeasible
            var deficit = criticalPathDuration - totalCapacity;
            var criticalPath = cpmAnalysis.GetCriticalPathNodes();
            return ScheduleDiagnostics.Infeasible(
                $"Critical path duration ({criticalPathDuration} beats) exceeds total capacity ({totalCapacity} beats). Deficit: {deficit.Value:0.##} beats.",
                criticalPath,
                deficit.Value
            );
        }

        return ScheduleDiagnostics.Feasible();
    }
}