using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FundacionPanorama.API.Models;

[Table("beneficiarios")]
public class Beneficiario
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("nombre"), Required, MaxLength(150)]
    public string Nombre { get; set; } = "";

    [Column("fecha_nacimiento")]
    public DateOnly? FechaNacimiento { get; set; }

    [Column("tipo_documento_id")]
    public short? TipoDocumentoId { get; set; }

    [Column("numero_documento"), MaxLength(30)]
    public string? NumeroDocumento { get; set; }

    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("fecha_creacion")]
    public DateTime FechaCreacion { get; set; }

    [Column("fecha_modificacion")]
    public DateTime FechaModificacion { get; set; }

    // Navigation
    public CatTipoDocumento?               TipoDocumento        { get; set; }
    public BeneficiarioSalud?              Salud                { get; set; }
    public ICollection<BeneficiarioAcudiente> BeneficiarioAcudientes { get; set; } = [];
    public ICollection<BeneficiarioTalla>  Tallas               { get; set; } = [];
    public ICollection<BeneficiarioAlergia> Alergias             { get; set; } = [];
}
