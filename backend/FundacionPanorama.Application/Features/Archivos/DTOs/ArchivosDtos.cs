namespace FundacionPanorama.Application.Features.Archivos.DTOs;

public record LogDescargaDto(Guid BeneficiarioId, string? TipoArchivo, string? UrlArchivo);

/// <summary>Registro de log_descargas con el nombre del beneficiario.</summary>
public record LogDescargaRegistroDto(
    Guid     Id,
    string   UsuarioEmail,
    Guid     BeneficiarioId,
    string   NombreBeneficiario,
    string?  TipoArchivo,
    string?  UrlArchivo,
    DateTime DescargadoEn);

/// <summary>Exportación a Excel registrada por el panel.</summary>
public record LogExportacionDto(
    [System.ComponentModel.DataAnnotations.Required][System.ComponentModel.DataAnnotations.StringLength(200)] string Archivo,
    [System.ComponentModel.DataAnnotations.StringLength(100)] string? Modulo,
    [System.ComponentModel.DataAnnotations.Range(0, int.MaxValue)] int Registros);

public record LogExportacionRegistroDto(Guid Id, string UsuarioEmail, string Archivo, string? Modulo, int Registros, DateTime ExportadoEn);

public record LogExportacionesPaginaDto(IReadOnlyList<LogExportacionRegistroDto> Data, long Total, int Pagina, int PorPagina);

public record LogDescargasPaginaDto(
    IReadOnlyList<LogDescargaRegistroDto> Data,
    long Total,
    int  Pagina,
    int  PorPagina);
