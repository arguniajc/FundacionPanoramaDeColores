namespace FundacionPanorama.Domain.Shared;

public abstract class AuditableEntity : Entity
{
    public DateTime CreatedAt { get; protected set; }
    public DateTime? UpdatedAt { get; protected set; }
    public bool Activo { get; protected set; } = true;
}
