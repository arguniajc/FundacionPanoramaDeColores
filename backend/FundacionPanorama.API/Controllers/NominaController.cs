using FundacionPanorama.API.Data;
using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Nomina;
using FundacionPanorama.Application.Features.Nomina.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/nomina")]
[Authorize]
public class NominaController(NominaService svc, AppDbContext db) : BaseController
{
    private NpgsqlConnection AbrirConexion() => new(db.Database.GetConnectionString());

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
    {
        var p = await svc.CrearPeriodoAsync(dto, ct);
        await using var conn = AbrirConexion(); await conn.OpenAsync();
        await RegistrarAuditAsync(conn, null, "nomina_periodo", p.Id.ToString(), $"{p.MesLabel} {p.Anio}", "creado");
        return Ok(p);
    }

    [HttpPost("periodos/{id:int}/cerrar")]
    [RequierePermiso("talento_humano", "editar")]
    public async Task<IActionResult> CerrarPeriodo(int id, CancellationToken ct)
    {
        if (!await svc.CerrarPeriodoAsync(id, ct)) return NotFound();
        await using var conn = AbrirConexion(); await conn.OpenAsync();
        await RegistrarAuditAsync(conn, null, "nomina_periodo", id.ToString(), null, "cerrado");
        return Ok();
    }

    [HttpDelete("periodos/{id:int}")]
    [RequierePermiso("talento_humano", "editar")]
    public async Task<IActionResult> EliminarPeriodo(int id, CancellationToken ct)
    {
        if (!await svc.EliminarPeriodoAsync(id, ct)) return NotFound();
        await using var conn = AbrirConexion(); await conn.OpenAsync();
        await RegistrarAuditAsync(conn, null, "nomina_periodo", id.ToString(), null, "eliminado");
        return Ok();
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
    {
        var result = await svc.AutoLiquidarAsync(periodoId, dto, ct);
        await using var conn = AbrirConexion(); await conn.OpenAsync();
        await RegistrarAuditAsync(conn, null, "nomina_periodo", periodoId.ToString(), null, "auto-liquidado");
        return Ok(result);
    }

    [HttpPost("periodos/{periodoId:int}/liquidaciones")]
    [RequierePermiso("talento_humano", "editar")]
    public async Task<IActionResult> LiquidarEmpleado(
        int periodoId,
        [FromBody] LiquidarEmpleadoDto dto,
        CancellationToken ct)
    {
        var liq = await svc.LiquidarEmpleadoAsync(periodoId, dto, ct);
        await using var conn = AbrirConexion(); await conn.OpenAsync();
        await RegistrarAuditAsync(conn, null, "nomina_liquidacion", liq.Id.ToString(), null, "liquidado",
            $"periodo:{periodoId}");
        return Ok(liq);
    }

    [HttpDelete("liquidaciones/{id:int}")]
    [RequierePermiso("talento_humano", "editar")]
    public async Task<IActionResult> EliminarLiquidacion(int id, CancellationToken ct)
    {
        if (!await svc.EliminarLiquidacionAsync(id, ct)) return NotFound();
        await using var conn = AbrirConexion(); await conn.OpenAsync();
        await RegistrarAuditAsync(conn, null, "nomina_liquidacion", id.ToString(), null, "eliminado");
        return Ok();
    }
}
