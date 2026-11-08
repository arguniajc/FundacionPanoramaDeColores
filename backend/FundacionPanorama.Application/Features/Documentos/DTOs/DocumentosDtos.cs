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

/// <summary>Registro desactivado: Url es el archivo que hay que borrar del almacenamiento.</summary>
public sealed record DocumentoEliminado(string? Url);

/// <summary>PUT api/documentos/{id}: datos del documento institucional (el archivo no se cambia: se sube otro).</summary>
public record EditarDocumentoDto(
    string  Titulo,
    string  Categoria,
    string? Descripcion);

/// <summary>PUT api/documentos/archivo/{id}: nombre visible del archivo de un beneficiario.</summary>
public record EditarArchivoDto(string Nombre);
