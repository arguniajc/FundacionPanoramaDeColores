using FundacionPanorama.Application.Features.Contabilidad.DTOs;

namespace FundacionPanorama.Application.Features.Contabilidad.Interfaces;

public interface IContabilidadRepository
{
    // Categorías
    Task<IReadOnlyList<CategoriaContableDto>> ListarCategoriasAsync(string? tipo, CancellationToken ct);

    // Cuentas caja/banco
    Task<IReadOnlyList<CuentaCajaDto>> ListarCuentasAsync(CancellationToken ct);
    Task<CuentaCajaDto>                CrearCuentaAsync(CrearCuentaCajaDto dto, CancellationToken ct);
    Task<CuentaCajaDto?>               ActualizarCuentaAsync(Guid id, CrearCuentaCajaDto dto, CancellationToken ct);
    Task<bool>                         EliminarCuentaAsync(Guid id, CancellationToken ct);

    // Movimientos
    Task<IReadOnlyList<MovimientoDto>> ListarMovimientosAsync(string? tipo, Guid? cuentaId, Guid? programaId, int? mes, int? anio, CancellationToken ct);
    Task<MovimientoDto?>               ObtenerMovimientoAsync(Guid id, CancellationToken ct);
    Task<MovimientoDto>                CrearMovimientoAsync(CrearMovimientoDto dto, CancellationToken ct);
    Task<MovimientoDto?>               ActualizarMovimientoAsync(Guid id, ActualizarMovimientoDto dto, CancellationToken ct);
    Task<bool>                         EliminarMovimientoAsync(Guid id, CancellationToken ct);

    // Presupuesto
    Task<IReadOnlyList<PresupuestoDto>> ListarPresupuestosAsync(int anio, CancellationToken ct);
    Task<PresupuestoDto>                CrearPresupuestoAsync(CrearPresupuestoDto dto, CancellationToken ct);
    Task<PresupuestoDto?>               ActualizarPresupuestoAsync(Guid id, CrearPresupuestoDto dto, CancellationToken ct);
    Task<bool>                          EliminarPresupuestoAsync(Guid id, CancellationToken ct);

    // Dashboard y reportes
    Task<ContabilidadStatsDto> StatsAsync(CancellationToken ct);
    Task<ReporteContadorDto>   ReporteAsync(int mes, int anio, CancellationToken ct);

    // Caja Menor
    Task<IReadOnlyList<LibroAuxiliarItemDto>>          LibroAuxiliarAsync(Guid cuentaId, int? mes, int? anio, CancellationToken ct);
    Task<IReadOnlyList<ArqueoCajaDto>>                 ListarArqueosAsync(Guid cuentaId, CancellationToken ct);
    Task<ArqueoCajaDto>                                CrearArqueoAsync(CrearArqueoDto dto, CancellationToken ct);
    Task<bool>                                         EliminarArqueoAsync(int id, CancellationToken ct);
    Task<(MovimientoDto Entrada, MovimientoDto Salida)> ReponerCajaAsync(CrearReposicionDto dto, CancellationToken ct);
}
