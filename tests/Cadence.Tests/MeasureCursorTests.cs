using Cadence.Domain.Entities;
using Cadence.Domain.Scheduling;
using Cadence.Domain.ValueObjects;
using Cadence.Domain.Enums;
using FluentAssertions;
using Xunit;
using System.Linq;

namespace Cadence.Tests;

public class MeasureCursorTests
{
    private static Piece BuildPiece()
    {
        var start = new DateTimeOffset(2025, 9, 1, 9, 0, 0, TimeSpan.Zero);
        var piece = new Piece(Guid.NewGuid(), "Test", start, start.AddDays(3), 8, new Tempo(60));

        var m1 = new Measure(Guid.NewGuid(), piece.Id, 0, start, start.AddHours(8), 8, AvailabilityType.Workday);
        var m2Start = start.AddDays(1);
        var m2 = new Measure(Guid.NewGuid(), piece.Id, 1, m2Start, m2Start.AddHours(8), 8, AvailabilityType.Workday);
        var m3Start = start.AddDays(2);
        var m3 = new Measure(Guid.NewGuid(), piece.Id, 2, m3Start, m3Start.AddHours(8), 8, AvailabilityType.Workday);

        piece.AddMeasures(new[] { m1, m2, m3 });
        return piece;
    }

    [Fact]
    public void Reserve_ShouldSpanTwoMeasures()
    {
        var piece = BuildPiece();
        var cursor = new MeasureCursor(piece);

        var measures = piece.Measures.OrderBy(m => m.IndexInPiece).ToList();

        var (startUtc, endUtc) = cursor.Reserve(new Beats(12)); // 12 beats = 12 hours

        startUtc.Should().Be(measures[0].StartUtc);
        endUtc.Should().Be(measures[1].StartUtc.AddHours(4));
        cursor.CurrentMeasureIndex.Should().Be(1);
        cursor.CurrentUtc.Should().Be(measures[1].StartUtc.AddHours(4));
    }

    [Fact]
    public void Reserve_ShouldSpanThreeMeasures()
    {
        var piece = BuildPiece();
        var cursor = new MeasureCursor(piece);

        var measures = piece.Measures.OrderBy(m => m.IndexInPiece).ToList();

        cursor.Reserve(new Beats(12)); // advance first
        var (startUtc, endUtc) = cursor.Reserve(new Beats(10));

        startUtc.Should().Be(measures[1].StartUtc.AddHours(4));
        endUtc.Should().Be(measures[2].StartUtc.AddHours(6));
        cursor.CurrentMeasureIndex.Should().Be(2);
        cursor.CurrentUtc.Should().Be(measures[2].StartUtc.AddHours(6));
    }
}
