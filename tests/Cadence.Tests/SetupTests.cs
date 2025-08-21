using Xunit;
using FluentAssertions;

namespace Cadence.Tests;

public class SetupTests
{
    [Fact]
    public void Environment_ShouldBeReady()
    {
        true.Should().BeTrue();
    }
}