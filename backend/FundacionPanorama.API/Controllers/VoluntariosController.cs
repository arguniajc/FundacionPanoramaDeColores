using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Shared;
using FundacionPanorama.Application.Features.Voluntarios;
using FundacionPanorama.Application.Features.Voluntarios.DTOs;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/voluntarios")]
[Authorize]
public class VoluntariosController(VoluntariosService svc) : ControllerBase
{
    [HttpGet]
    [RequierePermiso("voluntarios", "ver")]
    public async Task<IActionResult> Listar(
        [FromQuery] string? buscar      = null,
        [FromQuery] bool    soloActivos = true,
        [FromQuery] int     pagina      = 1,
        [FromQuery] int     porPagina   = 500)
        => Ok(await svc.ListarAsync(buscar, soloActivos, pagina, porPagina));

    [HttpGet("stats")]
    [RequierePermiso("voluntarios", "ver")]
    public async Task<IActionResult> Stats()
        => Ok(await svc.StatsAsync());

    // POST api/voluntarios/verificar-documento  { "numero": "...", "excluirId": "<guid>"? }
    // → { existe, id, nombre } del voluntario que ya tiene ese número (id y nombre null si nadie).
    // Compara sin puntos, espacios ni guiones. Al editar se manda excluirId (el propio registro).
    // El número va en el cuerpo y no en la URL para que no quede en el log de peticiones.
    public record VerificarDocumentoDto(string? Numero, Guid? ExcluirId = null);

    [HttpPost("verificar-documento")]
    [RequierePermiso("voluntarios", "ver")]
    public async Task<IActionResult> VerificarDocumento([FromBody] VerificarDocumentoDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(DocumentoIdentidad.Normalizar(dto?.Numero)))
            return BadRequest(new { mensaje = "Escribe el número de documento. Ejemplo: 1144123456." });
        var existente = await svc.BuscarDocumentoAsync(dto!.Numero, dto.ExcluirId, ct);
        return Ok(new { existe = existente is not null, id = existente?.Id, nombre = existente?.Nombre });
    }

    [HttpGet("{id:guid}")]
    [RequierePermiso("voluntarios", "ver")]
    public async Task<IActionResult> ObtenerPorId(Guid id)
    {
        var voluntario = await svc.ObtenerAsync(id);
        return voluntario is null ? NotFound() : Ok(voluntario);
    }

    [HttpPost]
    [RequierePermiso("voluntarios", "crear")]
    public async Task<IActionResult> Crear([FromBody] CrearVoluntarioDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { mensaje = "El nombre es obligatorio." });

        return Ok(await svc.CrearAsync(dto));
    }

    [HttpPut("{id:guid}")]
    [RequierePermiso("voluntarios", "editar")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] CrearVoluntarioDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { mensaje = "El nombre es obligatorio." });

        var voluntario = await svc.ActualizarAsync(id, dto);
        return voluntario is null ? NotFound() : Ok(voluntario);
    }

    [HttpPatch("{id:guid}/toggle")]
    [RequierePermiso("voluntarios", "editar")]
    public async Task<IActionResult> Toggle(Guid id)
    {
        var activo = await svc.ToggleAsync(id);
        if (activo is null) return NotFound();
        return Ok(new { activo = activo.Value });
    }

    [HttpDelete("{id:guid}")]
    [RequierePermiso("voluntarios", "eliminar")]
    public async Task<IActionResult> Eliminar(Guid id)
        => await svc.EliminarAsync(id) ? NoContent() : NotFound();

    // ── Asignaciones a programas ──────────────────────────────────────────────

    [HttpGet("{id:guid}/asignaciones")]
    [RequierePermiso("voluntarios", "ver")]
    public async Task<IActionResult> ListarAsignaciones(Guid id)
        => Ok(await svc.ListarAsignacionesAsync(id));

    [HttpPost("{id:guid}/asignaciones")]
    [RequierePermiso("voluntarios", "editar")]
    public async Task<IActionResult> AgregarAsignacion(Guid id, [FromBody] CrearAsignacionVolDto dto)
    {
        try
        {
            return Ok(await svc.AgregarAsignacionAsync(id, dto));
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == Npgsql.PostgresErrorCodes.ForeignKeyViolation)
        {
            // Voluntario, sede o programa inexistente: antes respondía 500
            return NotFound(new { mensaje = "El voluntario, la sede o el programa ya no existe. Recarga la página." });
        }
    }

    [HttpPut("asignaciones/{asigId:guid}")]
    [RequierePermiso("voluntarios", "editar")]
    public async Task<IActionResult> EditarAsignacion(Guid asigId, [FromBody] EditarAsignacionVolDto dto)
    {
        var asignacion = await svc.EditarAsignacionAsync(asigId, dto);
        return asignacion is null ? NotFound() : Ok(asignacion);
    }

    [HttpDelete("asignaciones/{asigId:guid}")]
    [RequierePermiso("voluntarios", "editar")]
    public async Task<IActionResult> EliminarAsignacion(Guid asigId)
        => await svc.EliminarAsignacionAsync(asigId) ? NoContent() : NotFound();
}
