using Cadence.Domain.Common;

namespace Cadence.Domain.ValueObjects;

// T050: Immutable record for Beats (effort unit)
public readonly record struct Beats(double Value)
{
    public double Value { get; } = Guard.AgainstNegative(Value, nameof(Value));

    public static Beats Zero => new(0);

    public static implicit operator Beats(double value) => new(value);
    public static implicit operator double(Beats beats) => beats.Value;
    public static Beats operator +(Beats a, Beats b) => new(a.Value + b.Value);
    public static Beats operator -(Beats a, Beats b) => new(a.Value - b.Value);

    public override string ToString() => $"{Value:0.##} beats";

    public Minutes ToMinutes(Tempo tempo) => new(Value * tempo.MinutesPerBeat);
}

// T050: Immutable record for Minutes (duration unit)
public readonly record struct Minutes(double Value)
{
    public double Value { get; } = Guard.AgainstNegative(Value, nameof(Value));

    public static Minutes Zero => new(0);

    public TimeSpan ToTimeSpan() => TimeSpan.FromMinutes(Value);

    public static implicit operator Minutes(double value) => new(value);
    public static implicit operator double(Minutes minutes) => minutes.Value;

    public override string ToString() => $"{Value:0.##} minutes";
}

// T050: Represents the conversion factor (Minutes per Beat)
public readonly record struct Tempo(double MinutesPerBeat)
{
    public double MinutesPerBeat { get; } = Guard.AgainstZeroOrNegative(MinutesPerBeat, nameof(MinutesPerBeat));

    public static Tempo Default => new(60); // 1 hour per beat

    public static implicit operator Tempo(double value) => new(value);
}