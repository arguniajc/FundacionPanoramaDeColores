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
    public async Task<IActionResult> Listar(
        [FromQuery] string? buscar      = null,
        [FromQuery] bool    soloActivos = false,
        [FromQuery] int     pagina      = 1,
        [FromQuery] int     porPagina   = 500)
        => Ok(await svc.ListarAsync(buscar, soloActivos, pagina, porPagina));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> ObtenerPorId(Guid id)
    {
        var donante = await svc.ObtenerAsync(id);
        return donante is null ? NotFound() : Ok(donante);
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
