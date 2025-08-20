using Cadence.Domain.Common;
using Cadence.Domain.Entities;

namespace Cadence.Application.UseCases;

public static class CreatePiece
{
    public static Piece New(string title, DateTimeOffset startUtc, DateTimeOffset deadlineUtc, int beatsPerMeasure = 8, double minutesPerBeat = 60)
    {
        var p = new Piece
        {
            Title = title,
            StartUtc = startUtc,
            DeadlineUtc = deadlineUtc,
            BeatsPerMeasure = beatsPerMeasure,
            MinutesPerBeat = minutesPerBeat
        };
        // Generate daily measures as a starting point (9-17 work window)
        var d = startUtc.Date;
        int idx = 0;
        while (d <= deadlineUtc.Date)
        {
            p.Measures.Add(new Measure {
                Index = idx++,
                StartUtc = new DateTimeOffset(d, TimeSpan.Zero).AddHours(9),
                EndUtc   = new DateTimeOffset(d, TimeSpan.Zero).AddHours(17),
                CapacityBeats = beatsPerMeasure,
                IsWorkday = true
            });
            d = d.AddDays(1);
        }
        return p;
    }
}
