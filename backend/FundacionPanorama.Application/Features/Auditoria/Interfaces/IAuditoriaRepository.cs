using FundacionPanorama.Application.Features.Auditoria.DTOs;

namespace FundacionPanorama.Application.Features.Auditoria.Interfaces;

public interface IAuditoriaRepository
{
    Task<int> ContarAsync(FiltroAuditoria filtro, CancellationToken ct = default);
    Task<IReadOnlyList<AuditoriaRegistroDto>> ListarAsync(FiltroAuditoria filtro, int pagina, int tamano, CancellationToken ct = default);
    Task<IReadOnlyList<string>> ListarTiposAsync(CancellationToken ct = default);
}
