namespace Cadence.Domain.Common;

public abstract class EntityBase
{
    public Guid Id { get; protected set; }

    protected EntityBase(Guid id)
    {
        Id = id == Guid.Empty ? Guid.NewGuid() : id;
    }

    // EF Core constructor
    protected EntityBase() { }
}