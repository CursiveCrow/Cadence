using Cadence.Domain.Scheduling.Cpm;
using Cadence.Domain.Entities;

namespace Cadence.Domain.Scheduling.Ssgs;

public interface IPriorityRule
{
    // Returns < 0 if a has higher priority than b.
    int Compare(Note a, Note b, CpmAnalysis cpmAnalysis);
}