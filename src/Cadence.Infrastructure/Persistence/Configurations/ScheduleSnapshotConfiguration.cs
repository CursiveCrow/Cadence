using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Cadence.Domain.Scheduling;
using Cadence.Domain.Enums;
using System.Text.Json;

namespace Cadence.Infrastructure.Persistence.Configuration;

public class ScheduleSnapshotConfiguration : IEntityTypeConfiguration<ScheduleSnapshot>
{
    public void Configure(EntityTypeBuilder<ScheduleSnapshot> builder)
    {
        builder.ToTable("ScheduleSnapshot");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Mode)
            .HasConversion(
                v => v.ToString(),
                v => (ScheduleMode)Enum.Parse(typeof(ScheduleMode), v)
            );

        // T107: Configure the collection of ScheduledNote records using OwnsMany.
        builder.OwnsMany(s => s.ScheduledNotes, snBuilder =>
        {
            snBuilder.ToTable("ScheduledNote");
            snBuilder.WithOwner().HasForeignKey("SnapshotId");
            // Define a surrogate primary key for the owned type table.
            snBuilder.Property<Guid>("Id").ValueGeneratedOnAdd();
            snBuilder.HasKey("Id");

            snBuilder.Property(sn => sn.NoteId).IsRequired();
            snBuilder.Property(sn => sn.StartUtc).IsRequired();
            snBuilder.Property(sn => sn.EndUtc).IsRequired();
        });

        // Persist Diagnostics (complex object) as JSON in a column (Requires EF Core 7+)
        builder.OwnsOne(s => s.Diagnostics, dBuilder =>
        {
            dBuilder.ToJson();
        });

        // Ensure EF Core uses the backing field for the collection
        builder.Metadata.FindNavigation(nameof(ScheduleSnapshot.ScheduledNotes))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);
    }
}