using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Auditoria;
using FundacionPanorama.Application.Features.Auditoria.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/auditoria")]
[Authorize]
public class AuditoriaController(AuditoriaService svc) : ControllerBase
{
    [HttpGet]
    [RequierePermiso("seguridad", "ver")]
    public async Task<IActionResult> Listar(
        [FromQuery] string? tipo    = null,
        [FromQuery] string? usuario = null,
        [FromQuery] string? accion  = null,
        [FromQuery] string? desde   = null,
        [FromQuery] string? hasta   = null,
        [FromQuery] int     pagina  = 1,
        [FromQuery] int     tamano  = 50,
        CancellationToken ct = default)
    {
        // Una fecha mal escrita llegaba al ::date de PostgreSQL y respondía 500
        static bool FechaValida(string? f) => string.IsNullOrWhiteSpace(f)
            || DateOnly.TryParseExact(f, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _);
        if (!FechaValida(desde) || !FechaValida(hasta))
            return BadRequest(new { mensaje = "Las fechas del filtro deben tener el formato AAAA-MM-DD. Ejemplo: 2026-01-31." });
        return Ok(await svc.ListarAsync(new FiltroAuditoria(tipo, usuario, accion, desde, hasta), pagina, tamano, ct));
    }

    [HttpGet("tipos")]
    [RequierePermiso("seguridad", "ver")]
    public async Task<IActionResult> ListarTipos(CancellationToken ct)
        => Ok(await svc.ListarTiposAsync(ct));
}
