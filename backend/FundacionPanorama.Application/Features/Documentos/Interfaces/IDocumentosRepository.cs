using FundacionPanorama.Application.Features.Documentos.DTOs;

namespace FundacionPanorama.Application.Features.Documentos.Interfaces;

public interface IDocumentosRepository
{
    Task<IReadOnlyList<DocumentoInstitucionalDto>> ListarAsync(string? categoria, CancellationToken ct = default);
    Task<Guid> CrearAsync(CrearDocumentoDto dto, string email, CancellationToken ct = default);

    /// <summary>Desactiva el documento. False si no existía o ya estaba inactivo.</summary>
    Task<bool> EliminarAsync(Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<ArchivoBeneficiarioDto>> ListarPorBeneficiarioAsync(Guid beneficiarioId, CancellationToken ct = default);

    /// <summary>Guarda el archivo del beneficiario. Null si el beneficiario no existe o está inactivo.</summary>
    Task<Guid?> GuardarArchivoBeneficiarioAsync(Guid beneficiarioId, GuardarArchivoDto dto, CancellationToken ct = default);

    /// <summary>Desactiva el archivo. False si no existía o ya estaba inactivo.</summary>
    Task<bool> EliminarArchivoAsync(Guid id, CancellationToken ct = default);
}
