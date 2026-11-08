using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Alertas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

/// <summary>
/// Alertas de la campana y del Dashboard. Cada usuario recibe solo las de los módulos
/// que puede ver (permiso "modulo:ver"; el administrador las ve todas).
/// </summary>
[ApiController]
[Route("api/alertas")]
[Authorize]
public class AlertasController(AlertasService svc) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAlertas(CancellationToken ct)
        => Ok(await svc.ObtenerVisiblesAsync(
            modulo => Permisos.TieneAlgunoAsync(HttpContext, [$"{modulo}:ver"]), ct));
}
