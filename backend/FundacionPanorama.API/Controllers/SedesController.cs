// CRUD de sedes, programas y campos dinámicos. Requiere JWT.
using System.Text.Json;
using FundacionPanorama.API.Data;
using FundacionPanorama.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FundacionPanorama.API.Controllers;

public record SedeDto(Guid Id, string Nombre, string? Direccion, string? Ciudad, string? Telefono, bool Activo, DateTime FechaCreacion, List<ProgramaDto> Programas);
public record ProgramaDto(Guid Id, Guid SedeId, string NombreSede, string Nombre, string? Descripcion, int? CupoMaximo, bool Activo, DateTime FechaCreacion);
public record CrearSedeDto(string Nombre, string? Direccion, string? Ciudad, string? Telefono);
public record CrearProgramaDto(Guid SedeId, string Nombre, string? Descripcion, int? CupoMaximo);
public record CampoDto(Guid Id, Guid ProgramaId, string Etiqueta, string Tipo, bool Obligatorio, string[]? Opciones, int Orden, bool Activo, string? Seccion);
public record CrearCampoDto(string Etiqueta, string Tipo, bool Obligatorio, string[]? Opciones, int Orden, string? Seccion);

[ApiController]
[Route("api/sedes")]
[Authorize]
public class SedesController : ControllerBase
{
    private readonly AppDbContext _db;
    public SedesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] bool soloActivas = false)
    {
        var query = _db.Sedes.Include(s => s.Programas).AsQueryable();
        if (soloActivas) query = query.Where(s => s.Activo);
        var sedes = await query.OrderBy(s => s.Nombre).ToListAsync();
        return Ok(sedes.Select(MapearSede));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> ObtenerPorId(Guid id)
    {
        var s = await _db.Sedes.Include(s => s.Programas).FirstOrDefaultAsync(s => s.Id == id);
        if (s is null) return NotFound();
        return Ok(MapearSede(s));
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearSedeDto dto)
    {
        var sede = new Sede
        {
            Nombre    = dto.Nombre.Trim(),
            Direccion = dto.Direccion?.Trim(),
            Ciudad    = dto.Ciudad?.Trim(),
            Telefono  = dto.Telefono?.Trim(),
            Activo    = true
        };
        _db.Sedes.Add(sede);
        await _db.SaveChangesAsync();
        await _db.Entry(sede).Collection(s => s.Programas).LoadAsync();
        return CreatedAtAction(nameof(ObtenerPorId), new { id = sede.Id }, MapearSede(sede));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] CrearSedeDto dto)
    {
        var sede = await _db.Sedes.Include(s => s.Programas).FirstOrDefaultAsync(s => s.Id == id);
        if (sede is null) return NotFound();
        sede.Nombre    = dto.Nombre.Trim();
        sede.Direccion = dto.Direccion?.Trim();
        sede.Ciudad    = dto.Ciudad?.Trim();
        sede.Telefono  = dto.Telefono?.Trim();
        await _db.SaveChangesAsync();
        return Ok(MapearSede(sede));
    }

    [HttpPatch("{id:guid}/toggle")]
    public async Task<IActionResult> Toggle(Guid id)
    {
        var sede = await _db.Sedes.Include(s => s.Programas).FirstOrDefaultAsync(s => s.Id == id);
        if (sede is null) return NotFound();
        sede.Activo = !sede.Activo;
        await _db.SaveChangesAsync();
        return Ok(MapearSede(sede));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var sede = await _db.Sedes.FindAsync(id);
        if (sede is null) return NotFound();
        _db.Sedes.Remove(sede);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Programas ─────────────────────────────────────────────────────────────

    [HttpGet("{sedeId:guid}/programas")]
    public async Task<IActionResult> ListarProgramas(Guid sedeId)
    {
        var programas = await _db.Programas
            .Include(p => p.Sede)
            .Where(p => p.SedeId == sedeId)
            .OrderBy(p => p.Nombre)
            .ToListAsync();
        return Ok(programas.Select(MapearPrograma));
    }

    [HttpPost("programas")]
    public async Task<IActionResult> CrearPrograma([FromBody] CrearProgramaDto dto)
    {
        var sedeExiste = await _db.Sedes.AnyAsync(s => s.Id == dto.SedeId);
        if (!sedeExiste) return BadRequest(new { mensaje = "Sede no encontrada." });

        var programa = new Programa
        {
            SedeId      = dto.SedeId,
            Nombre      = dto.Nombre.Trim(),
            Descripcion = dto.Descripcion?.Trim(),
            CupoMaximo  = dto.CupoMaximo,
            Activo      = true
        };
        _db.Programas.Add(programa);
        await _db.SaveChangesAsync();
        await _db.Entry(programa).Reference(p => p.Sede).LoadAsync();
        return Ok(MapearPrograma(programa));
    }

    [HttpPut("programas/{id:guid}")]
    public async Task<IActionResult> ActualizarPrograma(Guid id, [FromBody] CrearProgramaDto dto)
    {
        var programa = await _db.Programas.Include(p => p.Sede).FirstOrDefaultAsync(p => p.Id == id);
        if (programa is null) return NotFound();
        programa.SedeId      = dto.SedeId;
        programa.Nombre      = dto.Nombre.Trim();
        programa.Descripcion = dto.Descripcion?.Trim();
        programa.CupoMaximo  = dto.CupoMaximo;
        await _db.SaveChangesAsync();
        return Ok(MapearPrograma(programa));
    }

    [HttpPatch("programas/{id:guid}/toggle")]
    public async Task<IActionResult> TogglePrograma(Guid id)
    {
        var programa = await _db.Programas.Include(p => p.Sede).FirstOrDefaultAsync(p => p.Id == id);
        if (programa is null) return NotFound();
        programa.Activo = !programa.Activo;
        await _db.SaveChangesAsync();
        return Ok(MapearPrograma(programa));
    }

    [HttpDelete("programas/{id:guid}")]
    public async Task<IActionResult> EliminarPrograma(Guid id)
    {
        var programa = await _db.Programas.FindAsync(id);
        if (programa is null) return NotFound();
        _db.Programas.Remove(programa);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Campos dinámicos — Npgsql directo (sin EF Core DbSet) ─────────────────

    [HttpGet("programas/{programaId:guid}/campos")]
    public async Task<IActionResult> ListarCampos(Guid programaId)
    {
        var campos = new List<CampoDto>();
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT id, programa_id, etiqueta, tipo, obligatorio, opciones_json, orden, activo, seccion FROM programas_campos WHERE programa_id = @pid AND activo = true ORDER BY orden";
        cmd.Parameters.AddWithValue("pid", programaId);
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync()) campos.Add(LeerCampo(r));
        return Ok(campos);
    }

    [HttpPost("programas/{programaId:guid}/campos")]
    public async Task<IActionResult> CrearCampo(Guid programaId, [FromBody] CrearCampoDto dto)
    {
        if (!await _db.Programas.AnyAsync(p => p.Id == programaId))
            return NotFound(new { mensaje = "Programa no encontrado." });
        if (string.IsNullOrWhiteSpace(dto.Seccion))
            return BadRequest(new { mensaje = "La sección del campo es obligatoria." });

        var opJson = dto.Opciones is { Length: > 0 } ? JsonSerializer.Serialize(dto.Opciones) : null;
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"INSERT INTO programas_campos (programa_id, etiqueta, tipo, obligatorio, opciones_json, orden, activo, seccion)
                            VALUES (@pid, @etiqueta, @tipo, @oblig, @opciones, @orden, true, @seccion)
                            RETURNING id, programa_id, etiqueta, tipo, obligatorio, opciones_json, orden, activo, seccion";
        cmd.Parameters.AddWithValue("pid",      programaId);
        cmd.Parameters.AddWithValue("etiqueta", dto.Etiqueta.Trim());
        cmd.Parameters.AddWithValue("tipo",     dto.Tipo);
        cmd.Parameters.AddWithValue("oblig",    dto.Obligatorio);
        cmd.Parameters.AddWithValue("opciones", (object?)opJson ?? DBNull.Value);
        cmd.Parameters.AddWithValue("orden",    dto.Orden);
        cmd.Parameters.AddWithValue("seccion",  string.IsNullOrWhiteSpace(dto.Seccion) ? DBNull.Value : (object)dto.Seccion.Trim());
        await using var r = await cmd.ExecuteReaderAsync();
        await r.ReadAsync();
        return Ok(LeerCampo(r));
    }

    [HttpPut("programas/{programaId:guid}/campos/{campoId:guid}")]
    public async Task<IActionResult> ActualizarCampo(Guid programaId, Guid campoId, [FromBody] CrearCampoDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Seccion))
            return BadRequest(new { mensaje = "La sección del campo es obligatoria." });
        var opJson = dto.Opciones is { Length: > 0 } ? JsonSerializer.Serialize(dto.Opciones) : null;
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"UPDATE programas_campos SET etiqueta=@etiqueta, tipo=@tipo, obligatorio=@oblig, opciones_json=@opciones, orden=@orden, seccion=@seccion
                            WHERE id=@id AND programa_id=@pid
                            RETURNING id, programa_id, etiqueta, tipo, obligatorio, opciones_json, orden, activo, seccion";
        cmd.Parameters.AddWithValue("id",       campoId);
        cmd.Parameters.AddWithValue("pid",      programaId);
        cmd.Parameters.AddWithValue("etiqueta", dto.Etiqueta.Trim());
        cmd.Parameters.AddWithValue("tipo",     dto.Tipo);
        cmd.Parameters.AddWithValue("oblig",    dto.Obligatorio);
        cmd.Parameters.AddWithValue("opciones", (object?)opJson ?? DBNull.Value);
        cmd.Parameters.AddWithValue("orden",    dto.Orden);
        cmd.Parameters.AddWithValue("seccion",  string.IsNullOrWhiteSpace(dto.Seccion) ? DBNull.Value : (object)dto.Seccion.Trim());
        await using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return NotFound();
        return Ok(LeerCampo(r));
    }

    [HttpDelete("programas/{programaId:guid}/campos/{campoId:guid}")]
    public async Task<IActionResult> EliminarCampo(Guid programaId, Guid campoId)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM programas_campos WHERE id=@id AND programa_id=@pid";
        cmd.Parameters.AddWithValue("id",  campoId);
        cmd.Parameters.AddWithValue("pid", programaId);
        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound();
        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private NpgsqlConnection AbrirConexion() =>
        new(_db.Database.GetConnectionString());

    private static CampoDto LeerCampo(System.Data.Common.DbDataReader r)
    {
        var opJson = r.IsDBNull(5) ? null : r.GetString(5);
        return new CampoDto(
            r.GetGuid(0),
            r.GetGuid(1),
            r.GetString(2),
            r.GetString(3),
            r.GetBoolean(4),
            opJson is not null ? JsonSerializer.Deserialize<string[]>(opJson) : null,
            r.GetInt32(6),
            r.GetBoolean(7),
            r.IsDBNull(8) ? null : r.GetString(8)
        );
    }

    private static SedeDto MapearSede(Sede s) => new(
        s.Id, s.Nombre, s.Direccion, s.Ciudad, s.Telefono, s.Activo, s.FechaCreacion,
        s.Programas.Select(p => new ProgramaDto(p.Id, p.SedeId, s.Nombre, p.Nombre, p.Descripcion, p.CupoMaximo, p.Activo, p.FechaCreacion)).ToList()
    );

    private static ProgramaDto MapearPrograma(Programa p) => new(
        p.Id, p.SedeId, p.Sede?.Nombre ?? "", p.Nombre, p.Descripcion, p.CupoMaximo, p.Activo, p.FechaCreacion
    );
}
