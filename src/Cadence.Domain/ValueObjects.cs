namespace Cadence.Domain;

public readonly record struct Beats(double Value)
{
    public static implicit operator double(Beats b) => b.Value;
    public static Beats FromHours(double hours, double minutesPerBeat) => new(hours / (minutesPerBeat / 60.0));
    public override string ToString() => $"{Value:0.##} beats";
}

public readonly record struct Minutes(double Value)
{
    public static implicit operator double(Minutes m) => m.Value;
    public static Minutes FromBeats(Beats beats, double minutesPerBeat) => new(beats.Value * minutesPerBeat);
    public override string ToString() => $"{Value:0.##} minutes";
}
