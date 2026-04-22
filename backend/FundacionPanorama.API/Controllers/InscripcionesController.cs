// CRUD de inscripciones usando Npgsql directo (sin EF Core DbSet). Requiere JWT.
using FundacionPanorama.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FundacionPanorama.API.Controllers;

public record InscripcionDto(
    Guid     Id,
    Guid     BeneficiarioId,
    string   NombreBeneficiario,
    string?  DocumentoBeneficiario,
    Guid     ProgramaId,
    string   NombrePrograma,
    string   NombreSede,
    string   Estado,
    DateTime FechaInscripcion,
    string   Datos,
    string?  Observaciones,
    bool     Activo,
    DateTime FechaCreacion
);

public record CrearInscripcionDto(Guid BeneficiarioId, Guid ProgramaId, string Datos, string? Observaciones);
public record ActualizarInscripcionDto(string Datos, string? Observaciones);
public record CambiarEstadoDto(string Estado);

[ApiController]
[Route("api/inscripciones")]
[Authorize]
public class InscripcionesController : ControllerBase
{
    private readonly AppDbContext _db;
    public InscripcionesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Listar(
        [FromQuery] Guid?   programaId     = null,
        [FromQuery] Guid?   beneficiarioId = null,
        [FromQuery] string? estado         = null)
    {
        var where = new List<string> { "true" };
        var parms = new List<(string, object)>();
        if (programaId.HasValue)     { where.Add("programa_id = @pid");    parms.Add(("pid", programaId.Value)); }
        if (beneficiarioId.HasValue) { where.Add("beneficiario_id = @bid"); parms.Add(("bid", beneficiarioId.Value)); }
        if (!string.IsNullOrEmpty(estado)) { where.Add("estado = @est");   parms.Add(("est", estado)); }

        var sql = $"SELECT id, beneficiario_id, programa_id, estado, fecha_inscripcion, datos, observaciones, activo, fecha_creacion FROM inscripciones WHERE {string.Join(" AND ", where)} ORDER BY fecha_inscripcion DESC";
        var rows = await EjecutarSelectAsync(sql, parms);
        return Ok(await Enriquecer(rows));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> ObtenerPorId(Guid id)
    {
        var rows = await EjecutarSelectAsync("SELECT id, beneficiario_id, programa_id, estado, fecha_inscripcion, datos, observaciones, activo, fecha_creacion FROM inscripciones WHERE id = @id", [("id", id)]);
        if (rows.Count == 0) return NotFound();
        return Ok((await Enriquecer(rows))[0]);
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearInscripcionDto dto)
    {
        if (!await _db.Beneficiarios.AnyAsync(b => b.Id == dto.BeneficiarioId))
            return BadRequest(new { mensaje = "Beneficiario no encontrado." });
        if (!await _db.Programas.AnyAsync(p => p.Id == dto.ProgramaId))
            return BadRequest(new { mensaje = "Programa no encontrado." });

        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"INSERT INTO inscripciones (beneficiario_id, programa_id, estado, datos, observaciones, activo)
                            VALUES (@bid, @pid, 'activa', @datos, @obs, true)
                            RETURNING id, beneficiario_id, programa_id, estado, fecha_inscripcion, datos, observaciones, activo, fecha_creacion";
        cmd.Parameters.AddWithValue("bid",   dto.BeneficiarioId);
        cmd.Parameters.AddWithValue("pid",   dto.ProgramaId);
        cmd.Parameters.AddWithValue("datos", dto.Datos);
        cmd.Parameters.AddWithValue("obs",   (object?)dto.Observaciones?.Trim() ?? DBNull.Value);
        await using var r = await cmd.ExecuteReaderAsync();
        await r.ReadAsync();
        var row = LeerFila(r);
        return Ok((await Enriquecer([row]))[0]);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] ActualizarInscripcionDto dto)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"UPDATE inscripciones SET datos=@datos, observaciones=@obs WHERE id=@id
                            RETURNING id, beneficiario_id, programa_id, estado, fecha_inscripcion, datos, observaciones, activo, fecha_creacion";
        cmd.Parameters.AddWithValue("id",    id);
        cmd.Parameters.AddWithValue("datos", dto.Datos);
        cmd.Parameters.AddWithValue("obs",   (object?)dto.Observaciones?.Trim() ?? DBNull.Value);
        await using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return NotFound();
        return Ok((await Enriquecer([LeerFila(r)]))[0]);
    }

    [HttpPatch("{id:guid}/estado")]
    public async Task<IActionResult> CambiarEstado(Guid id, [FromBody] CambiarEstadoDto dto)
    {
        var validos = new[] { "activa", "suspendida", "completada", "baja" };
        if (!validos.Contains(dto.Estado)) return BadRequest(new { mensaje = "Estado no válido." });

        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"UPDATE inscripciones SET estado=@est, activo=@activo WHERE id=@id
                            RETURNING id, beneficiario_id, programa_id, estado, fecha_inscripcion, datos, observaciones, activo, fecha_creacion";
        cmd.Parameters.AddWithValue("id",     id);
        cmd.Parameters.AddWithValue("est",    dto.Estado);
        cmd.Parameters.AddWithValue("activo", dto.Estado == "activa");
        await using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return NotFound();
        return Ok((await Enriquecer([LeerFila(r)]))[0]);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM inscripciones WHERE id=@id";
        cmd.Parameters.AddWithValue("id", id);
        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound();
        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private NpgsqlConnection AbrirConexion() =>
        new(_db.Database.GetConnectionString());

    private record FilaInscripcion(Guid Id, Guid BeneficiarioId, Guid ProgramaId, string Estado,
        DateTime FechaInscripcion, string Datos, string? Observaciones, bool Activo, DateTime FechaCreacion);

    private static FilaInscripcion LeerFila(System.Data.Common.DbDataReader r) => new(
        r.GetGuid(0), r.GetGuid(1), r.GetGuid(2), r.GetString(3),
        r.GetDateTime(4), r.GetString(5), r.IsDBNull(6) ? null : r.GetString(6),
        r.GetBoolean(7), r.GetDateTime(8)
    );

    private async Task<List<FilaInscripcion>> EjecutarSelectAsync(string sql, IEnumerable<(string, object)> parametros)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        foreach (var (name, val) in parametros) cmd.Parameters.AddWithValue(name, val);
        var result = new List<FilaInscripcion>();
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync()) result.Add(LeerFila(r));
        return result;
    }

    private async Task<List<InscripcionDto>> Enriquecer(IEnumerable<FilaInscripcion> filas)
    {
        var lista    = filas.ToList();
        var bIds     = lista.Select(i => i.BeneficiarioId).Distinct().ToList();
        var pIds     = lista.Select(i => i.ProgramaId).Distinct().ToList();

        var benefs   = await _db.Beneficiarios
            .Where(b => bIds.Contains(b.Id))
            .Select(b => new { b.Id, b.Nombre, b.NumeroDocumento })
            .ToListAsync();

        var progs    = await _db.Programas
            .Where(p => pIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Nombre, p.SedeId })
            .ToListAsync();

        var sedeIds  = progs.Select(p => p.SedeId).Distinct().ToList();
        var sedes    = await _db.Sedes
            .Where(s => sedeIds.Contains(s.Id))
            .Select(s => new { s.Id, s.Nombre })
            .ToListAsync();

        return lista.Select(i =>
        {
            var b = benefs.FirstOrDefault(x => x.Id == i.BeneficiarioId);
            var p = progs.FirstOrDefault(x => x.Id == i.ProgramaId);
            var s = p is not null ? sedes.FirstOrDefault(x => x.Id == p.SedeId) : null;
            return new InscripcionDto(i.Id, i.BeneficiarioId, b?.Nombre ?? "", b?.NumeroDocumento,
                i.ProgramaId, p?.Nombre ?? "", s?.Nombre ?? "",
                i.Estado, i.FechaInscripcion, i.Datos, i.Observaciones, i.Activo, i.FechaCreacion);
        }).ToList();
    }
}
