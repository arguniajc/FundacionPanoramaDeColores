using FundacionPanorama.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _db;

    public HealthController(AppDbContext db) => _db = db;

    // GET api/health — público para ping de cron-job.org
    [HttpGet]
    public async Task<IActionResult> Check()
    {
        var total = await _db.Beneficiarios.CountAsync();
        return Ok(new { status = "ok", timestamp = DateTime.UtcNow, db = "connected", registros = total });
    }

    // GET api/health/tables — diagnóstico: lista todas las tablas y columnas clave
    [HttpGet("tables")]
    public async Task<IActionResult> Tables()
    {
        await using var conn = new NpgsqlConnection(_db.Database.GetConnectionString());
        await conn.OpenAsync();

        // Tablas existentes
        var tables = new List<string>();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename";
            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync()) tables.Add(r.GetString(0));
        }

        // Columnas de tablas clave
        var columns = new Dictionary<string, List<string>>();
        var clave = new[] { "inscripciones", "programas", "sedes", "programas_campos" };
        foreach (var t in clave.Where(tables.Contains))
        {
            var cols = new List<string>();
            await using var cmd2 = conn.CreateCommand();
            cmd2.CommandText = $"SELECT column_name FROM information_schema.columns WHERE table_name='{t}' ORDER BY ordinal_position";
            await using var r2 = await cmd2.ExecuteReaderAsync();
            while (await r2.ReadAsync()) cols.Add(r2.GetString(0));
            columns[t] = cols;
        }

        return Ok(new { tables, columns });
    }
}
