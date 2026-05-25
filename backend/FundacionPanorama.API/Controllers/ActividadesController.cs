using FundacionPanorama.API.Filters;
using FundacionPanorama.API.Services;
using FundacionPanorama.Application.Features.Actividades;
using FundacionPanorama.Application.Features.Actividades.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/actividades")]
[Authorize]
public class ActividadesController(ActividadesService svc, EmailService email) : ControllerBase
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
        // Capturar estado anterior para detectar cambios
        var anterior = await svc.ObtenerAsync(id, ct);
        var result   = await svc.ActualizarAsync(id, dto, ct);
        if (result is null) return NotFound();

        // Notificar admins si hubo cambio de estado o de fechas
        var estadoCambio = anterior?.Estado != result.Estado;
        var fechaCambio  = anterior?.FechaInicio != result.FechaInicio || anterior?.FechaFin != result.FechaFin;
        if (estadoCambio || fechaCambio)
        {
            _ = Task.Run(async () =>
            {
                var fi = result.FechaInicio.ToString("yyyy-MM-dd HH:mm");
                var ff = result.FechaFin?.ToString("yyyy-MM-dd HH:mm");
                await email.NotificarCambioActividadAsync(
                    result.Titulo,
                    estadoCambio ? anterior!.Estado : null,
                    result.Estado,
                    fi, ff,
                    CancellationToken.None);
            }, CancellationToken.None);
        }

        return Ok(result);
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

    // ── Horarios de programas ──────────────────────────────────────────────────

    [HttpGet("horarios")]
    [RequierePermiso("actividades", "ver")]
    public async Task<IActionResult> ListarHorarios([FromQuery] Guid? programaId, CancellationToken ct)
        => Ok(await svc.ListarHorariosAsync(programaId, ct));

    [HttpPost("horarios")]
    [RequierePermiso("actividades", "crear")]
    public async Task<IActionResult> CrearHorario([FromBody] CrearHorarioDto dto, CancellationToken ct)
        => Ok(await svc.CrearHorarioAsync(dto, ct));

    [HttpPut("horarios/{id:guid}")]
    [RequierePermiso("actividades", "editar")]
    public async Task<IActionResult> ActualizarHorario(Guid id, [FromBody] ActualizarHorarioDto dto, CancellationToken ct)
    {
        var result = await svc.ActualizarHorarioAsync(id, dto, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("horarios/{id:guid}")]
    [RequierePermiso("actividades", "eliminar")]
    public async Task<IActionResult> EliminarHorario(Guid id, CancellationToken ct)
    {
        var ok = await svc.EliminarHorarioAsync(id, ct);
        return ok ? NoContent() : NotFound();
    }

}
