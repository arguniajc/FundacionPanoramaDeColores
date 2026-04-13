using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FundacionPanorama.API.Models;

[Table("inscripciones")]
public class Inscripcion
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("nombre_menor")]
    [Required]
    [MaxLength(200)]
    public string NombreMenor { get; set; } = string.Empty;

    [Column("fecha_nacimiento")]
    public DateOnly FechaNacimiento { get; set; }

    [Column("tipo_documento")]
    [MaxLength(50)]
    public string TipoDocumento { get; set; } = string.Empty;

    [Column("numero_documento")]
    [MaxLength(50)]
    public string? NumeroDocumento { get; set; }

    [Column("eps")]
    [MaxLength(100)]
    public string? Eps { get; set; }

    [Column("talla_camisa")]
    [MaxLength(10)]
    public string? TallaCamisa { get; set; }

    [Column("talla_pantalon")]
    [MaxLength(10)]
    public string? TallaPantalon { get; set; }

    [Column("talla_zapatos")]
    [MaxLength(10)]
    public string? TallaZapatos { get; set; }

    [Column("tiene_alergia")]
    [MaxLength(5)]
    public string TieneAlergia { get; set; } = "no";

    [Column("descripcion_alergia")]
    public string? DescripcionAlergia { get; set; }

    [Column("observaciones_salud")]
    public string? ObservacionesSalud { get; set; }

    [Column("nombre_acudiente")]
    [MaxLength(200)]
    public string NombreAcudiente { get; set; } = string.Empty;

    [Column("parentesco")]
    [MaxLength(50)]
    public string? Parentesco { get; set; }

    [Column("whatsapp")]
    [MaxLength(20)]
    public string? Whatsapp { get; set; }

    [Column("direccion")]
    public string? Direccion { get; set; }

    [Column("foto_menor_url")]
    public string? FotoMenorUrl { get; set; }

    [Column("foto_documento_url")]
    public string? FotoDocumentoUrl { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("activo")]
    public bool Activo { get; set; } = true;
}
