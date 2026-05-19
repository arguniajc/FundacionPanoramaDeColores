using FundacionPanorama.Application.Features.Configuracion;
using FundacionPanorama.Application.Features.Configuracion.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/configuracion")]
[Authorize]
public class ConfiguracionController(ConfiguracionService svc, IMemoryCache cache) : ControllerBase
{
    const string CACHE_KEY = "cfg_publica";

    [HttpGet("publica")]
    [AllowAnonymous]
    public async Task<IActionResult> ObtenerPublica(CancellationToken ct)
    {
        if (cache.TryGetValue(CACHE_KEY, out object? cached))
            return Ok(cached);

        var data = await svc.ObtenerPublicaAsync(ct);
        object result = data is null
            ? new { webContenido = (string?)null }
            : new {
                nombreFundacion = data.NombreFundacion,
                emailContacto   = data.EmailContacto,
                sitioWeb        = data.SitioWeb,
                footerTexto     = data.FooterTexto,
                webContenido    = data.WebContenido,
                colorPrimario   = data.ColorPrimario,
                colorSidebar    = data.ColorSidebar,
            };

        cache.Set(CACHE_KEY, result, TimeSpan.FromMinutes(5));
        return Ok(result);
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

        cache.Remove(CACHE_KEY);
        return Ok(result.Value);
    }
}
