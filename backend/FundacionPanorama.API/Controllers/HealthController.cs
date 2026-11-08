using FundacionPanorama.Application.Features.Salud;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly SaludService _salud;

    public HealthController(SaludService salud) => _salud = salud;

    // GET api/health — público para el health check de Render y cron-job.org.
    // No toca la BD: con credenciales inválidas, un ping cada pocos segundos
    // activaría el circuit breaker del pooler de Supabase.
    [HttpGet]
    public IActionResult Check() => Ok(new { status = "ok", timestamp = DateTime.UtcNow });

    // GET api/health/db — verifica la conexión a la BD (requiere sesión)
    [Authorize]
    [HttpGet("db")]
    public async Task<IActionResult> Db()
    {
        var total = await _salud.ContarRegistrosAsync();
        return Ok(new { status = "ok", timestamp = DateTime.UtcNow, db = "connected", registros = total });
    }

    // GET api/health/tables — diagnóstico: lista todas las tablas y columnas clave.
    // Muestra el esquema de la BD: solo administrador.
    [Authorize(Roles = "administrador,Admin")]
    [HttpGet("tables")]
    public async Task<IActionResult> Tables()
    {
        var (tables, columns) = await _salud.DiagnosticoTablasAsync();
        return Ok(new { tables, columns });
    }
}
