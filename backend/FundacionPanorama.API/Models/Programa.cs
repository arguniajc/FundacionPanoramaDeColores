using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FundacionPanorama.API.Models;

[Table("programas")]
public class Programa
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("sede_id")]
    public Guid SedeId { get; set; }

    [Column("nombre"), Required, MaxLength(150)]
    public string Nombre { get; set; } = "";

    [Column("descripcion"), MaxLength(500)]
    public string? Descripcion { get; set; }

    [Column("cupo_maximo")]
    public int? CupoMaximo { get; set; }

    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("tiene_tercero")]
    public bool TieneTercero { get; set; } = false;

    [Column("nombre_tercero"), MaxLength(200)]
    public string? NombreTercero { get; set; }

    [Column("rep_autorizado")]
    public bool RepAutorizado { get; set; } = false;

    [Column("rep_autorizacion_fecha")]
    public DateTime? RepAutorizacionFecha { get; set; }

    [Column("rep_firma")]
    public string? RepFirma { get; set; }

    [Column("rep_nombre"), MaxLength(200)]
    public string? RepNombre { get; set; }

    [Column("rep_documento"), MaxLength(50)]
    public string? RepDocumento { get; set; }

    [Column("rep_cargo"), MaxLength(100)]
    public string? RepCargo { get; set; }

    [Column("fecha_creacion")]
    public DateTime FechaCreacion { get; set; }

    [Column("fecha_modificacion")]
    public DateTime FechaModificacion { get; set; }

    public Sede? Sede { get; set; }
}
