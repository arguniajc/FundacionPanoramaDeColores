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
    /// <summary>Crea las liquidaciones de mes completo que faltan; las existentes (quizá editadas) no se modifican.</summary>
    Task<IReadOnlyList<NominaLiquidacionDto>> AutoLiquidarAsync(int periodoId, AutoLiquidarDto dto, CancellationToken ct);
    Task<NominaLiquidacionDto>                LiquidarEmpleadoAsync(int periodoId, LiquidarEmpleadoDto dto, CancellationToken ct);
    Task<NominaLiquidacionDto?>               ObtenerLiquidacionAsync(int id, CancellationToken ct);
    /// <summary>Reemplaza los valores y recalcula los totales; null si no existe o su período ya no está en borrador.</summary>
    Task<NominaLiquidacionDto?>               ActualizarLiquidacionAsync(int id, LiquidarEmpleadoDto dto, CancellationToken ct);
    Task<bool>                                EliminarLiquidacionAsync(int id, CancellationToken ct);

    /// <summary>SMLMV, auxilio de transporte y tasas de salud/pensión vigentes (tabla configuracion).</summary>
    Task<ParametrosNomina>                    ObtenerParametrosAsync(CancellationToken ct);
}
