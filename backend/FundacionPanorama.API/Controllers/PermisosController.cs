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
        if (rol == CatalogoPermisos.Administrador)
            return BadRequest(new { mensaje = "Los permisos del administrador no son editables." });
        if (!CatalogoPermisos.Roles.Contains(rol))
            return BadRequest(new { mensaje = "El rol no existe." });

        var esAdmin = Permisos.EsAdministrador(User);
        // Nadie (salvo el administrador) se amplía sus propios permisos
        if (!esAdmin && rol == User.FindFirst(ClaimTypes.Role)?.Value)
            return StatusCode(403, new { mensaje = "No puedes editar los permisos de tu propio rol. Pídeselo a un administrador." });

        var permisos = dto.Permisos ?? [];
        if (permisos.Any(p => !CatalogoPermisos.Modulos.Contains(p.Modulo) || !CatalogoPermisos.Acciones.Contains(p.Accion)))
            return BadRequest(new { mensaje = "Hay módulos o acciones que no existen." });
        // Seguridad y Equipo reparten accesos: otorgarlos queda reservado al administrador
        if (!esAdmin && permisos.Any(p => p.Permitido && CatalogoPermisos.ModulosDeAdministracion.Contains(p.Modulo)))
            return StatusCode(403, new { mensaje = "Solo un administrador puede dar acceso a Seguridad o Equipo." });

        await svc.GuardarPermisosRolAsync(rol, permisos, ct);
        var actualizados = await svc.ObtenerPorRolAsync(rol, ct);
        return Ok(new { rol, permisos = actualizados });
    }
}
