using FundacionPanorama.Application.Features.Nomina.DTOs;

namespace FundacionPanorama.Application.Features.Nomina.Interfaces;

public interface INominaRepository
{
    Task<IReadOnlyList<NominaPeriodoDto>> ListarPeriodosAsync(int? anio, CancellationToken ct);
    Task<NominaPeriodoDto?>               ObtenerPeriodoAsync(int id, CancellationToken ct);
    Task<NominaPeriodoDto>                CrearPeriodoAsync(CrearPeriodoDto dto, CancellationToken ct);
    Task<bool>                            CerrarPeriodoAsync(int id, CancellationToken ct);
    Task<bool>                            EliminarPeriodoAsync(int id, CancellationToken ct);

    Task<IReadOnlyList<NominaLiquidacionDto>> ListarLiquidacionesAsync(int periodoId, CancellationToken ct);
    Task<IReadOnlyList<NominaLiquidacionDto>> AutoLiquidarAsync(int periodoId, AutoLiquidarDto dto, CancellationToken ct);
    Task<NominaLiquidacionDto>                LiquidarEmpleadoAsync(int periodoId, LiquidarEmpleadoDto dto, CancellationToken ct);
    Task<bool>                                EliminarLiquidacionAsync(int id, CancellationToken ct);
}
