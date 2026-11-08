using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Shared;
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

    // GET api/talento-humano?pagina=1&porPagina=20&buscar=...&activo=&sedeId=&area=
    // Respuesta: { data, total, pagina, porPagina } (porPagina máximo 100; el organigrama pide todas las páginas)
    [HttpGet]
    [RequierePermiso("talento_humano", "ver")]
    public async Task<IActionResult> Listar(
        [FromQuery] bool?   activo    = null,
        [FromQuery] Guid?   sedeId    = null,
        [FromQuery] string? area      = null,
        [FromQuery] string? buscar    = null,
        [FromQuery] int     pagina    = 1,
        [FromQuery] int     porPagina = 20,
        CancellationToken ct = default)
        => Ok(await svc.ListarAsync(activo, sedeId, area, buscar, pagina, porPagina, ct));

    [HttpGet("stats")]
    [RequierePermiso("talento_humano", "ver")]
    public async Task<IActionResult> Stats(CancellationToken ct)
        => Ok(await svc.StatsAsync(ct));

    // POST api/talento-humano/verificar-documento  { "numero": "...", "excluirId": "<guid>"? }
    // → { existe, id, nombre } del empleado que ya tiene ese número (id y nombre null si nadie).
    // Compara sin puntos, espacios ni guiones. Al editar se manda excluirId (el propio registro).
    // El número va en el cuerpo y no en la URL para que no quede en el log de peticiones.
    public record VerificarDocumentoDto(string? Numero, Guid? ExcluirId = null);

    [HttpPost("verificar-documento")]
    [RequierePermiso("talento_humano", "ver")]
    public async Task<IActionResult> VerificarDocumento([FromBody] VerificarDocumentoDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(DocumentoIdentidad.Normalizar(dto?.Numero)))
            return BadRequest(new { mensaje = "Escribe el número de documento. Ejemplo: 1144123456." });
        var existente = await svc.BuscarDocumentoAsync(dto!.Numero, dto.ExcluirId, ct);
        return Ok(new { existe = existente is not null, id = existente?.Id, nombre = existente?.Nombre });
    }

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
