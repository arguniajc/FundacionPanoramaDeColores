using FundacionPanorama.Application.Features.Reportes.DTOs;
using FundacionPanorama.Application.Features.Reportes.Interfaces;

namespace FundacionPanorama.Application.Features.Reportes;

public class ReportesService(IReportesRepository repo)
{
    public Task<BeneficiariosReporteDto> BeneficiariosAsync(int? anio = null, CancellationToken ct = default)
        => repo.BeneficiariosAsync(anio, ct);

    public Task<ProgramasReporteDto> ProgramasAsync(CancellationToken ct = default)
        => repo.ProgramasAsync(ct);

    public Task<InventarioReporteDto> InventarioAsync(CancellationToken ct = default)
        => repo.InventarioAsync(ct);

    public Task<ActividadesReporteDto> ActividadesAsync(int? anio = null, CancellationToken ct = default)
        => repo.ActividadesAsync(anio, ct);

    public Task<DonacionesReporteDto> DonacionesAsync(int? anio = null, CancellationToken ct = default)
        => repo.DonacionesAsync(anio, ct);
}
