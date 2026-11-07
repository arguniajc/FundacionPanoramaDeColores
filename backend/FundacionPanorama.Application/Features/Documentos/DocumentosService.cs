using FundacionPanorama.Application.Features.Documentos.DTOs;
using FundacionPanorama.Application.Features.Documentos.Interfaces;

namespace FundacionPanorama.Application.Features.Documentos;

public class DocumentosService(IDocumentosRepository repo)
{
    public Task<IReadOnlyList<DocumentoInstitucionalDto>> ListarAsync(string? categoria, CancellationToken ct = default)
        => repo.ListarAsync(categoria, ct);

    public Task<Guid> CrearAsync(CrearDocumentoDto dto, string email, CancellationToken ct = default)
        => repo.CrearAsync(dto, email, ct);

    public Task<bool> EliminarAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarAsync(id, ct);

    public Task<IReadOnlyList<ArchivoBeneficiarioDto>> ListarPorBeneficiarioAsync(Guid beneficiarioId, CancellationToken ct = default)
        => repo.ListarPorBeneficiarioAsync(beneficiarioId, ct);

    public Task<Guid?> GuardarArchivoBeneficiarioAsync(Guid beneficiarioId, GuardarArchivoDto dto, CancellationToken ct = default)
        => repo.GuardarArchivoBeneficiarioAsync(beneficiarioId, dto, ct);

    public Task<bool> EliminarArchivoAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarArchivoAsync(id, ct);
}
