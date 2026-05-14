using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Actividades;
using FundacionPanorama.Application.Features.Actividades.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/actividades")]
[Authorize]
public class ActividadesController(ActividadesService svc) : ControllerBase
{
    [HttpGet]
    [RequierePermiso("actividades", "ver")]
    public async Task<IActionResult> Listar(
        [FromQuery] int?  mes        = null,
        [FromQuery] int?  anio       = null,
        [FromQuery] Guid? programaId = null,
        CancellationToken ct = default)
        => Ok(await svc.ListarAsync(mes, anio, programaId, ct));

    [HttpGet("{id:guid}")]
    [RequierePermiso("actividades", "ver")]
    public async Task<IActionResult> Obtener(Guid id, CancellationToken ct)
    {
        var actividad = await svc.ObtenerAsync(id, ct);
        return actividad is null ? NotFound() : Ok(actividad);
    }

    [HttpPost]
    [RequierePermiso("actividades", "crear")]
    public async Task<IActionResult> Crear([FromBody] CrearActividadDto dto, CancellationToken ct)
        => Ok(await svc.CrearAsync(dto, ct));

    [HttpPut("{id:guid}")]
    [RequierePermiso("actividades", "editar")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] ActualizarActividadDto dto, CancellationToken ct)
    {
        var result = await svc.ActualizarAsync(id, dto, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [RequierePermiso("actividades", "eliminar")]
    public async Task<IActionResult> Eliminar(Guid id, CancellationToken ct)
    {
        var ok = await svc.EliminarAsync(id, ct);
        return ok ? NoContent() : NotFound();
    }

    [HttpGet("{id:guid}/asistencia")]
    [RequierePermiso("actividades", "ver")]
    public async Task<IActionResult> ObtenerAsistencia(Guid id, CancellationToken ct)
        => Ok(await svc.ObtenerAsistenciaAsync(id, ct));

    [HttpPost("{id:guid}/asistencia")]
    [RequierePermiso("actividades", "editar")]
    public async Task<IActionResult> RegistrarAsistencia(Guid id, [FromBody] RegistrarAsistenciaDto dto, CancellationToken ct)
    {
        await svc.RegistrarAsistenciaAsync(id, dto, ct);
        return NoContent();
    }
}
