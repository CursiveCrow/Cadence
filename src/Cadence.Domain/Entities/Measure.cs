using Cadence.Domain.Common;
using Cadence.Domain.ValueObjects;
using Cadence.Domain.Enums;

namespace Cadence.Domain.Entities;

// T053: Represents a Timebox (e.g., a day).
public class Measure : EntityBase
{
    public Guid PieceId { get; private set; }

    public int IndexInPiece { get; private set; }
    public DateTimeOffset StartUtc { get; private set; }
    public DateTimeOffset EndUtc { get; private set; }

    public Beats CapacityBeats { get; private set; }
    public AvailabilityType Availability { get; private set; }
    public string? Label { get; private set; }

    public Measure(Guid id, Guid pieceId, int indexInPiece, DateTimeOffset startUtc, DateTimeOffset endUtc, Beats capacityBeats, AvailabilityType availability = AvailabilityType.Workday, string? label = null)
        : base(id)
    {
        Guard.AgainstNegative(indexInPiece, nameof(indexInPiece));
        Guard.AgainstInvalidDateRange(startUtc, endUtc, nameof(startUtc), nameof(endUtc));

        PieceId = pieceId;
        IndexInPiece = indexInPiece;
        StartUtc = startUtc;
        EndUtc = endUtc;
        CapacityBeats = capacityBeats;
        Availability = availability;
        Label = label;
    }

    // EF Core constructor
    private Measure() { }
}