using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Nomina;
using FundacionPanorama.Application.Features.Nomina.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/nomina")]
[Authorize]
public class NominaController(NominaService svc) : ControllerBase
{
    // ── Períodos ──────────────────────────────────────────────────────────────

    [HttpGet("periodos")]
    [RequierePermiso("talento_humano", "ver")]
    public async Task<IActionResult> ListarPeriodos(
        [FromQuery] int? anio = null,
        CancellationToken ct = default)
        => Ok(await svc.ListarPeriodosAsync(anio, ct));

    [HttpGet("periodos/{id:int}")]
    [RequierePermiso("talento_humano", "ver")]
    public async Task<IActionResult> ObtenerPeriodo(int id, CancellationToken ct)
    {
        var periodo = await svc.ObtenerPeriodoAsync(id, ct);
        return periodo is null ? NotFound() : Ok(periodo);
    }

    [HttpPost("periodos")]
    [RequierePermiso("talento_humano", "editar")]
    public async Task<IActionResult> CrearPeriodo([FromBody] CrearPeriodoDto dto, CancellationToken ct)
        => Ok(await svc.CrearPeriodoAsync(dto, ct));

    [HttpPost("periodos/{id:int}/cerrar")]
    [RequierePermiso("talento_humano", "editar")]
    public async Task<IActionResult> CerrarPeriodo(int id, CancellationToken ct)
    {
        var ok = await svc.CerrarPeriodoAsync(id, ct);
        return ok ? Ok() : NotFound();
    }

    [HttpDelete("periodos/{id:int}")]
    [RequierePermiso("talento_humano", "editar")]
    public async Task<IActionResult> EliminarPeriodo(int id, CancellationToken ct)
    {
        var ok = await svc.EliminarPeriodoAsync(id, ct);
        return ok ? Ok() : NotFound();
    }

    // ── Liquidaciones ─────────────────────────────────────────────────────────

    [HttpGet("periodos/{periodoId:int}/liquidaciones")]
    [RequierePermiso("talento_humano", "ver")]
    public async Task<IActionResult> ListarLiquidaciones(int periodoId, CancellationToken ct)
        => Ok(await svc.ListarLiquidacionesAsync(periodoId, ct));

    [HttpPost("periodos/{periodoId:int}/auto-liquidar")]
    [RequierePermiso("talento_humano", "editar")]
    public async Task<IActionResult> AutoLiquidar(
        int periodoId,
        [FromBody] AutoLiquidarDto dto,
        CancellationToken ct)
        => Ok(await svc.AutoLiquidarAsync(periodoId, dto, ct));

    [HttpPost("periodos/{periodoId:int}/liquidaciones")]
    [RequierePermiso("talento_humano", "editar")]
    public async Task<IActionResult> LiquidarEmpleado(
        int periodoId,
        [FromBody] LiquidarEmpleadoDto dto,
        CancellationToken ct)
        => Ok(await svc.LiquidarEmpleadoAsync(periodoId, dto, ct));

    [HttpDelete("liquidaciones/{id:int}")]
    [RequierePermiso("talento_humano", "editar")]
    public async Task<IActionResult> EliminarLiquidacion(int id, CancellationToken ct)
    {
        var ok = await svc.EliminarLiquidacionAsync(id, ct);
        return ok ? Ok() : NotFound();
    }
}
