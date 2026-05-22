using FundacionPanorama.Application.Features.Nomina.DTOs;
using FundacionPanorama.Application.Features.Nomina.Interfaces;

namespace FundacionPanorama.Application.Features.Nomina;

public class NominaService(INominaRepository repo)
{
    public Task<IReadOnlyList<NominaPeriodoDto>> ListarPeriodosAsync(int? anio, CancellationToken ct = default)
        => repo.ListarPeriodosAsync(anio, ct);

    public Task<NominaPeriodoDto?> ObtenerPeriodoAsync(int id, CancellationToken ct = default)
        => repo.ObtenerPeriodoAsync(id, ct);

    public Task<NominaPeriodoDto> CrearPeriodoAsync(CrearPeriodoDto dto, CancellationToken ct = default)
        => repo.CrearPeriodoAsync(dto, ct);

    public Task<bool> CerrarPeriodoAsync(int id, CancellationToken ct = default)
        => repo.CerrarPeriodoAsync(id, ct);

    public Task<bool> EliminarPeriodoAsync(int id, CancellationToken ct = default)
        => repo.EliminarPeriodoAsync(id, ct);

    public Task<IReadOnlyList<NominaLiquidacionDto>> ListarLiquidacionesAsync(int periodoId, CancellationToken ct = default)
        => repo.ListarLiquidacionesAsync(periodoId, ct);

    public Task<IReadOnlyList<NominaLiquidacionDto>> AutoLiquidarAsync(int periodoId, AutoLiquidarDto dto, CancellationToken ct = default)
        => repo.AutoLiquidarAsync(periodoId, dto, ct);

    public Task<NominaLiquidacionDto> LiquidarEmpleadoAsync(int periodoId, LiquidarEmpleadoDto dto, CancellationToken ct = default)
        => repo.LiquidarEmpleadoAsync(periodoId, dto, ct);

    public Task<bool> EliminarLiquidacionAsync(int id, CancellationToken ct = default)
        => repo.EliminarLiquidacionAsync(id, ct);
}
