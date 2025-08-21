using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Cadence.Domain.Entities;

namespace Cadence.Infrastructure.Persistence.Configuration;

public class ChordConfiguration : IEntityTypeConfiguration<Chord>
{
    public void Configure(EntityTypeBuilder<Chord> builder)
    {
        builder.ToTable("Chord");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Name).IsRequired();
    }
}