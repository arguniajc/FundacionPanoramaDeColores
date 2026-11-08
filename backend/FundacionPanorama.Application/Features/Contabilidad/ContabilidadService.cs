using FundacionPanorama.Application.Features.Contabilidad.DTOs;
using FundacionPanorama.Application.Features.Contabilidad.Interfaces;
using FundacionPanorama.Domain.Shared;

namespace FundacionPanorama.Application.Features.Contabilidad;

/// <summary>
/// Contabilidad. Las reglas de negocio se validan aquí antes de tocar la BD: un monto
/// negativo, un tipo inválido o una cuenta inexistente corromperían los saldos
/// (ActualizarSaldoAsync suma o resta según el tipo). Un dato inválido lanza
/// DatoInvalidoException, que la API responde como 400 con el mensaje.
/// </summary>
public class ContabilidadService(IContabilidadRepository repo)
{
    static readonly HashSet<string> TiposMovimiento = ["ingreso", "egreso"];
    // "banco": valor de cuentas antiguas; el panel hoy usa los otros tres
    static readonly HashSet<string> TiposCuenta = ["caja", "caja_menor", "cuenta_bancaria", "banco"];

    /// <summary>Fecha de hoy en Colombia (UTC-5): un registro de las 9 p. m. no debe verse "en el futuro".</summary>
    static DateOnly Hoy() => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-5));

    static void Exigir(bool condicion, string mensaje)
    {
        if (!condicion) throw new DatoInvalidoException(mensaje);
    }

    static void ValidarFecha(DateOnly fecha, string que)
    {
        Exigir(fecha <= Hoy(), $"La fecha {que} no puede ser futura.");
        Exigir(fecha.Year >= 2000, $"La fecha {que} no es válida.");
    }

    async Task<CuentaCajaDto> CuentaExistente(Guid id, string que, CancellationToken ct)
    {
        var cuenta = (await repo.ListarCuentasAsync(ct)).FirstOrDefault(c => c.Id == id);
        Exigir(cuenta is not null, $"La cuenta {que} no existe. Recarga la página y elígela de nuevo.");
        return cuenta!;
    }

    // ── Cuentas ──────────────────────────────────────────────────────────────
    public Task<IReadOnlyList<CategoriaContableDto>> ListarCategoriasAsync(string? tipo, CancellationToken ct = default)
        => repo.ListarCategoriasAsync(tipo, ct);

    public Task<IReadOnlyList<CuentaCajaDto>> ListarCuentasAsync(CancellationToken ct = default)
        => repo.ListarCuentasAsync(ct);

    static void ValidarCuenta(CrearCuentaCajaDto dto)
    {
        Exigir(TiposCuenta.Contains(dto.Tipo ?? ""), "El tipo de cuenta no es válido (caja, caja menor o cuenta bancaria).");
        Exigir(dto.SaldoInicial >= 0, "El saldo inicial no puede ser negativo.");
    }

    public Task<CuentaCajaDto> CrearCuentaAsync(CrearCuentaCajaDto dto, CancellationToken ct = default)
    {
        ValidarCuenta(dto);
        return repo.CrearCuentaAsync(dto, ct);
    }

    public Task<CuentaCajaDto?> ActualizarCuentaAsync(Guid id, CrearCuentaCajaDto dto, CancellationToken ct = default)
    {
        ValidarCuenta(dto);
        return repo.ActualizarCuentaAsync(id, dto, ct);
    }

    public Task<bool> EliminarCuentaAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarCuentaAsync(id, ct);

    // ── Movimientos ──────────────────────────────────────────────────────────
    public Task<IReadOnlyList<MovimientoDto>> ListarMovimientosAsync(
        string? tipo, Guid? cuentaId, Guid? programaId, int? mes, int? anio, CancellationToken ct = default)
        => repo.ListarMovimientosAsync(tipo, cuentaId, programaId, mes, anio, ct);

    public Task<MovimientoDto?> ObtenerMovimientoAsync(Guid id, CancellationToken ct = default)
        => repo.ObtenerMovimientoAsync(id, ct);

    async Task ValidarMovimiento(string tipo, DateOnly fecha, decimal monto, Guid cuentaId, int categoriaId,
        decimal? retencion, decimal? tarifa, CancellationToken ct)
    {
        Exigir(TiposMovimiento.Contains(tipo ?? ""), "El tipo debe ser ingreso o egreso.");
        Exigir(monto > 0, "El monto debe ser mayor que cero.");
        ValidarFecha(fecha, "del movimiento");
        Exigir(retencion is null or >= 0, "La retención no puede ser negativa.");
        Exigir(retencion is null || retencion <= monto, "La retención no puede ser mayor que el monto.");
        Exigir(tarifa is null or >= 0 and <= 100, "La tarifa de retención debe estar entre 0 y 100 %.");

        await CuentaExistente(cuentaId, "del movimiento", ct);
        var categoria = (await repo.ListarCategoriasAsync(null, ct)).FirstOrDefault(c => c.Id == categoriaId);
        Exigir(categoria is not null, "La categoría contable no existe. Elígela de nuevo.");
        Exigir(categoria!.Tipo == tipo, $"La categoría {categoria.CodigoPuc} es de {categoria.Tipo}: no se puede usar en un {tipo}.");
    }

    public async Task<MovimientoDto> CrearMovimientoAsync(CrearMovimientoDto dto, CancellationToken ct = default)
    {
        await ValidarMovimiento(dto.Tipo, dto.Fecha, dto.Monto, dto.CuentaId, dto.CategoriaId,
            dto.RetencionPracticada, dto.TarifaRetencion, ct);
        return await repo.CrearMovimientoAsync(dto, ct);
    }

    public async Task<MovimientoDto?> ActualizarMovimientoAsync(Guid id, ActualizarMovimientoDto dto, CancellationToken ct = default)
    {
        await ValidarMovimiento(dto.Tipo, dto.Fecha, dto.Monto, dto.CuentaId, dto.CategoriaId,
            dto.RetencionPracticada, dto.TarifaRetencion, ct);
        return await repo.ActualizarMovimientoAsync(id, dto, ct);
    }

    public Task<bool> EliminarMovimientoAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarMovimientoAsync(id, ct);

    public Task<bool> AnularMovimientoAsync(Guid id, CancellationToken ct = default)
        => repo.AnularMovimientoAsync(id, ct);

    // ── Presupuesto ──────────────────────────────────────────────────────────
    public Task<IReadOnlyList<PresupuestoDto>> ListarPresupuestosAsync(int anio, CancellationToken ct = default)
        => repo.ListarPresupuestosAsync(anio, ct);

    async Task ValidarPresupuesto(CrearPresupuestoDto dto, Guid? idActual, CancellationToken ct)
    {
        Exigir(dto.Anio >= 2000 && dto.Anio <= Hoy().Year + 5, $"El año debe estar entre 2000 y {Hoy().Year + 5}.");
        Exigir(dto.MontoPresupuestado > 0, "El monto presupuestado debe ser mayor que cero.");
        Exigir((await repo.ListarCategoriasAsync(null, ct)).Any(c => c.Id == dto.CategoriaId),
            "La categoría contable no existe. Elígela de nuevo.");
        var duplicado = (await repo.ListarPresupuestosAsync(dto.Anio, ct))
            .Any(p => p.Id != idActual && p.CategoriaId == dto.CategoriaId && p.ProgramaId == dto.ProgramaId);
        Exigir(!duplicado, "Ya hay un presupuesto para esa categoría y proyecto en ese año. Edítalo en lugar de crear otro.");
    }

    public async Task<PresupuestoDto> CrearPresupuestoAsync(CrearPresupuestoDto dto, CancellationToken ct = default)
    {
        await ValidarPresupuesto(dto, null, ct);
        return await repo.CrearPresupuestoAsync(dto, ct);
    }

    public async Task<PresupuestoDto?> ActualizarPresupuestoAsync(Guid id, CrearPresupuestoDto dto, CancellationToken ct = default)
    {
        await ValidarPresupuesto(dto, id, ct);
        return await repo.ActualizarPresupuestoAsync(id, dto, ct);
    }

    public Task<bool> EliminarPresupuestoAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarPresupuestoAsync(id, ct);

    // ── Reportes ─────────────────────────────────────────────────────────────
    public Task<ContabilidadStatsDto> StatsAsync(CancellationToken ct = default)
        => repo.StatsAsync(ct);

    public Task<ReporteContadorDto> ReporteAsync(int mes, int anio, CancellationToken ct = default)
        => repo.ReporteAsync(mes, anio, ct);

    public Task<ResumenAnualDto> ResumenAnualAsync(int anio, CancellationToken ct = default)
        => repo.ResumenAnualAsync(anio, ct);

    public Task<IReadOnlyList<LibroAuxiliarItemDto>> LibroMayorAsync(int anio, int? mes, string? codigoPuc, CancellationToken ct = default)
        => repo.LibroMayorAsync(anio, mes, codigoPuc, ct);

    public Task<IReadOnlyList<LibroAuxiliarItemDto>> LibroAuxiliarAsync(Guid cuentaId, int? mes, int? anio, CancellationToken ct = default)
        => repo.LibroAuxiliarAsync(cuentaId, mes, anio, ct);

    // ── Caja menor ───────────────────────────────────────────────────────────
    public Task<IReadOnlyList<ArqueoCajaDto>> ListarArqueosAsync(Guid cuentaId, CancellationToken ct = default)
        => repo.ListarArqueosAsync(cuentaId, ct);

    public async Task<ArqueoCajaDto> CrearArqueoAsync(CrearArqueoDto dto, CancellationToken ct = default)
    {
        Exigir(dto.SaldoFisico >= 0, "El saldo contado no puede ser negativo.");
        ValidarFecha(dto.Fecha, "del arqueo");
        await CuentaExistente(dto.CuentaId, "del arqueo", ct);
        return await repo.CrearArqueoAsync(dto, ct);
    }

    public Task<bool> EliminarArqueoAsync(int id, CancellationToken ct = default)
        => repo.EliminarArqueoAsync(id, ct);

    public async Task<(MovimientoDto Entrada, MovimientoDto Salida)> ReponerCajaAsync(CrearReposicionDto dto, CancellationToken ct = default)
    {
        Exigir(dto.Monto > 0, "El monto de la reposición debe ser mayor que cero.");
        Exigir(dto.CuentaCajaId != dto.CuentaOrigenId, "La cuenta de origen debe ser distinta de la caja que se repone.");
        ValidarFecha(dto.Fecha, "de la reposición");
        await CuentaExistente(dto.CuentaCajaId, "de caja", ct);
        await CuentaExistente(dto.CuentaOrigenId, "de origen", ct);
        return await repo.ReponerCajaAsync(dto, ct);
    }
}
