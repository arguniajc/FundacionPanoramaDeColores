namespace FundacionPanorama.Application.Features.Documentos.DTOs;

public record CrearDocumentoDto(
    string Titulo,
    string? Descripcion,
    string Categoria,
    string Url,
    string? NombreOriginal);

public record GuardarArchivoDto(
    string Titulo,
    string Url,
    string? NombreOriginal);

/// <summary>Documento institucional activo (GET api/documentos).</summary>
public record DocumentoInstitucionalDto(
    Guid     Id,
    string   Titulo,
    string?  Descripcion,
    string   Categoria,
    string   Url,
    string?  NombreOriginal,
    string?  SubidoPorEmail,
    DateTime FechaCreacion);

/// <summary>Archivo adicional de un beneficiario (tabla archivos).</summary>
public record ArchivoBeneficiarioDto(
    Guid     Id,
    string   Url,
    string?  NombreOriginal,
    DateTime FechaCreacion);
