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

public record LogDescargasPaginaDto(
    IReadOnlyList<LogDescargaRegistroDto> Data,
    long Total,
    int  Pagina,
    int  PorPagina);
