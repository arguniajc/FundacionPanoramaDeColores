using FundacionPanorama.Application.Features.Alertas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/alertas")]
[Authorize]
public class AlertasController(AlertasService svc) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAlertas(CancellationToken ct)
        => Ok(await svc.ObtenerAsync(ct));
}
