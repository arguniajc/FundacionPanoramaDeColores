using System.Security.Claims;
using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Permisos;
using FundacionPanorama.Application.Features.Permisos.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/permisos")]
[Authorize]
public class PermisosController(PermisosService svc) : ControllerBase
{
    // Devuelve los permisos del usuario autenticado (usados por el frontend)
    [HttpGet("mios")]
    public async Task<IActionResult> ObtenerMios(CancellationToken ct)
    {
        var rol = User.FindFirst(ClaimTypes.Role)?.Value ?? "";
        if (rol == "administrador")
            return Ok(new { rol, esAdmin = true, permisos = new Dictionary<string, List<string>>() });

        var permisos = await svc.ObtenerPorRolAsync(rol, ct);
        return Ok(new { rol, esAdmin = false, permisos });
    }

    // Solo admin puede ver/editar permisos de roles
    [HttpGet("roles")]
    [RequierePermiso("seguridad", "ver")]
    public async Task<IActionResult> ObtenerTodos(CancellationToken ct)
        => Ok(await svc.ObtenerTodosLosRolesAsync(ct));

    [HttpPut("{rol}")]
    [RequierePermiso("seguridad", "editar")]
    public async Task<IActionResult> ActualizarRol(string rol, [FromBody] ActualizarPermisosDto dto, CancellationToken ct)
    {
        if (rol == "administrador")
            return BadRequest(new { error = "Los permisos del administrador no son editables." });

        await svc.GuardarPermisosRolAsync(rol, dto.Permisos, ct);
        var actualizados = await svc.ObtenerPorRolAsync(rol, ct);
        return Ok(new { rol, permisos = actualizados });
    }
}
