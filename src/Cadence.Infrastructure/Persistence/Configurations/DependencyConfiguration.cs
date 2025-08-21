using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Cadence.Domain.Entities;

namespace Cadence.Infrastructure.Persistence.Configuration;

public class DependencyConfiguration : IEntityTypeConfiguration<Dependency>
{
    public void Configure(EntityTypeBuilder<Dependency> builder)
    {
        builder.ToTable("Dependency");
        builder.HasKey(d => d.Id);

        // Relationships configured via PieceConfiguration. We add constraints here.
        builder.HasIndex(d => new { d.PieceId, d.PredecessorNoteId, d.SuccessorNoteId }).IsUnique();
    }
}