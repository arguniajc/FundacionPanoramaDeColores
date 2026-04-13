using FundacionPanorama.API.DTOs;
using FundacionPanorama.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("google")]
    public async Task<IActionResult> LoginConGoogle([FromBody] GoogleLoginDto dto)
    {
        var payload = await _authService.ValidarGoogleTokenAsync(dto.IdToken);
        if (payload is null)
            return Unauthorized(new { mensaje = "Token de Google inválido." });

        if (!_authService.EsEmailAutorizado(payload.Email))
            return Forbid();

        var token = _authService.GenerarJwt(payload.Email, payload.Name, payload.Picture);

        return Ok(new AuthResponseDto
        {
            Token    = token,
            Email    = payload.Email,
            Nombre   = payload.Name,
            AvatarUrl = payload.Picture
        });
    }
}
