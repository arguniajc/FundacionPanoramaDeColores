using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FundacionPanorama.API.Models;

[Table("sedes")]
public class Sede
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("nombre"), Required, MaxLength(150)]
    public string Nombre { get; set; } = "";

    [Column("direccion"), MaxLength(300)]
    public string? Direccion { get; set; }

    [Column("ciudad"), MaxLength(100)]
    public string? Ciudad { get; set; }

    [Column("telefono"), MaxLength(30)]
    public string? Telefono { get; set; }

    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("fecha_creacion")]
    public DateTime FechaCreacion { get; set; }

    [Column("fecha_modificacion")]
    public DateTime FechaModificacion { get; set; }

    public ICollection<Programa> Programas { get; set; } = [];
}
