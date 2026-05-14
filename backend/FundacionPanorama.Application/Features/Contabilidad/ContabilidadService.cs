using FundacionPanorama.Application.Features.Contabilidad.DTOs;
using FundacionPanorama.Application.Features.Contabilidad.Interfaces;

namespace FundacionPanorama.Application.Features.Contabilidad;

public class ContabilidadService(IContabilidadRepository repo)
{
    public Task<IReadOnlyList<CategoriaContableDto>> ListarCategoriasAsync(string? tipo, CancellationToken ct = default)
        => repo.ListarCategoriasAsync(tipo, ct);

    public Task<IReadOnlyList<CuentaCajaDto>> ListarCuentasAsync(CancellationToken ct = default)
        => repo.ListarCuentasAsync(ct);

    public Task<CuentaCajaDto> CrearCuentaAsync(CrearCuentaCajaDto dto, CancellationToken ct = default)
        => repo.CrearCuentaAsync(dto, ct);

    public Task<CuentaCajaDto?> ActualizarCuentaAsync(Guid id, CrearCuentaCajaDto dto, CancellationToken ct = default)
        => repo.ActualizarCuentaAsync(id, dto, ct);

    public Task<bool> EliminarCuentaAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarCuentaAsync(id, ct);

    public Task<IReadOnlyList<MovimientoDto>> ListarMovimientosAsync(
        string? tipo, Guid? cuentaId, Guid? programaId, int? mes, int? anio, CancellationToken ct = default)
        => repo.ListarMovimientosAsync(tipo, cuentaId, programaId, mes, anio, ct);

    public Task<MovimientoDto?> ObtenerMovimientoAsync(Guid id, CancellationToken ct = default)
        => repo.ObtenerMovimientoAsync(id, ct);

    public Task<MovimientoDto> CrearMovimientoAsync(CrearMovimientoDto dto, CancellationToken ct = default)
        => repo.CrearMovimientoAsync(dto, ct);

    public Task<MovimientoDto?> ActualizarMovimientoAsync(Guid id, ActualizarMovimientoDto dto, CancellationToken ct = default)
        => repo.ActualizarMovimientoAsync(id, dto, ct);

    public Task<bool> EliminarMovimientoAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarMovimientoAsync(id, ct);

    public Task<IReadOnlyList<PresupuestoDto>> ListarPresupuestosAsync(int anio, CancellationToken ct = default)
        => repo.ListarPresupuestosAsync(anio, ct);

    public Task<PresupuestoDto> CrearPresupuestoAsync(CrearPresupuestoDto dto, CancellationToken ct = default)
        => repo.CrearPresupuestoAsync(dto, ct);

    public Task<PresupuestoDto?> ActualizarPresupuestoAsync(Guid id, CrearPresupuestoDto dto, CancellationToken ct = default)
        => repo.ActualizarPresupuestoAsync(id, dto, ct);

    public Task<bool> EliminarPresupuestoAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarPresupuestoAsync(id, ct);

    public Task<ContabilidadStatsDto> StatsAsync(CancellationToken ct = default)
        => repo.StatsAsync(ct);

    public Task<ReporteContadorDto> ReporteAsync(int mes, int anio, CancellationToken ct = default)
        => repo.ReporteAsync(mes, anio, ct);

    public Task<IReadOnlyList<LibroAuxiliarItemDto>> LibroAuxiliarAsync(Guid cuentaId, int? mes, int? anio, CancellationToken ct = default)
        => repo.LibroAuxiliarAsync(cuentaId, mes, anio, ct);

    public Task<IReadOnlyList<ArqueoCajaDto>> ListarArqueosAsync(Guid cuentaId, CancellationToken ct = default)
        => repo.ListarArqueosAsync(cuentaId, ct);

    public Task<ArqueoCajaDto> CrearArqueoAsync(CrearArqueoDto dto, CancellationToken ct = default)
        => repo.CrearArqueoAsync(dto, ct);

    public Task<bool> EliminarArqueoAsync(int id, CancellationToken ct = default)
        => repo.EliminarArqueoAsync(id, ct);

    public Task<(MovimientoDto Entrada, MovimientoDto Salida)> ReponerCajaAsync(CrearReposicionDto dto, CancellationToken ct = default)
        => repo.ReponerCajaAsync(dto, ct);
}
