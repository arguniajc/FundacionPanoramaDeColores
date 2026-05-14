using FundacionPanorama.Application.Features.Reportes.DTOs;

namespace FundacionPanorama.Application.Features.Reportes.Interfaces;

public interface IReportesRepository
{
    Task<BeneficiariosReporteDto>  BeneficiariosAsync(CancellationToken ct);
    Task<ProgramasReporteDto>      ProgramasAsync(CancellationToken ct);
    Task<InventarioReporteDto>     InventarioAsync(CancellationToken ct);
    Task<ActividadesReporteDto>    ActividadesAsync(CancellationToken ct);
    Task<DonacionesReporteDto>     DonacionesAsync(CancellationToken ct);
}
