using FundacionPanorama.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _db;

    public HealthController(AppDbContext db)
    {
        _db = db;
    }

    // GET api/health
    // Sin [Authorize] — este endpoint es público para el ping de cron-job.org
    [HttpGet]
    public async Task<IActionResult> Check()
    {
        // Consulta mínima a la BD: mantiene activos Render + Supabase
        var total = await _db.Inscripciones.CountAsync();

        return Ok(new
        {
            status    = "ok",
            timestamp = DateTime.UtcNow,
            db        = "connected",
            registros = total
        });
    }
}
