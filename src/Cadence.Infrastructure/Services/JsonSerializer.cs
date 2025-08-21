using Cadence.Application.Contracts.Services;
using Cadence.Domain.Dtos;
using System.Text.Json;

namespace Cadence.Infrastructure.Services;

// T108: Handles JSON serialization using Seed DTOs.
public class ProjectJsonSerializer : IProjectSerializer
{
    private readonly JsonSerializerOptions _options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    public Task<string> SerializeToDtoJsonAsync(SeedDto dto)
    {
        var json = JsonSerializer.Serialize(dto, _options);
        return Task.FromResult(json);
    }

    public Task<SeedDto> DeserializeFromDtoJsonAsync(string json)
    {
        var seedData = JsonSerializer.Deserialize<SeedDto>(json, _options);
        if (seedData == null) throw new JsonException("Failed to deserialize project data.");
        return Task.FromResult(seedData);
    }
}