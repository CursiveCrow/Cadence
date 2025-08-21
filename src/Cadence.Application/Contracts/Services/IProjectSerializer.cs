using Cadence.Domain.Dtos;

namespace Cadence.Application.Contracts.Services;

public interface IProjectSerializer
{
    Task<string> SerializeToDtoJsonAsync(SeedDto dto);
    Task<SeedDto> DeserializeFromDtoJsonAsync(string json);
}