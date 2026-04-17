using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FundacionPanorama.API.Models;

[Table("archivos")]
public class Archivo
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("entidad_tipo"), MaxLength(30)]
    public string EntidadTipo { get; set; } = "";

    [Column("entidad_id")]
    public Guid EntidadId { get; set; }

    [Column("tipo_archivo_id")]
    public short? TipoArchivoId { get; set; }

    [Column("url")]
    public string Url { get; set; } = "";

    [Column("nombre_original"), MaxLength(200)]
    public string? NombreOriginal { get; set; }

    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("fecha_creacion")]
    public DateTime FechaCreacion { get; set; }

    [Column("fecha_modificacion")]
    public DateTime FechaModificacion { get; set; }

    // Navigation
    public CatTipoArchivo? TipoArchivo { get; set; }
}
