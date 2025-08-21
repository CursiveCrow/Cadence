using Cadence.Domain.Common;
using Cadence.Domain.ValueObjects;

namespace Cadence.Domain.Entities;

// T052: Represents the Project/Goal. Root Aggregate.
public class Piece : EntityBase
{
    public string Title { get; private set; }
    public string? Description { get; private set; }
    public DateTimeOffset StartUtc { get; private set; }
    public DateTimeOffset DeadlineUtc { get; private set; }

    public Beats BeatsPerMeasure { get; private set; }
    public Tempo Tempo { get; private set; }

    public DateTimeOffset CreatedUtc { get; private set; }
    public DateTimeOffset UpdatedUtc { get; private set; }

    // Navigation properties using backing fields
    private readonly List<Measure> _measures = new();
    public IReadOnlyCollection<Measure> Measures => _measures.AsReadOnly();

    private readonly List<Chord> _chords = new();
    public IReadOnlyCollection<Chord> Chords => _chords.AsReadOnly();

    private readonly List<Note> _notes = new();
    public IReadOnlyCollection<Note> Notes => _notes.AsReadOnly();

    private readonly List<Dependency> _dependencies = new();
    public IReadOnlyCollection<Dependency> Dependencies => _dependencies.AsReadOnly();

    public Piece(Guid id, string title, DateTimeOffset startUtc, DateTimeOffset deadlineUtc, Beats beatsPerMeasure, Tempo tempo, string? description = null)
        : base(id)
    {
        Guard.AgainstNullOrEmpty(title, nameof(title));
        Guard.AgainstInvalidDateRange(startUtc, deadlineUtc, nameof(startUtc), nameof(deadlineUtc));
        Guard.AgainstZeroOrNegative(beatsPerMeasure.Value, nameof(beatsPerMeasure));

        Title = title;
        StartUtc = startUtc;
        DeadlineUtc = deadlineUtc;
        BeatsPerMeasure = beatsPerMeasure;
        Tempo = tempo;
        Description = description;
        CreatedUtc = DateTimeOffset.UtcNow;
        UpdatedUtc = CreatedUtc;
    }

    // Methods to manage child entities
    public void AddMeasures(IEnumerable<Measure> measures)
    {
        _measures.AddRange(measures);
        UpdatedUtc = DateTimeOffset.UtcNow;
    }

    public void AddChord(Chord chord)
    {
        _chords.Add(chord);
        UpdatedUtc = DateTimeOffset.UtcNow;
    }

    public void AddNote(Note note)
    {
        _notes.Add(note);
        UpdatedUtc = DateTimeOffset.UtcNow;
    }

    public void AddDependency(Dependency dependency)
    {
        _dependencies.Add(dependency);
        UpdatedUtc = DateTimeOffset.UtcNow;
    }

    // EF Core constructor
    private Piece() { }
}