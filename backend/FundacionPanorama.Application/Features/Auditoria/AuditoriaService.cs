using FundacionPanorama.Application.Features.Auditoria.DTOs;
using FundacionPanorama.Application.Features.Auditoria.Interfaces;

namespace FundacionPanorama.Application.Features.Auditoria;

public class AuditoriaService(IAuditoriaRepository repo)
{
    public async Task<AuditoriaPaginaDto> ListarAsync(FiltroAuditoria filtro, int pagina, int tamano, CancellationToken ct = default)
    {
        tamano = Math.Clamp(tamano, 1, 200);
        pagina = Math.Max(1, pagina);

        var total = await repo.ContarAsync(filtro, ct);
        var datos = await repo.ListarAsync(filtro, pagina, tamano, ct);
        return new AuditoriaPaginaDto(total, pagina, tamano, datos);
    }

    public Task<IReadOnlyList<string>> ListarTiposAsync(CancellationToken ct = default)
        => repo.ListarTiposAsync(ct);
}
