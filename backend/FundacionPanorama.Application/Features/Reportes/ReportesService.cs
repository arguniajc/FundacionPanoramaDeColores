using FundacionPanorama.Application.Features.Reportes.DTOs;
using FundacionPanorama.Application.Features.Reportes.Interfaces;

namespace FundacionPanorama.Application.Features.Reportes;

public class ReportesService(IReportesRepository repo)
{
    public Task<BeneficiariosReporteDto> BeneficiariosAsync(CancellationToken ct = default)
        => repo.BeneficiariosAsync(ct);

    public Task<ProgramasReporteDto> ProgramasAsync(CancellationToken ct = default)
        => repo.ProgramasAsync(ct);

    public Task<InventarioReporteDto> InventarioAsync(CancellationToken ct = default)
        => repo.InventarioAsync(ct);

    public Task<ActividadesReporteDto> ActividadesAsync(CancellationToken ct = default)
        => repo.ActividadesAsync(ct);

    public Task<DonacionesReporteDto> DonacionesAsync(CancellationToken ct = default)
        => repo.DonacionesAsync(ct);
}
