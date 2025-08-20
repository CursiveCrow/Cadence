namespace Cadence.Infrastructure.Calendar;

public interface ICalendarGateway
{
    Task UpsertEventAsync(string noteId, DateTimeOffset startUtc, DateTimeOffset endUtc, CancellationToken ct = default);
    Task DeleteEventAsync(string noteId, CancellationToken ct = default);
}
