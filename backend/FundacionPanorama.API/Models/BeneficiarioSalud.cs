using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FundacionPanorama.API.Models;

[Table("beneficiario_salud")]
public class BeneficiarioSalud
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("beneficiario_id")]
    public Guid BeneficiarioId { get; set; }

    [Column("eps_id")]
    public short? EpsId { get; set; }

    [Column("observaciones")]
    public string? Observaciones { get; set; }

    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("fecha_creacion")]
    public DateTime FechaCreacion { get; set; }

    [Column("fecha_modificacion")]
    public DateTime FechaModificacion { get; set; }

    // Navigation
    public CatEps? Eps { get; set; }
}
