namespace Cadence.Domain.Common;

public static class Guard
{
    public static T AgainstNull<T>(T argument, string parameterName)
    {
        if (argument == null) throw new ArgumentNullException(parameterName);
        return argument;
    }

    public static string AgainstNullOrEmpty(string argument, string parameterName)
    {
        if (string.IsNullOrEmpty(argument)) throw new ArgumentException("Value cannot be null or empty.", parameterName);
        return argument;
    }

    public static double AgainstNegative(double argument, string parameterName)
    {
        if (argument < 0) throw new ArgumentException("Value cannot be negative.", parameterName);
        return argument;
    }

     public static int AgainstNegative(int argument, string parameterName)
    {
        if (argument < 0) throw new ArgumentException("Value cannot be negative.", parameterName);
        return argument;
    }

    public static double AgainstZeroOrNegative(double argument, string parameterName)
    {
        if (argument <= 0) throw new ArgumentException("Value must be greater than zero.", parameterName);
        return argument;
    }

    public static void AgainstInvalidDateRange(DateTimeOffset start, DateTimeOffset end, string startParamName, string endParamName)
    {
        if (start > end) throw new ArgumentException($"{startParamName} must be before {endParamName}.");
    }
}