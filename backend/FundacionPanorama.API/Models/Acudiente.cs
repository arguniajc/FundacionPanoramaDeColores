using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FundacionPanorama.API.Models;

[Table("acudientes")]
public class Acudiente
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("nombre"), Required, MaxLength(150)]
    public string Nombre { get; set; } = "";

    [Column("whatsapp"), MaxLength(20)]
    public string? Whatsapp { get; set; }

    [Column("direccion")]
    public string? Direccion { get; set; }

    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("fecha_creacion")]
    public DateTime FechaCreacion { get; set; }

    [Column("fecha_modificacion")]
    public DateTime FechaModificacion { get; set; }
}

[Table("beneficiario_acudiente")]
public class BeneficiarioAcudiente
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("beneficiario_id")]
    public Guid BeneficiarioId { get; set; }

    [Column("acudiente_id")]
    public Guid AcudienteId { get; set; }

    [Column("parentesco_id")]
    public short? ParentescoId { get; set; }

    [Column("es_principal")]
    public bool EsPrincipal { get; set; } = false;

    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("fecha_creacion")]
    public DateTime FechaCreacion { get; set; }

    [Column("fecha_modificacion")]
    public DateTime FechaModificacion { get; set; }

    // Navigation
    public Acudiente?     Acudiente  { get; set; }
    public CatParentesco? Parentesco { get; set; }
}
