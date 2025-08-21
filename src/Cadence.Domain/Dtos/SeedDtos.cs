namespace Cadence.Domain.Dtos;

// T059: DTOs matching fixtures/sample-piece.json structure for import/export.
// Using string IDs here as the JSON uses friendly strings or GUID strings.

public record SeedDto(
    PieceDto Piece,
    List<MeasureDto> Measures,
    List<ChordDto> Chords,
    List<NoteDto> Notes,
    List<DependencyDto> Dependencies,
    List<BufferDto>? Buffers
);

public record PieceDto(
    string Id,
    string Title,
    DateTimeOffset StartUtc,
    DateTimeOffset DeadlineUtc,
    double BeatsPerMeasure,
    double MinutesPerBeat
);

public record MeasureDto(
    int Index,
    DateTimeOffset StartUtc,
    DateTimeOffset EndUtc,
    double CapacityBeats
);

public record ChordDto(
    string Id,
    string Name,
    int Priority,
    string? Color
);

public record NoteDto(
    string Id,
    string Title,
    double DurationBeats,
    string? ChordId,
    DateTimeOffset? EarliestStartUtc = null
);

public record DependencyDto(
    string Id,
    string PredecessorNoteId,
    string SuccessorNoteId
);

public record BufferDto(
    int MeasureIndex,
    double Beats
);