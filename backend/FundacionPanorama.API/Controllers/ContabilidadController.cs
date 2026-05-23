using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Contabilidad;
using FundacionPanorama.Application.Features.Contabilidad.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/contabilidad")]
[Authorize]
public class ContabilidadController(ContabilidadService svc) : ControllerBase
{
    // ── Categorías ─────────────────────────────────────────────────────────────

    [HttpGet("categorias")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> ListarCategorias([FromQuery] string? tipo, CancellationToken ct)
        => Ok(await svc.ListarCategoriasAsync(tipo, ct));

    // ── Cuentas ────────────────────────────────────────────────────────────────

    [HttpGet("cuentas")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> ListarCuentas(CancellationToken ct)
        => Ok(await svc.ListarCuentasAsync(ct));

    [HttpPost("cuentas")]
    [RequierePermiso("contabilidad", "crear")]
    public async Task<IActionResult> CrearCuenta([FromBody] CrearCuentaCajaDto dto, CancellationToken ct)
        => Ok(await svc.CrearCuentaAsync(dto, ct));

    [HttpPut("cuentas/{id:guid}")]
    [RequierePermiso("contabilidad", "editar")]
    public async Task<IActionResult> ActualizarCuenta(Guid id, [FromBody] CrearCuentaCajaDto dto, CancellationToken ct)
    {
        var c = await svc.ActualizarCuentaAsync(id, dto, ct);
        return c is null ? NotFound() : Ok(c);
    }

    [HttpDelete("cuentas/{id:guid}")]
    [RequierePermiso("contabilidad", "editar")]
    public async Task<IActionResult> EliminarCuenta(Guid id, CancellationToken ct)
        => await svc.EliminarCuentaAsync(id, ct) ? NoContent() : NotFound();

    // ── Movimientos ────────────────────────────────────────────────────────────

    [HttpGet("movimientos")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> ListarMovimientos(
        [FromQuery] string? tipo       = null,
        [FromQuery] Guid?   cuentaId   = null,
        [FromQuery] Guid?   programaId = null,
        [FromQuery] int?    mes        = null,
        [FromQuery] int?    anio       = null,
        CancellationToken ct = default)
        => Ok(await svc.ListarMovimientosAsync(tipo, cuentaId, programaId, mes, anio, ct));

    [HttpGet("movimientos/{id:guid}")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> ObtenerMovimiento(Guid id, CancellationToken ct)
    {
        var m = await svc.ObtenerMovimientoAsync(id, ct);
        return m is null ? NotFound() : Ok(m);
    }

    [HttpPost("movimientos")]
    [RequierePermiso("contabilidad", "crear")]
    public async Task<IActionResult> CrearMovimiento([FromBody] CrearMovimientoDto dto, CancellationToken ct)
        => Ok(await svc.CrearMovimientoAsync(dto, ct));

    [HttpPut("movimientos/{id:guid}")]
    [RequierePermiso("contabilidad", "editar")]
    public async Task<IActionResult> ActualizarMovimiento(Guid id, [FromBody] ActualizarMovimientoDto dto, CancellationToken ct)
    {
        var m = await svc.ActualizarMovimientoAsync(id, dto, ct);
        return m is null ? NotFound() : Ok(m);
    }

    [HttpDelete("movimientos/{id:guid}")]
    [RequierePermiso("contabilidad", "editar")]
    public async Task<IActionResult> EliminarMovimiento(Guid id, CancellationToken ct)
        => await svc.EliminarMovimientoAsync(id, ct) ? NoContent() : NotFound();

    [HttpPatch("movimientos/{id:guid}/anular")]
    [RequierePermiso("contabilidad", "editar")]
    public async Task<IActionResult> AnularMovimiento(Guid id, CancellationToken ct)
        => await svc.AnularMovimientoAsync(id, ct) ? NoContent() : NotFound();

    // ── Presupuesto ────────────────────────────────────────────────────────────

    [HttpGet("presupuesto")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> ListarPresupuesto([FromQuery] int? anio, CancellationToken ct)
        => Ok(await svc.ListarPresupuestosAsync(anio ?? DateTime.UtcNow.Year, ct));

    [HttpPost("presupuesto")]
    [RequierePermiso("contabilidad", "crear")]
    public async Task<IActionResult> CrearPresupuesto([FromBody] CrearPresupuestoDto dto, CancellationToken ct)
        => Ok(await svc.CrearPresupuestoAsync(dto, ct));

    [HttpPut("presupuesto/{id:guid}")]
    [RequierePermiso("contabilidad", "editar")]
    public async Task<IActionResult> ActualizarPresupuesto(Guid id, [FromBody] CrearPresupuestoDto dto, CancellationToken ct)
    {
        var p = await svc.ActualizarPresupuestoAsync(id, dto, ct);
        return p is null ? NotFound() : Ok(p);
    }

    [HttpDelete("presupuesto/{id:guid}")]
    [RequierePermiso("contabilidad", "editar")]
    public async Task<IActionResult> EliminarPresupuesto(Guid id, CancellationToken ct)
        => await svc.EliminarPresupuestoAsync(id, ct) ? NoContent() : NotFound();

    // ── Caja Menor ─────────────────────────────────────────────────────────────

    [HttpGet("caja-menor/libro")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> LibroAuxiliar(
        [FromQuery] Guid cuentaId,
        [FromQuery] int? mes  = null,
        [FromQuery] int? anio = null,
        CancellationToken ct = default)
        => Ok(await svc.LibroAuxiliarAsync(cuentaId, mes, anio, ct));

    [HttpGet("caja-menor/arqueos")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> ListarArqueos([FromQuery] Guid cuentaId, CancellationToken ct)
        => Ok(await svc.ListarArqueosAsync(cuentaId, ct));

    [HttpPost("caja-menor/arqueos")]
    [RequierePermiso("contabilidad", "crear")]
    public async Task<IActionResult> CrearArqueo([FromBody] CrearArqueoDto dto, CancellationToken ct)
        => Ok(await svc.CrearArqueoAsync(dto, ct));

    [HttpDelete("caja-menor/arqueos/{id:int}")]
    [RequierePermiso("contabilidad", "editar")]
    public async Task<IActionResult> EliminarArqueo(int id, CancellationToken ct)
        => await svc.EliminarArqueoAsync(id, ct) ? NoContent() : NotFound();

    [HttpPost("caja-menor/reposicion")]
    [RequierePermiso("contabilidad", "crear")]
    public async Task<IActionResult> ReponerCaja([FromBody] CrearReposicionDto dto, CancellationToken ct)
    {
        try
        {
            var (entrada, salida) = await svc.ReponerCajaAsync(dto, ct);
            return Ok(new { entrada, salida });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // ── Dashboard / Reporte ────────────────────────────────────────────────────

    [HttpGet("stats")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> Stats(CancellationToken ct)
        => Ok(await svc.StatsAsync(ct));

    [HttpGet("reporte")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> Reporte(
        [FromQuery] int? mes  = null,
        [FromQuery] int? anio = null,
        CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        return Ok(await svc.ReporteAsync(mes ?? now.Month, anio ?? now.Year, ct));
    }

    [HttpGet("resumen-anual")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> ResumenAnual(
        [FromQuery] int? anio = null,
        CancellationToken ct = default)
        => Ok(await svc.ResumenAnualAsync(anio ?? DateTime.UtcNow.Year, ct));

    // ── Libro Mayor ────────────────────────────────────────────────────────────

    [HttpGet("libro-mayor")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> LibroMayor(
        [FromQuery] int?    anio       = null,
        [FromQuery] int?    mes        = null,
        [FromQuery] string? codigoPuc  = null,
        CancellationToken ct = default)
        => Ok(await svc.LibroMayorAsync(anio ?? DateTime.UtcNow.Year, mes, codigoPuc, ct));
}
