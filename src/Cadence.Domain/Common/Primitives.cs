namespace Cadence.Domain.Common;

public readonly record struct Id(Guid Value)
{
    public static Id New() => new Id(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}

public readonly record struct Beats(double Value)
{
    public static Beats FromHours(double hours) => new Beats(hours);
    public static Beats Zero => new Beats(0);
}

public readonly record struct Minutes(double Value)
{
    public static Minutes FromBeats(Beats beats, double minutesPerBeat) => new Minutes(beats.Value * minutesPerBeat);
}
