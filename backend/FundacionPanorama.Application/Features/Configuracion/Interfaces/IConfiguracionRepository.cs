using FundacionPanorama.Application.Features.Configuracion.DTOs;

namespace FundacionPanorama.Application.Features.Configuracion.Interfaces;

public interface IConfiguracionRepository
{
    Task<ConfiguracionDto?> ObtenerAsync(CancellationToken ct = default);
    Task<ConfiguracionPublicaDto?> ObtenerPublicaAsync(CancellationToken ct = default);
    Task<ConfiguracionDto> GuardarAsync(GuardarConfiguracionDto dto, CancellationToken ct = default);
}
