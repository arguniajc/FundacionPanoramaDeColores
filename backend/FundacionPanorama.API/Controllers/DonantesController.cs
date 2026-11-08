using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Donantes;
using FundacionPanorama.Application.Features.Donantes.DTOs;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/donantes")]
[Authorize]
public class DonantesController(DonantesService svc) : ControllerBase
{
    [HttpGet]
    [RequiereAlgunPermiso("donantes:ver", "donaciones:ver")]
    public async Task<IActionResult> Listar(
        [FromQuery] string? buscar      = null,
        [FromQuery] bool    soloActivos = false,
        [FromQuery] int     pagina      = 1,
        [FromQuery] int     porPagina   = 500)
        => Ok(await svc.ListarAsync(buscar, soloActivos, pagina, porPagina));

    [HttpGet("{id:guid}")]
    [RequiereAlgunPermiso("donantes:ver", "donaciones:ver")]
    public async Task<IActionResult> ObtenerPorId(Guid id)
    {
        var donante = await svc.ObtenerAsync(id);
        return donante is null ? NotFound() : Ok(donante);
    }

    // POST api/donantes/verificar-documento  { "numero", "tipo"?, "excluirId"? } → { existe, id, nombre }
    // Avisa en el formulario si otro donante ya tiene ese documento (al editar se manda excluirId
    // para no encontrarse a sí mismo). El número va en el cuerpo para que no quede en los logs de URL.
    // `tipo` se acepta pero no filtra: el NIT de una persona natural es su cédula más el DV.
    public record VerificarDocumentoDto(string? Numero, string? Tipo = null, Guid? ExcluirId = null);

    [HttpPost("verificar-documento")]
    [RequiereAlgunPermiso("donantes:ver", "donaciones:ver")]
    public async Task<IActionResult> VerificarDocumento([FromBody] VerificarDocumentoDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto?.Numero))
            return BadRequest(new { mensaje = "Escribe el número de documento. Ejemplo: 900123456-8." });
        var existente = await svc.BuscarDocumentoAsync(dto.Numero, dto.ExcluirId, ct);
        return Ok(new { existe = existente is not null, id = existente?.Id, nombre = existente?.Nombre });
    }

    [HttpPost]
    [RequierePermiso("donantes", "crear")]
    public async Task<IActionResult> Crear([FromBody] CrearDonanteDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { mensaje = "El nombre es obligatorio." });

        return Ok(await svc.CrearAsync(dto));
    }

    [HttpPut("{id:guid}")]
    [RequierePermiso("donantes", "editar")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] CrearDonanteDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { mensaje = "El nombre es obligatorio." });

        var donante = await svc.ActualizarAsync(id, dto);
        return donante is null ? NotFound() : Ok(donante);
    }

    [HttpPatch("{id:guid}/toggle")]
    [RequierePermiso("donantes", "editar")]
    public async Task<IActionResult> Toggle(Guid id)
    {
        var activo = await svc.ToggleAsync(id);
        if (activo is null) return NotFound();
        return Ok(new { activo = activo.Value });
    }

    [HttpDelete("{id:guid}")]
    [RequierePermiso("donantes", "eliminar")]
    public async Task<IActionResult> Eliminar(Guid id)
        => await svc.EliminarAsync(id) ? NoContent() : NotFound();
}
