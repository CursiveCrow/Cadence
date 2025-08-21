using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Cadence.Domain.Entities;
using Cadence.Domain.ValueObjects;
using Cadence.Domain.Enums;

namespace Cadence.Infrastructure.Persistence.Configuration;

public class NoteConfiguration : IEntityTypeConfiguration<Note>
{
    public void Configure(EntityTypeBuilder<Note> builder)
    {
        builder.ToTable("Note");
        builder.HasKey(n => n.Id);

        builder.Property(n => n.Title).IsRequired();

        builder.Property(n => n.DurationBeats)
            .HasConversion(v => v.Value, v => new Beats(v))
            .HasColumnName("DurationBeats");

        builder.Property(n => n.Status)
            .HasConversion(
                v => v.ToString(),
                v => (NoteStatus)Enum.Parse(typeof(NoteStatus), v)
            );

        // Relationship to Chord (optional)
        builder.HasOne<Chord>()
            .WithMany()
            .HasForeignKey(n => n.ChordId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}