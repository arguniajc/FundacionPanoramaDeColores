using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FundacionPanorama.API.Models;

[Table("inscripciones")]
public class Inscripcion
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("beneficiario_id")]
    public Guid BeneficiarioId { get; set; }

    [Column("programa_id")]
    public Guid ProgramaId { get; set; }

    // activa | suspendida | completada | baja
    [Column("estado"), MaxLength(30)]
    public string Estado { get; set; } = "activa";

    [Column("fecha_inscripcion")]
    public DateTime FechaInscripcion { get; set; }

    // jsonb configurado en OnModelCreating vía HasColumnType
    [Column("datos")]
    public string Datos { get; set; } = "{}";

    [Column("observaciones")]
    public string? Observaciones { get; set; }

    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("fecha_creacion")]
    public DateTime FechaCreacion { get; set; }

    [Column("fecha_modificacion")]
    public DateTime FechaModificacion { get; set; }

    public Beneficiario? Beneficiario { get; set; }
    public Programa? Programa { get; set; }
}
