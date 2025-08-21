using Cadence.Domain.Entities;
using Cadence.Domain.Scheduling.Cpm;
using Cadence.Domain.Scheduling.Graph;
using Cadence.Domain.ValueObjects;
using Cadence.Domain.Enums;

namespace Cadence.Domain.Scheduling.Ssgs;

// T135: Core scaffold of the Serial Schedule Generation Scheme (SSGS).
public class SerialScheduler
{
    private readonly ProjectGraph _graph;
    private readonly CpmAnalysis _cpmAnalysis;
    private readonly IPriorityRule _priorityRule;
    private readonly Piece _piece;

    public SerialScheduler(Piece piece, ProjectGraph graph, CpmAnalysis cpmAnalysis, IPriorityRule priorityRule)
    {
        _piece = piece;
        _graph = graph;
        _cpmAnalysis = cpmAnalysis;
        _priorityRule = priorityRule;
    }

    public ScheduleResult Generate(ScheduleMode mode)
    {
        if (mode == ScheduleMode.Backward)
        {
            // ALAP (T143)
            throw new NotImplementedException("ALAP scheduling is not yet implemented.");
        }

        return GenerateAsap();
    }

    private ScheduleResult GenerateAsap()
    {
        var scheduledNotes = new Dictionary<Guid, ScheduledNote>();
        var remainingDependencies = _graph.PredecessorsList.ToDictionary(kvp => kvp.Key, kvp => new HashSet<Guid>(kvp.Value));

        // Initialize the Ready Set using the priority rule comparator
        var priorityComparer = Comparer<Guid>.Create((a, b) =>
            _priorityRule.Compare(_graph.Nodes[a], _graph.Nodes[b], _cpmAnalysis));
        var readySet = new SortedSet<Guid>(priorityComparer);

        // Add initial nodes (no predecessors)
        foreach (var nodeId in _graph.Nodes.Keys)
        {
            if (!_graph.PredecessorsList.TryGetValue(nodeId, out var preds) || preds.Count == 0)
            {
                 readySet.Add(nodeId);
            }
        }

        // Main loop
        while (readySet.Count > 0)
        {
            // Select highest priority task
            var nodeId = readySet.Min;
            readySet.Remove(nodeId);
            var note = _graph.Nodes[nodeId];

            // T135: Placement (Scaffold version ignores capacity)
            // T136-T139 will enhance this placement logic.
            var placement = PlaceNoteScaffold(note, scheduledNotes);

            if (!placement.IsFeasible)
            {
                return ScheduleResult.Failure(placement.Diagnostics!);
            }

            scheduledNotes[nodeId] = placement.ScheduledNote!;

            // Update the Ready Set
            UpdateReadySet(nodeId, remainingDependencies, readySet);
        }

        return ScheduleResult.Success(scheduledNotes.Values.ToList());
    }

    // T135 Scaffold Placement Logic (No Capacity Constraints)
    private PlacementResult PlaceNoteScaffold(Note note, Dictionary<Guid, ScheduledNote> scheduledNotes)
    {
        // 1. Determine earliest start based on predecessors
        DateTimeOffset earliestStart = _piece.StartUtc;

        if (_graph.PredecessorsList.TryGetValue(note.Id, out var predecessors) && predecessors.Count > 0)
        {
            var maxPredecessorFinish = predecessors.Max(predId => scheduledNotes[predId].EndUtc);
            if (maxPredecessorFinish > earliestStart)
            {
                earliestStart = maxPredecessorFinish;
            }
        }

        // 2. Respect EarliestStartUtc constraint (T138)
        if (note.EarliestStartUtc.HasValue && note.EarliestStartUtc.Value > earliestStart)
        {
            earliestStart = note.EarliestStartUtc.Value;
        }

        // 3. Calculate finish time
        Minutes durationMinutes = note.DurationBeats.ToMinutes(_piece.Tempo);
        DateTimeOffset finishTime = earliestStart.Add(durationMinutes.ToTimeSpan());

        // 4. Validate DueByUtc constraint (T138)
        if (note.DueByUtc.HasValue && finishTime > note.DueByUtc.Value)
        {
            return PlacementResult.Failure(ScheduleDiagnostics.Infeasible($"Task '{note.Title}' violates DueBy constraint."));
        }

        var scheduledNote = new ScheduledNote(note.Id, earliestStart, finishTime);
        return PlacementResult.Success(scheduledNote);
    }

    private void UpdateReadySet(Guid scheduledNodeId, Dictionary<Guid, HashSet<Guid>> remainingDependencies, SortedSet<Guid> readySet)
    {
        if (!_graph.AdjacencyList.TryGetValue(scheduledNodeId, out var successors)) return;

        foreach (var successorId in successors)
        {
            if (remainingDependencies.TryGetValue(successorId, out var deps))
            {
                deps.Remove(scheduledNodeId);
                if (deps.Count == 0)
                {
                    readySet.Add(successorId);
                }
            }
        }
    }
}

// Helper records for SSGS results
public record PlacementResult(bool IsFeasible, ScheduledNote? ScheduledNote, ScheduleDiagnostics? Diagnostics)
{
    public static PlacementResult Success(ScheduledNote note) => new(true, note, null);
    public static PlacementResult Failure(ScheduleDiagnostics diagnostics) => new(false, null, diagnostics);
}

public record ScheduleResult(bool IsSuccess, IReadOnlyList<ScheduledNote>? ScheduledNotes, ScheduleDiagnostics? Diagnostics)
{
    public static ScheduleResult Success(IReadOnlyList<ScheduledNote> notes) => new(true, notes, null);
    public static ScheduleResult Failure(ScheduleDiagnostics diagnostics) => new(false, null, diagnostics);
}
