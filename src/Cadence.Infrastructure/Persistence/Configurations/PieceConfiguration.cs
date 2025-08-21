using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Cadence.Domain.Entities;
using Cadence.Domain.ValueObjects;

namespace Cadence.Infrastructure.Persistence.Configuration;

public class PieceConfiguration : IEntityTypeConfiguration<Piece>
{
    public void Configure(EntityTypeBuilder<Piece> builder)
    {
        builder.ToTable("Piece");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Title).IsRequired();

        // Value Object Conversions
        builder.Property(p => p.BeatsPerMeasure)
            .HasConversion(v => v.Value, v => new Beats(v))
            .HasColumnName("BeatsPerMeasure");

        builder.Property(p => p.Tempo)
            .HasConversion(v => v.MinutesPerBeat, v => new Tempo(v))
            .HasColumnName("MinutesPerBeat");

        // Relationships using backing fields (encapsulation)
        ConfigureNavigation(builder, nameof(Piece.Measures), m => m.PieceId);
        ConfigureNavigation(builder, nameof(Piece.Chords), c => c.PieceId);
        ConfigureNavigation(builder, nameof(Piece.Notes), n => n.PieceId);
        ConfigureNavigation(builder, nameof(Piece.Dependencies), d => d.PieceId);
    }

    private void ConfigureNavigation<T>(EntityTypeBuilder<Piece> builder, string navigationName, System.Linq.Expressions.Expression<Func<T, object?>> foreignKeyExpression) where T : class
    {
         builder.HasMany(navigationName).WithOne().HasForeignKey(foreignKeyExpression).OnDelete(DeleteBehavior.Cascade);
         builder.Metadata.FindNavigation(navigationName)!.SetPropertyAccessMode(PropertyAccessMode.Field);
    }
}