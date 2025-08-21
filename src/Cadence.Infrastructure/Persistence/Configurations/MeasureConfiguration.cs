using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Cadence.Domain.Entities;
using Cadence.Domain.ValueObjects;
using Cadence.Domain.Enums;

namespace Cadence.Infrastructure.Persistence.Configuration;

public class MeasureConfiguration : IEntityTypeConfiguration<Measure>
{
    public void Configure(EntityTypeBuilder<Measure> builder)
    {
        builder.ToTable("Measure");
        builder.HasKey(m => m.Id);

        builder.Property(m => m.CapacityBeats)
            .HasConversion(v => v.Value, v => new Beats(v))
            .HasColumnName("CapacityBeats");

        builder.Property(m => m.Availability)
            .HasConversion(
                v => v.ToString(),
                v => (AvailabilityType)Enum.Parse(typeof(AvailabilityType), v)
            );

        builder.HasIndex(m => new { m.PieceId, m.IndexInPiece }).IsUnique();
    }
}