using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.TalentoHumano;
using FundacionPanorama.Application.Features.TalentoHumano.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/talento-humano")]
[Authorize]
public class TalentoHumanoController(TalentoHumanoService svc) : ControllerBase
{
    // ── Empleados ─────────────────────────────────────────────────────────────

    [HttpGet]
    [RequierePermiso("talento_humano", "ver")]
    public async Task<IActionResult> Listar(
        [FromQuery] bool?   activo = null,
        [FromQuery] Guid?   sedeId = null,
        [FromQuery] string? area   = null,
        CancellationToken ct = default)
        => Ok(await svc.ListarAsync(activo, sedeId, area, ct));

    [HttpGet("stats")]
    [RequierePermiso("talento_humano", "ver")]
    public async Task<IActionResult> Stats(CancellationToken ct)
        => Ok(await svc.StatsAsync(ct));

    [HttpGet("{id:guid}")]
    [RequierePermiso("talento_humano", "ver")]
    public async Task<IActionResult> Obtener(Guid id, CancellationToken ct)
    {
        var e = await svc.ObtenerAsync(id, ct);
        return e is null ? NotFound() : Ok(e);
    }

    [HttpPost]
    [RequierePermiso("talento_humano", "crear")]
    public async Task<IActionResult> Crear([FromBody] CrearEmpleadoDto dto, CancellationToken ct)
        => Ok(await svc.CrearAsync(dto, ct));

    [HttpPut("{id:guid}")]
    [RequierePermiso("talento_humano", "editar")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] ActualizarEmpleadoDto dto, CancellationToken ct)
    {
        var e = await svc.ActualizarAsync(id, dto, ct);
        return e is null ? NotFound() : Ok(e);
    }

    [HttpDelete("{id:guid}")]
    [RequierePermiso("talento_humano", "eliminar")]
    public async Task<IActionResult> Eliminar(Guid id, CancellationToken ct)
        => await svc.EliminarAsync(id, ct) ? NoContent() : NotFound();

    // ── Novedades ─────────────────────────────────────────────────────────────

    [HttpGet("{empleadoId:guid}/novedades")]
    [RequierePermiso("talento_humano", "ver")]
    public async Task<IActionResult> ListarNovedades(Guid empleadoId, CancellationToken ct)
        => Ok(await svc.ListarNovedadesAsync(empleadoId, ct));

    [HttpGet("novedades")]
    [RequierePermiso("talento_humano", "ver")]
    public async Task<IActionResult> ListarTodasNovedades([FromQuery] string? estado, CancellationToken ct)
        => Ok(await svc.ListarTodasNovedadesAsync(estado, ct));

    [HttpPost("{empleadoId:guid}/novedades")]
    [RequierePermiso("talento_humano", "crear")]
    public async Task<IActionResult> CrearNovedad(Guid empleadoId, [FromBody] CrearNovedadDto dto, CancellationToken ct)
        => Ok(await svc.CrearNovedadAsync(empleadoId, dto, ct));

    [HttpPut("novedades/{id:guid}")]
    [RequierePermiso("talento_humano", "editar")]
    public async Task<IActionResult> ActualizarNovedad(Guid id, [FromBody] ActualizarNovedadDto dto, CancellationToken ct)
    {
        var n = await svc.ActualizarNovedadAsync(id, dto, ct);
        return n is null ? NotFound() : Ok(n);
    }

    [HttpDelete("novedades/{id:guid}")]
    [RequierePermiso("talento_humano", "eliminar")]
    public async Task<IActionResult> EliminarNovedad(Guid id, CancellationToken ct)
        => await svc.EliminarNovedadAsync(id, ct) ? NoContent() : NotFound();
}
