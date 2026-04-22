using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FundacionPanorama.API.Models;

[Table("documentos_institucionales")]
public class DocumentoInstitucional
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("titulo"), MaxLength(200)]
    public string Titulo { get; set; } = "";

    [Column("descripcion")]
    public string? Descripcion { get; set; }

    [Column("categoria"), MaxLength(50)]
    public string Categoria { get; set; } = "Otros";

    [Column("url")]
    public string Url { get; set; } = "";

    [Column("nombre_original"), MaxLength(200)]
    public string? NombreOriginal { get; set; }

    [Column("subido_por_email"), MaxLength(200)]
    public string? SubidoPorEmail { get; set; }

    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("fecha_creacion")]
    public DateTime FechaCreacion { get; set; }

    [Column("fecha_modificacion")]
    public DateTime FechaModificacion { get; set; }
}
