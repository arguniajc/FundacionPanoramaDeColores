using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FundacionPanorama.API.Models;

[Table("alergias_catalogo")]
public class AlergiasCatalogo
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("nombre"), MaxLength(120)]
    public string Nombre { get; set; } = "";

    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("fecha_creacion")]
    public DateTime FechaCreacion { get; set; }

    [Column("fecha_modificacion")]
    public DateTime FechaModificacion { get; set; }
}

[Table("beneficiario_alergia")]
public class BeneficiarioAlergia
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("beneficiario_id")]
    public Guid BeneficiarioId { get; set; }

    [Column("alergia_id")]
    public Guid AlergiaId { get; set; }

    [Column("descripcion")]
    public string? Descripcion { get; set; }

    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("fecha_creacion")]
    public DateTime FechaCreacion { get; set; }

    [Column("fecha_modificacion")]
    public DateTime FechaModificacion { get; set; }

    // Navigation
    public AlergiasCatalogo? Alergia { get; set; }
}
