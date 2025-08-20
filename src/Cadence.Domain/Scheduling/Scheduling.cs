using Cadence.Domain.Common;

namespace Cadence.Domain.Scheduling;

public enum ScheduleMode { Forward, Backward }

public sealed record ScheduledNote(Id NoteId, DateTimeOffset StartUtc, DateTimeOffset EndUtc);

public sealed class ScheduleSnapshot
{
    public Id Id { get; init; } = Id.New();
    public Id PieceId { get; init; }
    public DateTimeOffset CreatedUtc { get; init; } = DateTimeOffset.UtcNow;
    public ScheduleMode Mode { get; init; }
    public IReadOnlyList<ScheduledNote> Notes { get; init; } = Array.Empty<ScheduledNote>();
    public string? Diagnostic { get; init; }
}

public interface IScheduler
{
    Task<ScheduleSnapshot> RunAsync(Entities.Piece piece, ScheduleMode mode, CancellationToken ct = default);
}
