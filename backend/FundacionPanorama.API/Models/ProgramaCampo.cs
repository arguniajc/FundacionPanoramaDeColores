using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FundacionPanorama.API.Models;

[Table("programas_campos")]
public class ProgramaCampo
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("programa_id")]
    public Guid ProgramaId { get; set; }

    [Column("etiqueta"), Required, MaxLength(100)]
    public string Etiqueta { get; set; } = "";

    // text | number | date | select | boolean | document
    [Column("tipo"), MaxLength(30)]
    public string Tipo { get; set; } = "text";

    [Column("obligatorio")]
    public bool Obligatorio { get; set; }

    [Column("opciones")]
    public string[]? Opciones { get; set; }

    [Column("orden")]
    public int Orden { get; set; }

    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("fecha_creacion")]
    public DateTime FechaCreacion { get; set; }

    [Column("fecha_modificacion")]
    public DateTime FechaModificacion { get; set; }

    public Programa? Programa { get; set; }
}
