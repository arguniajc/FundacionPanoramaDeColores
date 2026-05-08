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

    [Column("motivo_baja"), MaxLength(500)]
    public string? MotivoBaja { get; set; }

    // ── Lugar de nacimiento ───────────────────────────────────────────────────
    [Column("pais_nacimiento"), MaxLength(100)]
    public string? PaisNacimiento { get; set; }

    [Column("departamento_nacimiento"), MaxLength(100)]
    public string? DepartamentoNacimiento { get; set; }

    [Column("ciudad_nacimiento"), MaxLength(100)]
    public string? CiudadNacimiento { get; set; }

    [Column("barrio"), MaxLength(100)]
    public string? Barrio { get; set; }

    // ── Composición familiar ──────────────────────────────────────────────────
    [Column("num_personas_vive")]
    public int? NumPersonasVive { get; set; }

    [Column("num_hermanos")]
    public int? NumHermanos { get; set; }

    // ── Educación ─────────────────────────────────────────────────────────────
    [Column("nombre_colegio"), MaxLength(200)]
    public string? NombreColegio { get; set; }

    [Column("grado_escolar"), MaxLength(50)]
    public string? GradoEscolar { get; set; }

    // ── Salud adicional ───────────────────────────────────────────────────────
    [Column("tiene_discapacidad")]
    public bool TieneDiscapacidad { get; set; } = false;

    [Column("descripcion_discapacidad")]
    public string? DescripcionDiscapacidad { get; set; }

    // ── Acudiente / convivencia ───────────────────────────────────────────────
    [Column("vive_con_nino")]
    public bool? ViveConNino { get; set; }

    // ── Autorización ──────────────────────────────────────────────────────────
    [Column("autorizacion")]
    public bool Autorizacion { get; set; } = false;

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
