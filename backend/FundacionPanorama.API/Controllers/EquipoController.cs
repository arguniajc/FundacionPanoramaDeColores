using FundacionPanorama.API.Filters;
using FundacionPanorama.API.Services;
using FundacionPanorama.Application.Features.Permisos;
using FundacionPanorama.Application.Features.Usuarios;
using FundacionPanorama.Application.Features.Usuarios.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/equipo")]
[Authorize]
public class EquipoController(UsuariosService svc, AccesoUsuarios acceso) : ControllerBase
{
    const string SoloAdminAsignaAdmin = "Solo un administrador puede asignar el rol de administrador.";

    [HttpGet]
    [RequierePermiso("equipo", "ver")]
    public async Task<IActionResult> Listar(CancellationToken ct)
        => Ok(await svc.ListarAsync(ct));

    [HttpPost]
    [RequierePermiso("equipo", "crear")]
    public async Task<IActionResult> Crear([FromBody] CrearUsuarioDto dto, CancellationToken ct)
    {
        if (dto.Rol == CatalogoPermisos.Administrador && !Permisos.EsAdministrador(User))
            return StatusCode(403, new { mensaje = SoloAdminAsignaAdmin });
        var result = await svc.CrearAsync(dto, ct);
        return result.IsFailure
            ? BadRequest(new { mensaje = result.Error })
            : Ok(result.Value);
    }

    [HttpPut("{id:guid}")]
    [RequierePermiso("equipo", "editar")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] ActualizarUsuarioDto dto, CancellationToken ct)
    {
        if (dto.Rol == CatalogoPermisos.Administrador && !Permisos.EsAdministrador(User))
            return StatusCode(403, new { mensaje = SoloAdminAsignaAdmin });
        var result = await svc.ActualizarAsync(id, dto, ct);
        // Desactivar o cambiar el rol aplica en la siguiente petición de ese usuario
        if (result.IsSuccess) acceso.Invalidar(result.Value.Email);
        return result.IsFailure
            ? (result.Error == "Usuario no encontrado." ? NotFound(new { mensaje = result.Error }) : BadRequest(new { mensaje = result.Error }))
            : Ok(result.Value);
    }

    [HttpDelete("{id:guid}")]
    [RequierePermiso("equipo", "eliminar")]
    public async Task<IActionResult> Eliminar(Guid id, CancellationToken ct)
    {
        var result = await svc.EliminarAsync(id, ct);
        return result.IsFailure
            ? NotFound(new { mensaje = result.Error })
            : NoContent();
    }
}
