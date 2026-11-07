using FundacionPanorama.Application.Features.Alertas.DTOs;

namespace FundacionPanorama.Application.Features.Alertas.Interfaces;

public interface IAlertasRepository
{
    Task<ConteosAlertas> ObtenerConteosAsync(CancellationToken ct = default);
}
