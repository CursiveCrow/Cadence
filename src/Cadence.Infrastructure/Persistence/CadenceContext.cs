using Microsoft.EntityFrameworkCore;
using Microsoft.Data.Sqlite;
using Cadence.Domain.Entities;
using Cadence.Domain.Scheduling;
using System.Reflection;

namespace Cadence.Infrastructure.Persistence;

public class CadenceContext : DbContext
{
    public DbSet<Piece> Pieces { get; set; }
    public DbSet<Measure> Measures { get; set; }
    public DbSet<Chord> Chords { get; set; }
    public DbSet<Note> Notes { get; set; }
    public DbSet<Dependency> Dependencies { get; set; }
    public DbSet<ScheduleSnapshot> ScheduleSnapshots { get; set; }

    private readonly string _connectionString;

    public CadenceContext(string dbPath = "cadence.db")
    {
        // T103: Configure SQLite connection
        var connectionStringBuilder = new SqliteConnectionStringBuilder
        {
            DataSource = dbPath,
            Mode = SqliteOpenMode.ReadWriteCreate,
            Cache = SqliteCacheMode.Shared
        };
        _connectionString = connectionStringBuilder.ToString();
    }

     protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            optionsBuilder.UseSqlite(_connectionString);
            // T103: EF Core enables WAL mode by default for SQLite.
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Apply configurations (T104)
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        base.OnModelCreating(modelBuilder);
    }

    // T103: Optional: Explicitly set busy timeout upon connection opening if needed.
    public void InitializeDatabase()
    {
        // Database.Migrate(); // Apply migrations in a real app

        var connection = Database.GetDbConnection();
        if (connection.State != System.Data.ConnectionState.Open)
        {
            connection.Open();
        }

        // Set busy timeout (e.g., 5000ms)
        using var command = connection.CreateCommand();
        command.CommandText = "PRAGMA busy_timeout = 5000;";
        command.ExecuteNonQuery();
    }
}