using Cadence.Domain.Common;

namespace Cadence.Domain.Entities;

// T054: Represents a Task group / deliverable slice.
public class Chord : EntityBase
{
    public Guid PieceId { get; private set; }

    public string Name { get; private set; }
    public int Priority { get; private set; }
    public string? Color { get; private set; } // Hex color code

    public DateTimeOffset? SoftDueStartUtc { get; private set; }
    public DateTimeOffset? SoftDueEndUtc { get; private set; }

    public Chord(Guid id, Guid pieceId, string name, int priority, string? color = null, DateTimeOffset? softDueStartUtc = null, DateTimeOffset? softDueEndUtc = null)
        : base(id)
    {
        Guard.AgainstNullOrEmpty(name, nameof(name));

        if (softDueStartUtc.HasValue && softDueEndUtc.HasValue)
        {
            Guard.AgainstInvalidDateRange(softDueStartUtc.Value, softDueEndUtc.Value, nameof(softDueStartUtc), nameof(softDueEndUtc));
        }

        PieceId = pieceId;
        Name = name;
        Priority = priority;
        Color = color;
        SoftDueStartUtc = softDueStartUtc;
        SoftDueEndUtc = softDueEndUtc;
    }

    // EF Core constructor
    private Chord() { }
}