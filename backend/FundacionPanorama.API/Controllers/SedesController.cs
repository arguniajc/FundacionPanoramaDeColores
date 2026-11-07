// CRUD de sedes, programas y campos dinámicos. Requiere JWT.
// Solo HTTP: binding, permisos y códigos de estado. Reglas en SedesService,
// SQL en SedesRepository.
using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Sedes;
using FundacionPanorama.Application.Features.Sedes.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/sedes")]
[Authorize]
public class SedesController : BaseController
{
    private readonly SedesService _svc;
    public SedesController(SedesService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] bool soloActivas = false, CancellationToken ct = default)
        => Ok(await _svc.ListarAsync(soloActivas, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> ObtenerPorId(Guid id, CancellationToken ct = default)
    {
        var sede = await _svc.ObtenerAsync(id, ct);
        if (sede is null) return NotFound();
        return Ok(sede);
    }

    [HttpPost]
    [RequierePermiso("sedes", "crear")]
    public async Task<IActionResult> Crear([FromBody] CrearSedeDto dto, CancellationToken ct = default)
    {
        var (newId, sede) = await _svc.CrearAsync(dto, ct);
        await AuditarAsync("sede", newId.ToString(), dto.Nombre, "creado");
        return CreatedAtAction(nameof(ObtenerPorId), new { id = newId }, sede);
    }

    [HttpPut("{id:guid}")]
    [RequierePermiso("sedes", "editar")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] CrearSedeDto dto, CancellationToken ct = default)
        => await Auditado(await _svc.ActualizarAsync(id, dto, ct), "sede", id, s => s.Nombre, "editado");

    [HttpPatch("{id:guid}/toggle")]
    [RequierePermiso("sedes", "editar")]
    public async Task<IActionResult> Toggle(Guid id, CancellationToken ct = default)
        => await Auditado(await _svc.ToggleAsync(id, ct), "sede", id, s => s.Nombre, "activo_cambiado");

    [HttpDelete("{id:guid}")]
    [RequierePermiso("sedes", "eliminar")]
    public async Task<IActionResult> Eliminar(Guid id, CancellationToken ct = default)
        => await Eliminado(() => _svc.EliminarAsync(id, ct), "sede", id, "la sede");

    // ── Programas ─────────────────────────────────────────────────────────────

    [HttpGet("programas/{id:guid}")]
    public async Task<IActionResult> ObtenerPrograma(Guid id, CancellationToken ct = default)
    {
        var p = await _svc.ObtenerProgramaAsync(id, ct);
        if (p is null) return NotFound();
        return Ok(p);
    }

    [HttpGet("{sedeId:guid}/programas")]
    public async Task<IActionResult> ListarProgramas(Guid sedeId, CancellationToken ct = default)
        => Ok(await _svc.ListarProgramasAsync(sedeId, ct));

    [HttpPost("programas")]
    [RequierePermiso("programas", "crear")]
    public async Task<IActionResult> CrearPrograma([FromBody] CrearProgramaDto dto, CancellationToken ct = default)
        => await Auditado(await _svc.CrearProgramaAsync(dto, ct), "programa", null, p => p.Nombre, "creado");

    [HttpPut("programas/{id:guid}")]
    [RequierePermiso("programas", "editar")]
    public async Task<IActionResult> ActualizarPrograma(Guid id, [FromBody] CrearProgramaDto dto, CancellationToken ct = default)
        => await Auditado(await _svc.ActualizarProgramaAsync(id, dto, ct), "programa", id, p => p.Nombre, "editado");

    [HttpPatch("programas/{id:guid}/toggle")]
    [RequierePermiso("programas", "editar")]
    public async Task<IActionResult> TogglePrograma(Guid id, CancellationToken ct = default)
        => await Auditado(await _svc.ToggleProgramaAsync(id, ct), "programa", id, p => p.Nombre, "activo_cambiado");

    [HttpDelete("programas/{id:guid}")]
    [RequierePermiso("programas", "eliminar")]
    public async Task<IActionResult> EliminarPrograma(Guid id, CancellationToken ct = default)
        => await Eliminado(() => _svc.EliminarProgramaAsync(id, ct), "programa", id, "el programa");

    [HttpPut("programas/{id:guid}/autorizar-rep")]
    [RequierePermiso("programas", "autorizar")]
    public async Task<IActionResult> AutorizarRepLegal(Guid id, CancellationToken ct = default)
        => await Auditado(await _svc.AutorizarRepLegalAsync(id, ct), "programa", id, p => p.Nombre, "rep_autorizado");

    [HttpDelete("programas/{id:guid}/autorizar-rep")]
    [RequierePermiso("programas", "autorizar")]
    public async Task<IActionResult> RevocarRepLegal(Guid id, CancellationToken ct = default)
        => await Auditado(await _svc.RevocarRepLegalAsync(id, ct), "programa", id, p => p.Nombre, "rep_revocado");

    // ── Campos dinámicos ──────────────────────────────────────────────────────

    [HttpGet("programas/{programaId:guid}/campos")]
    public async Task<IActionResult> ListarCampos(Guid programaId, CancellationToken ct = default)
        => Ok(await _svc.ListarCamposAsync(programaId, ct));

    [HttpPost("programas/{programaId:guid}/campos")]
    [RequierePermiso("programas", "editar")]
    public async Task<IActionResult> CrearCampo(Guid programaId, [FromBody] CrearCampoDto dto, CancellationToken ct = default)
        => ARespuesta(await _svc.CrearCampoAsync(programaId, dto, ct));

    [HttpPut("programas/{programaId:guid}/campos/{campoId:guid}")]
    [RequierePermiso("programas", "editar")]
    public async Task<IActionResult> ActualizarCampo(Guid programaId, Guid campoId, [FromBody] CrearCampoDto dto, CancellationToken ct = default)
        => ARespuesta(await _svc.ActualizarCampoAsync(programaId, campoId, dto, ct));

    [HttpDelete("programas/{programaId:guid}/campos/{campoId:guid}")]
    [RequierePermiso("programas", "editar")]
    public async Task<IActionResult> EliminarCampo(Guid programaId, Guid campoId, CancellationToken ct = default)
        => await _svc.EliminarCampoAsync(programaId, campoId, ct) ? NoContent() : NotFound();

    // ── Helpers ───────────────────────────────────────────────────────────────

    // Traduce el resultado a HTTP y, si fue exitoso, deja registro en la auditoría
    private async Task<IActionResult> Auditado<T>(ResultadoSede<T> res, string tipo, Guid? id, Func<T, string> nombre, string accion)
        where T : class
    {
        if (res.Estado == EstadoResultadoSede.Ok && res.Valor is not null)
        {
            var entidadId = id ?? (res.Valor as ProgramaDto)?.Id ?? Guid.Empty;
            await AuditarAsync(tipo, entidadId.ToString(), nombre(res.Valor), accion);
        }
        return ARespuesta(res);
    }

    // Eliminar: 404 si no existe; 409 claro si otros registros todavía lo usan (antes 500)
    private async Task<IActionResult> Eliminado(Func<Task<bool>> eliminar, string tipo, Guid id, string articulo)
    {
        try
        {
            if (!await eliminar()) return NotFound();
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == Npgsql.PostgresErrorCodes.ForeignKeyViolation)
        {
            return Conflict(new { mensaje = $"No se puede eliminar {articulo}: todavía tiene registros asociados (programas, inscripciones o actividades). Desactívalo en su lugar." });
        }
        await AuditarAsync(tipo, id.ToString(), null, "eliminado");
        return NoContent();
    }

    private IActionResult ARespuesta<T>(ResultadoSede<T> res) => res.Estado switch
    {
        EstadoResultadoSede.Ok           => Ok(res.Valor),
        EstadoResultadoSede.Invalido     => BadRequest(new { mensaje = res.Mensaje }),
        EstadoResultadoSede.NoEncontrado => res.Mensaje is null ? NotFound() : NotFound(new { mensaje = res.Mensaje }),
        _                                => throw new InvalidOperationException()
    };
}
