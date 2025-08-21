using Cadence.Domain.Entities;
using Cadence.Domain.ValueObjects;
using System.Collections.Generic;
using System.Linq;

namespace Cadence.Domain.Scheduling;

/// <summary>
/// Iterates through a piece's measures, tracking consumed capacity and
/// converting beats to absolute UTC times. Handles notes that span multiple
/// measures (ties) by advancing to subsequent measures when the current
/// measure's remaining capacity is exhausted.
/// </summary>
public class MeasureCursor
{
    private readonly Piece _piece;
    private readonly IReadOnlyList<Measure> _measures;

    private int _currentIndex;
    private Beats _usedBeatsInMeasure;

    public MeasureCursor(Piece piece)
    {
        _piece = piece;
        _measures = piece.Measures.OrderBy(m => m.IndexInPiece).ToList();
        _currentIndex = 0;
        _usedBeatsInMeasure = Beats.Zero;
    }

    /// <summary>Current measure index within the piece.</summary>
    public int CurrentMeasureIndex => _currentIndex;

    /// <summary>Current absolute UTC time represented by the cursor.</summary>
    public DateTimeOffset CurrentUtc =>
        _measures[_currentIndex].StartUtc +
        _usedBeatsInMeasure.ToMinutes(_piece.Tempo).ToTimeSpan();

    /// <summary>
    /// Reserves the specified duration starting at the cursor's current time
    /// and advances the cursor. The returned tuple contains the start and end
    /// times of the reservation.
    /// </summary>
    public (DateTimeOffset StartUtc, DateTimeOffset EndUtc) Reserve(Beats duration)
    {
        if (duration.Value <= 0)
            throw new ArgumentOutOfRangeException(nameof(duration));

        var start = CurrentUtc;
        var remaining = _measures[_currentIndex].CapacityBeats - _usedBeatsInMeasure;
        var remainingBeats = duration;

        while (remainingBeats > remaining)
        {
            // Consume remainder of current measure and move to next
            remainingBeats -= remaining;
            MoveToNextMeasure();
            remaining = _measures[_currentIndex].CapacityBeats;
        }

        _usedBeatsInMeasure += remainingBeats;
        var end = _measures[_currentIndex].StartUtc +
            _usedBeatsInMeasure.ToMinutes(_piece.Tempo).ToTimeSpan();

        return (start, end);
    }

    private void MoveToNextMeasure()
    {
        _currentIndex++;
        if (_currentIndex >= _measures.Count)
            throw new InvalidOperationException("No more measures available for scheduling.");

        _usedBeatsInMeasure = Beats.Zero;
    }
}
