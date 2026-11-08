using FundacionPanorama.Application.Features.Documentos.DTOs;

namespace FundacionPanorama.Application.Features.Documentos.Interfaces;

public interface IDocumentosRepository
{
    Task<IReadOnlyList<DocumentoInstitucionalDto>> ListarAsync(string? categoria, CancellationToken ct = default);
    Task<Guid> CrearAsync(CrearDocumentoDto dto, string email, CancellationToken ct = default);

    /// <summary>Desactiva el documento y devuelve su URL. Null si no existía o ya estaba inactivo.</summary>
    Task<DocumentoEliminado?> EliminarAsync(Guid id, CancellationToken ct = default);

    /// <summary>Cambia título, categoría y descripción. False si no existe o está inactivo.</summary>
    Task<bool> EditarAsync(Guid id, EditarDocumentoDto dto, CancellationToken ct = default);

    Task<IReadOnlyList<ArchivoBeneficiarioDto>> ListarPorBeneficiarioAsync(Guid beneficiarioId, CancellationToken ct = default);

    /// <summary>Guarda el archivo del beneficiario. Null si el beneficiario no existe o está inactivo.</summary>
    Task<Guid?> GuardarArchivoBeneficiarioAsync(Guid beneficiarioId, GuardarArchivoDto dto, CancellationToken ct = default);

    /// <summary>Desactiva el archivo y devuelve su URL. Null si no existía o ya estaba inactivo.</summary>
    Task<DocumentoEliminado?> EliminarArchivoAsync(Guid id, CancellationToken ct = default);

    /// <summary>Cambia el nombre visible del archivo. False si no existe o está inactivo.</summary>
    Task<bool> EditarArchivoAsync(Guid id, EditarArchivoDto dto, CancellationToken ct = default);
}
