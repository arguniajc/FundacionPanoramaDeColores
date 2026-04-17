using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FundacionPanorama.API.Models;

[Table("beneficiario_talla")]
public class BeneficiarioTalla
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("beneficiario_id")]
    public Guid BeneficiarioId { get; set; }

    [Column("talla_camisa"), MaxLength(10)]
    public string? TallaCamisa { get; set; }

    [Column("talla_pantalon"), MaxLength(10)]
    public string? TallaPantalon { get; set; }

    [Column("talla_zapatos"), MaxLength(10)]
    public string? TallaZapatos { get; set; }

    [Column("fecha_medicion")]
    public DateOnly FechaMedicion { get; set; }

    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("fecha_creacion")]
    public DateTime FechaCreacion { get; set; }

    [Column("fecha_modificacion")]
    public DateTime FechaModificacion { get; set; }
}
