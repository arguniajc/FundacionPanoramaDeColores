using FundacionPanorama.Application.Features.Permisos;
using FundacionPanorama.Application.Features.Usuarios;
using FundacionPanorama.API.DTOs;
using FundacionPanorama.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    AuthService       authService,
    UsuariosService   usuariosService,
    PermisosService   permisosService) : ControllerBase
{
    [HttpPost("google")]
    public async Task<IActionResult> LoginConGoogle(
        [FromBody] GoogleLoginDto dto, CancellationToken ct)
    {
        var payload = await authService.ValidarGoogleTokenAsync(dto.IdToken);
        if (payload is null)
            return Unauthorized(new { mensaje = "Token de Google inválido." });

        try
        {
            // 1. Buscar usuario en DB
            var usuario = await usuariosService.ObtenerPorEmailAsync(payload.Email, ct);

            // 2. Bootstrap: si está en appsettings y no en DB → crear como administrador
            if (usuario is null && authService.EsAdminBootstrap(payload.Email))
                usuario = await usuariosService.UpsertAdminAsync(payload.Email, payload.Name, payload.Picture, ct);

            if (usuario is null)
                return StatusCode(403, new { mensaje = "Tu correo no tiene acceso al panel." });

            // 3. Generar JWT con el rol real del usuario
            var token    = authService.GenerarJwt(payload.Email, payload.Name, payload.Picture, usuario.Rol);
            var permisos = usuario.Rol == "administrador"
                ? new Dictionary<string, List<string>>()
                : await permisosService.ObtenerPorRolAsync(usuario.Rol, ct);

            return Ok(new AuthResponseDto
            {
                Token     = token,
                Email     = payload.Email,
                Nombre    = payload.Name,
                AvatarUrl = payload.Picture,
                Rol       = usuario.Rol,
                Permisos  = permisos,
            });
        }
        catch
        {
            // Fallback: si la tabla usuarios aún no existe (migración pendiente)
            // los emails en appsettings siguen pudiendo entrar como administrador
            if (!authService.EsAdminBootstrap(payload.Email))
                return StatusCode(403, new { mensaje = "Tu correo no tiene acceso al panel." });

            var token = authService.GenerarJwt(payload.Email, payload.Name, payload.Picture, "administrador");
            return Ok(new AuthResponseDto
            {
                Token     = token,
                Email     = payload.Email,
                Nombre    = payload.Name,
                AvatarUrl = payload.Picture,
                Rol       = "administrador",
                Permisos  = [],
            });
        }
    }
}
