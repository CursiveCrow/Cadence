
using Cadence.Domain;
using Xunit;
using FluentAssertions;

namespace Cadence.Tests;

public class CycleDetectionTests
{
    [Fact]
    public async Task Detects_Cycle_With_Diagnostic()
    {
        var piece = new Piece
        {
            Id = Guid.NewGuid(),
            Title = "Test",
            StartUtc = DateTimeOffset.UtcNow,
            DeadlineUtc = DateTimeOffset.UtcNow.AddDays(3),
            BeatsPerMeasure = 8,
            MinutesPerBeat = 60
        };
        // minimal measures
        for (var i=0;i<3;i++)
        {
            piece.Measures.Add(new Measure
            {
                Id = Guid.NewGuid(),
                Index = i,
                StartUtc = piece.StartUtc.AddDays(i),
                EndUtc = piece.StartUtc.AddDays(i).AddHours(8),
                CapacityBeats = 8
            });
        }

        var a = new Note{ Id = Guid.NewGuid(), Title = "A", DurationBeats = 1 };
        var b = new Note{ Id = Guid.NewGuid(), Title = "B", DurationBeats = 1 };
        var c = new Note{ Id = Guid.NewGuid(), Title = "C", DurationBeats = 1 };
        piece.Notes.AddRange(new[]{a,b,c});

        piece.Dependencies.Add(new Dependency{ Id=Guid.NewGuid(), PredecessorNoteId=a.Id, SuccessorNoteId=b.Id});
        piece.Dependencies.Add(new Dependency{ Id=Guid.NewGuid(), PredecessorNoteId=b.Id, SuccessorNoteId=c.Id});
        piece.Dependencies.Add(new Dependency{ Id=Guid.NewGuid(), PredecessorNoteId=c.Id, SuccessorNoteId=a.Id}); // cycle

        var sched = new SimpleAsapScheduler();
        var snap = await sched.RunAsync(piece, ScheduleMode.Forward);
        snap.Diagnostic.Should().NotBeNull();
        snap.Diagnostic!.ToLower().Should().Contain("cycle");
    }
}

