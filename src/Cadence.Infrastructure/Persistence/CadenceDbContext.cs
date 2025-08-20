using Microsoft.EntityFrameworkCore;

namespace Cadence.Infrastructure.Persistence;

// Placeholder DbContext (wire entities later)
public class CadenceDbContext : DbContext
{
    public CadenceDbContext(DbContextOptions<CadenceDbContext> options) : base(options) {}
}
