using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FundacionPanorama.API.Models;

[Table("log_descargas")]
public class LogDescarga
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("usuario_email")]
    public string UsuarioEmail { get; set; } = string.Empty;

    [Column("beneficiario_id")]
    public Guid BeneficiarioId { get; set; }

    [Column("tipo_archivo")]
    public string TipoArchivo { get; set; } = "documento";

    [Column("url_archivo")]
    public string? UrlArchivo { get; set; }

    [Column("descargado_en")]
    public DateTime DescargadoEn { get; set; } = DateTime.UtcNow;
}
