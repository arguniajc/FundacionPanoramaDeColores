using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Reportes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/reportes")]
[Authorize]
public class ReportesController(ReportesService svc) : ControllerBase
{
    [HttpGet("beneficiarios")]
    [RequierePermiso("reportes", "ver")]
    public async Task<IActionResult> Beneficiarios([FromQuery] int? anio, CancellationToken ct)
        => Ok(await svc.BeneficiariosAsync(anio, ct));

    [HttpGet("programas")]
    [RequierePermiso("reportes", "ver")]
    public async Task<IActionResult> Programas(CancellationToken ct)
        => Ok(await svc.ProgramasAsync(ct));

    [HttpGet("inventario")]
    [RequierePermiso("reportes", "ver")]
    public async Task<IActionResult> Inventario(CancellationToken ct)
        => Ok(await svc.InventarioAsync(ct));

    [HttpGet("actividades")]
    [RequierePermiso("reportes", "ver")]
    public async Task<IActionResult> Actividades([FromQuery] int? anio, CancellationToken ct)
        => Ok(await svc.ActividadesAsync(anio, ct));

    [HttpGet("donaciones")]
    [RequierePermiso("reportes", "ver")]
    public async Task<IActionResult> Donaciones([FromQuery] int? anio, CancellationToken ct)
        => Ok(await svc.DonacionesAsync(anio, ct));
}
