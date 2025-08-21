using Cadence.Domain.Entities;
using Cadence.Domain.ValueObjects;
using Cadence.Infrastructure.Persistence;
using Cadence.Infrastructure.Persistence.Repositories;
using FluentAssertions;
using Xunit;

namespace Cadence.Tests;

public class RepositoryTests
{
    private CadenceContext CreateContext()
    {
        var context = new CadenceContext(":memory:");
        context.Database.OpenConnection();
        context.Database.EnsureCreated();
        return context;
    }

    [Fact]
    public async Task NoteRepository_ListByPieceAsync_returns_notes_for_piece()
    {
        using var context = CreateContext();

        var piece = new Piece(Guid.NewGuid(), "P", DateTimeOffset.UtcNow,
            DateTimeOffset.UtcNow.AddDays(1), new Beats(8), Tempo.Default);
        context.Pieces.Add(piece);
        await context.SaveChangesAsync();

        var repo = new NoteRepository(context);
        var note = new Note(Guid.NewGuid(), piece.Id, "N1", new Beats(2));
        await repo.AddAsync(note);

        var notes = await repo.ListByPieceAsync(piece.Id);
        notes.Should().ContainSingle(n => n.Id == note.Id);
    }

    [Fact]
    public async Task DependencyRepository_ListByNoteAsync_returns_related_dependencies()
    {
        using var context = CreateContext();

        var piece = new Piece(Guid.NewGuid(), "P", DateTimeOffset.UtcNow,
            DateTimeOffset.UtcNow.AddDays(1), new Beats(8), Tempo.Default);
        context.Pieces.Add(piece);
        var note1 = new Note(Guid.NewGuid(), piece.Id, "N1", new Beats(1));
        var note2 = new Note(Guid.NewGuid(), piece.Id, "N2", new Beats(1));
        context.Notes.AddRange(note1, note2);
        await context.SaveChangesAsync();

        var repo = new DependencyRepository(context);
        var dep = new Dependency(Guid.NewGuid(), piece.Id, note1.Id, note2.Id);
        await repo.AddAsync(dep);

        var depsForNote2 = await repo.ListByNoteAsync(note2.Id);
        depsForNote2.Should().ContainSingle(d => d.Id == dep.Id);
    }
}

