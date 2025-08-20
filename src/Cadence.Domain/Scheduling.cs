namespace Cadence.Domain;

public enum ScheduleMode { Forward, Backward }

public sealed record ScheduledNote(Guid NoteId, DateTimeOffset StartUtc, DateTimeOffset EndUtc);

public sealed class ScheduleSnapshot
{
    public required Guid Id { get; init; }
    public required Guid PieceId { get; init; }
    public DateTimeOffset CreatedUtc { get; init; } = DateTimeOffset.UtcNow;
    public ScheduleMode Mode { get; init; }
    public IReadOnlyList<ScheduledNote> Notes { get; init; } = Array.Empty<ScheduledNote>();
    public string? Diagnostic { get; init; }
}

public interface IScheduler
{
    Task<ScheduleSnapshot> RunAsync(Piece piece, ScheduleMode mode, CancellationToken ct = default);
}

/// <summary>
/// Minimal, deterministic scheduler stub:
/// - Validates DAG
/// - Places notes sequentially ASAP within measures without overlap
/// - DOES NOT compute CPM/slack (stub to be replaced)
/// </summary>
public sealed class SimpleAsapScheduler : IScheduler
{
    public Task<ScheduleSnapshot> RunAsync(Piece piece, ScheduleMode mode, CancellationToken ct = default)
    {
        // Validate DAG (detect cycle via Kahn)
        var idToNote = piece.Notes.ToDictionary(n => n.Id);
        var preds = piece.Notes.ToDictionary(n => n.Id, n => new HashSet<Guid>());
        var succs = piece.Notes.ToDictionary(n => n.Id, n => new HashSet<Guid>());
        foreach (var d in piece.Dependencies)
        {
            preds[d.SuccessorNoteId].Add(d.PredecessorNoteId);
            succs[d.PredecessorNoteId].Add(d.SuccessorNoteId);
        }

        var ready = new Queue<Guid>(preds.Where(kv => kv.Value.Count == 0).Select(kv => kv.Key));
        var order = new List<Guid>();
        while (ready.TryDequeue(out var id))
        {
            order.Add(id);
            foreach (var s in succs[id])
            {
                preds[s].Remove(id);
                if (preds[s].Count == 0) ready.Enqueue(s);
            }
        }
        if (order.Count != piece.Notes.Count)
        {
            // cycle exists: find a simple cycle path for diagnostics
            var remaining = preds.Where(kv => kv.Value.Count > 0).Select(kv => kv.Key).ToHashSet();
            var start = remaining.First();
            var cycle = new List<Guid>() { start };
            var current = start;
            var visited = new HashSet<Guid> { start };
            while (true)
            {
                var next = preds[current].First();
                cycle.Add(next);
                if (!visited.Add(next)) break;
                current = next;
            }
            var diag = $"Cycle detected: {string.Join(" -> ", cycle.Select(x => idToNote[x].Title))}";
            return Task.FromResult(new ScheduleSnapshot { Id = Guid.NewGuid(), PieceId = piece.Id, Mode = mode, Diagnostic = diag });
        }

        // Place ASAP sequentially
        var scheduled = new List<ScheduledNote>();
        var measureIndex = 0;
        var measureRemaining = piece.Measures[0].CapacityBeats;
        var cursor = piece.Measures[0].StartUtc;

        foreach (var nid in order)
        {
            var note = idToNote[nid];
            var beats = note.DurationBeats;
            var minutes = beats * piece.MinutesPerBeat;

            while (beats > 0)
            {
                if (measureIndex >= piece.Measures.Count) break;
                var m = piece.Measures[measureIndex];
                if (measureRemaining <= 0)
                {
                    // advance to next measure
                    measureIndex++;
                    if (measureIndex >= piece.Measures.Count) break;
                    measureRemaining = piece.Measures[measureIndex].CapacityBeats;
                    cursor = piece.Measures[measureIndex].StartUtc;
                    continue;
                }

                var take = Math.Min(beats, measureRemaining);
                var start = cursor;
                var end = start.AddMinutes(take * piece.MinutesPerBeat);
                scheduled.Add(new ScheduledNote(note.Id, start, end));
                beats -= take;
                measureRemaining -= take;
                cursor = end;
                if (beats > 0 && measureRemaining <= 0)
                {
                    // next measure
                    measureIndex++;
                    if (measureIndex < piece.Measures.Count)
                    {
                        measureRemaining = piece.Measures[measureIndex].CapacityBeats;
                        cursor = piece.Measures[measureIndex].StartUtc;
                    }
                }
            }
        }

        return Task.FromResult(new ScheduleSnapshot
        {
            Id = Guid.NewGuid(),
            PieceId = piece.Id,
            Mode = mode,
            Notes = scheduled
        });
    }
}
