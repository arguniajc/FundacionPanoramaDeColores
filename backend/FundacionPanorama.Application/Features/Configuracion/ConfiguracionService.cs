using FundacionPanorama.Application.Features.Configuracion.DTOs;
using FundacionPanorama.Application.Features.Configuracion.Interfaces;
using FundacionPanorama.Domain.Shared;

namespace FundacionPanorama.Application.Features.Configuracion;

public class ConfiguracionService(IConfiguracionRepository repo)
{
    public Task<ConfiguracionDto?> ObtenerAsync(CancellationToken ct = default)
        => repo.ObtenerAsync(ct);

    public Task<ConfiguracionPublicaDto?> ObtenerPublicaAsync(CancellationToken ct = default)
        => repo.ObtenerPublicaAsync(ct);

    public async Task<Result<ConfiguracionDto>> GuardarAsync(GuardarConfiguracionDto dto, CancellationToken ct = default)
    {
        // Los errores de BD se propagan al manejador global, que los registra en
        // el log con un código y responde al cliente sin detalles técnicos.
        var result = await repo.GuardarAsync(dto, ct);
        return Result.Success(result);
    }
}
