using Cadence.Application.Contracts.Services;
using Cadence.Domain.Entities;
using System.Text;

namespace Cadence.Infrastructure.Services;

// T109: Minimal ICS generator (Stub).
public class IcsExporter : ICalendarExporter
{
    public Task<string> ExportMilestonesToIcsAsync(Piece piece)
    {
        var sb = new StringBuilder();
        sb.AppendLine("BEGIN:VCALENDAR");
        sb.AppendLine("VERSION:2.0");

        // Implementation to iterate milestones (Chords/Notes with due dates) goes here.

        sb.AppendLine("END:VCALENDAR");
        return Task.FromResult(sb.ToString());
    }
}