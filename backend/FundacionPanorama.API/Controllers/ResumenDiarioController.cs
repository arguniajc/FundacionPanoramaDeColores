using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Correos;
using FundacionPanorama.Application.Features.Correos.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

/// <summary>
/// Interruptor y hora (Colombia) del resumen diario de alertas por correo.
/// Endpoint aparte de /api/configuracion para no mezclarlo con el formulario general.
/// </summary>
[ApiController]
[Route("api/configuracion/resumen-diario")]
[Authorize]
public class ResumenDiarioController(ResumenDiarioService svc) : ControllerBase
{
    [HttpGet]
    [RequierePermiso("configuracion", "ver")]
    public async Task<IActionResult> Obtener(CancellationToken ct)
        => Ok(await svc.ObtenerConfigAsync(ct));

    [HttpPut]
    [RequierePermiso("configuracion", "editar")]
    public async Task<IActionResult> Guardar([FromBody] GuardarResumenDiarioDto dto, CancellationToken ct)
    {
        var r = await svc.GuardarConfigAsync(dto, ct);
        return r.IsFailure ? BadRequest(new { mensaje = r.Error }) : Ok(r.Value);
    }
}
