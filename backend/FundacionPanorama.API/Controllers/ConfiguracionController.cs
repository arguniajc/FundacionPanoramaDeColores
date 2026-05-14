using FundacionPanorama.Application.Features.Configuracion;
using FundacionPanorama.Application.Features.Configuracion.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/configuracion")]
[Authorize]
public class ConfiguracionController(ConfiguracionService svc) : ControllerBase
{
    [HttpGet("publica")]
    [AllowAnonymous]
    public async Task<IActionResult> ObtenerPublica(CancellationToken ct)
    {
        var data = await svc.ObtenerPublicaAsync(ct);
        if (data is null)
            return Ok(new { webContenido = (string?)null });

        return Ok(new {
            nombreFundacion = data.NombreFundacion,
            emailContacto   = data.EmailContacto,
            sitioWeb        = data.SitioWeb,
            footerTexto     = data.FooterTexto,
            webContenido    = data.WebContenido,
            colorPrimario   = data.ColorPrimario,
            colorSidebar    = data.ColorSidebar,
        });
    }

    [HttpGet]
    public async Task<IActionResult> Obtener(CancellationToken ct)
    {
        var data = await svc.ObtenerAsync(ct);
        return Ok(data ?? new ConfiguracionDto(
            null,null,null,null,null,null,null,null,null,
            null,null,null,null,null,null,null,null,null,null,null));
    }

    [HttpPut]
    public async Task<IActionResult> Guardar([FromBody] GuardarConfiguracionDto dto, CancellationToken ct)
    {
        var result = await svc.GuardarAsync(dto, ct);
        if (result.IsFailure)
            return BadRequest(new { error = result.Error });

        return Ok(result.Value);
    }
}
