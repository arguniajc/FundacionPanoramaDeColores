using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Usuarios;
using FundacionPanorama.Application.Features.Usuarios.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/equipo")]
[Authorize]
public class EquipoController(UsuariosService svc) : ControllerBase
{
    [HttpGet]
    [RequierePermiso("equipo", "ver")]
    public async Task<IActionResult> Listar(CancellationToken ct)
        => Ok(await svc.ListarAsync(ct));

    [HttpPost]
    [RequierePermiso("equipo", "crear")]
    public async Task<IActionResult> Crear([FromBody] CrearUsuarioDto dto, CancellationToken ct)
    {
        var result = await svc.CrearAsync(dto, ct);
        return result.IsFailure
            ? BadRequest(new { error = result.Error })
            : Ok(result.Value);
    }

    [HttpPut("{id:guid}")]
    [RequierePermiso("equipo", "editar")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] ActualizarUsuarioDto dto, CancellationToken ct)
    {
        var result = await svc.ActualizarAsync(id, dto, ct);
        return result.IsFailure
            ? NotFound(new { error = result.Error })
            : Ok(result.Value);
    }

    [HttpDelete("{id:guid}")]
    [RequierePermiso("equipo", "eliminar")]
    public async Task<IActionResult> Eliminar(Guid id, CancellationToken ct)
    {
        var result = await svc.EliminarAsync(id, ct);
        return result.IsFailure
            ? NotFound(new { error = result.Error })
            : NoContent();
    }
}
