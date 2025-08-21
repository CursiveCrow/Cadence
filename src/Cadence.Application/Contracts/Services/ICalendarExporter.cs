using Cadence.Domain.Entities;

namespace Cadence.Application.Contracts.Services;

public interface ICalendarExporter
{
    Task<string> ExportMilestonesToIcsAsync(Piece piece);
}