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

    [Column("fecha_creacion")]
    public DateTime FechaCreacion { get; set; }

    [Column("fecha_modificacion")]
    public DateTime FechaModificacion { get; set; }

    public Sede? Sede { get; set; }
}
