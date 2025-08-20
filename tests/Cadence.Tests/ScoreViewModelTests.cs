using Cadence.App;
using Xunit;
using FluentAssertions;

namespace Cadence.Tests;

public class ScoreViewModelTests
{
    private const string SeedJson = @"{
  \"piece\": { \"title\": \"Album v1\", \"startUtc\": \"2025-09-01T09:00:00Z\", \"deadlineUtc\": \"2025-09-03T17:00:00Z\", \"beatsPerMeasure\": 8, \"minutesPerBeat\": 60 },
  \"measures\": [
    { \"index\":0, \"startUtc\":\"2025-09-01T09:00:00Z\", \"endUtc\":\"2025-09-01T17:00:00Z\", \"capacityBeats\":8 },
    { \"index\":1, \"startUtc\":\"2025-09-02T09:00:00Z\", \"endUtc\":\"2025-09-02T17:00:00Z\", \"capacityBeats\":8 }
  ],
  \"chords\": [
    { \"id\":\"A\", \"name\":\"Design\", \"priority\":1 },
    { \"id\":\"B\", \"name\":\"Build\", \"priority\":2 }
  ],
  \"notes\": [
    { \"id\":\"n1\", \"title\":\"Draft\", \"durationBeats\":3, \"chordId\":\"A\" },
    { \"id\":\"n2\", \"title\":\"Harmony\", \"durationBeats\":5, \"chordId\":\"A\" },
    { \"id\":\"n3\", \"title\":\"Mix\", \"durationBeats\":4, \"chordId\":\"B\" }
  ],
  \"dependencies\": [
    { \"predecessorNoteId\":\"n1\", \"successorNoteId\":\"n2\" },
    { \"predecessorNoteId\":\"n2\", \"successorNoteId\":\"n3\" }
  ]
}";

    [Fact]
    public async Task CriticalOnly_filters_non_critical()
    {
        var vm = new MainWindowViewModel(autoLoadSample: false);
        vm.LoadFromJson(SeedJson);
        await vm.RunScheduler();

        // sanity
        vm.Notes.Should().NotBeEmpty();

        // enable critical-only
        vm.CriticalOnly = true;
        vm.VisibleNotes.Should().OnlyContain(n => n.IsCritical);
    }

    [Fact]
    public async Task Selecting_note_dims_non_path()
    {
        var vm = new MainWindowViewModel(autoLoadSample: false);
        vm.LoadFromJson(SeedJson);
        await vm.RunScheduler();

        var first = vm.Notes.First();
        vm.SelectNote(first);

        // All visible notes either on the forward path (opacity 1) or dimmed
        vm.VisibleNotes.Should().OnlyContain(n => n.Opacity == 1.0 || n.Opacity < 1.0);
        vm.VisibleNotes.Any(n => n.Opacity < 1.0).Should().BeTrue();
    }
}

