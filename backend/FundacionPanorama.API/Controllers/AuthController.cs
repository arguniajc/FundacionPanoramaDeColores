using FundacionPanorama.Application.Features.Permisos;
using FundacionPanorama.Application.Features.Usuarios;
using FundacionPanorama.API.DTOs;
using FundacionPanorama.API.Services;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    AuthService       authService,
    UsuariosService   usuariosService,
    PermisosService   permisosService,
    ILogger<AuthController> logger) : ControllerBase
{
    [HttpPost("google")]
    [EnableRateLimiting("auth")]
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
        catch (Exception ex)
        {
            // Fallback: si la tabla usuarios aún no existe (migración pendiente)
            // los emails en appsettings siguen pudiendo entrar como administrador
            logger.LogWarning(ex, "Auth fallback activado para {Email} — posible migración pendiente", payload.Email);

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

    // POST api/auth/renovar — emite un JWT nuevo antes de que venza el actual, para que
    // un usuario activo no pierda lo que está escribiendo. Vuelve a leer el usuario en BD:
    // si fue desactivado o cambió de rol, la renovación lo refleja.
    [HttpPost("renovar")]
    [Authorize]
    public async Task<IActionResult> Renovar(CancellationToken ct)
    {
        var email  = User.FindFirst(ClaimTypes.Email)?.Value;
        var nombre = User.FindFirst(ClaimTypes.Name)?.Value ?? "";
        var avatar = User.FindFirst("avatar")?.Value;
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { mensaje = "Sesión inválida. Vuelve a iniciar sesión." });

        var usuario = await usuariosService.ObtenerPorEmailAsync(email, ct);
        var rol     = usuario?.Rol ?? (authService.EsAdminBootstrap(email) ? "administrador" : null);
        if (rol is null)
            return StatusCode(403, new { mensaje = "Tu usuario ya no tiene acceso al panel." });

        var permisos = rol == "administrador"
            ? new Dictionary<string, List<string>>()
            : await permisosService.ObtenerPorRolAsync(rol, ct);

        return Ok(new AuthResponseDto
        {
            Token     = authService.GenerarJwt(email, nombre, avatar, rol),
            Email     = email,
            Nombre    = nombre,
            AvatarUrl = string.IsNullOrEmpty(avatar) ? null : avatar,
            Rol       = rol,
            Permisos  = permisos,
        });
    }
}
