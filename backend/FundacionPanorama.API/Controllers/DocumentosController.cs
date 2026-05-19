// Gestión de documentos: institucionales (tabla propia) y adicionales por beneficiario (tabla archivos).
using System.Security.Claims;
using FundacionPanorama.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FundacionPanorama.API.Controllers;

public record CrearDocumentoDto(
    string Titulo,
    string? Descripcion,
    string Categoria,
    string Url,
    string? NombreOriginal);

public record GuardarArchivoDto(
    string Titulo,
    string Url,
    string? NombreOriginal);

[ApiController]
[Route("api/documentos")]
[Authorize]
public class DocumentosController : ControllerBase
{
    private readonly AppDbContext _db;

    public DocumentosController(AppDbContext db) => _db = db;

    // ── Institucionales ──────────────────────────────────────────────────────

    // GET api/documentos?categoria=Actas
    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] string? categoria)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();

        if (string.IsNullOrWhiteSpace(categoria))
        {
            cmd.CommandText = @"
                SELECT id, titulo, descripcion, categoria, url, nombre_original, subido_por_email, fecha_creacion
                FROM documentos_institucionales
                WHERE activo = true
                ORDER BY fecha_creacion DESC";
        }
        else
        {
            cmd.CommandText = @"
                SELECT id, titulo, descripcion, categoria, url, nombre_original, subido_por_email, fecha_creacion
                FROM documentos_institucionales
                WHERE activo = true AND categoria = @cat
                ORDER BY fecha_creacion DESC";
            cmd.Parameters.AddWithValue("cat", categoria);
        }

        var docs = new List<object>();
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
        {
            docs.Add(new
            {
                Id             = r.GetGuid(0),
                Titulo         = r.GetString(1),
                Descripcion    = r.IsDBNull(2) ? null : r.GetString(2),
                Categoria      = r.GetString(3),
                Url            = r.GetString(4),
                NombreOriginal = r.IsDBNull(5) ? null : r.GetString(5),
                SubidoPorEmail = r.IsDBNull(6) ? null : r.GetString(6),
                FechaCreacion  = r.GetDateTime(7),
            });
        }
        return Ok(docs);
    }

    // POST api/documentos
    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearDocumentoDto dto)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value
                 ?? User.FindFirst("email")?.Value
                 ?? "desconocido";

        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO documentos_institucionales (titulo, descripcion, categoria, url, nombre_original, subido_por_email)
            VALUES (@titulo, @desc, @cat, @url, @nombreOrig, @email)
            RETURNING id";
        cmd.Parameters.AddWithValue("titulo",     dto.Titulo.Trim());
        cmd.Parameters.AddWithValue("desc",       (object?)dto.Descripcion?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("cat",        dto.Categoria);
        cmd.Parameters.AddWithValue("url",        dto.Url);
        cmd.Parameters.AddWithValue("nombreOrig", (object?)dto.NombreOriginal ?? DBNull.Value);
        cmd.Parameters.AddWithValue("email",      email);
        var id = (Guid)(await cmd.ExecuteScalarAsync())!;
        return Ok(new { Id = id });
    }

    // DELETE api/documentos/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            UPDATE documentos_institucionales
            SET activo = false, fecha_modificacion = NOW()
            WHERE id = @id AND activo = true";
        cmd.Parameters.AddWithValue("id", id);
        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound();
        return Ok();
    }

    // ── Por beneficiario (tabla archivos) ────────────────────────────────────

    // GET api/documentos/beneficiario/{id}
    [HttpGet("beneficiario/{beneficiarioId:guid}")]
    public async Task<IActionResult> ListarPorBeneficiario(Guid beneficiarioId)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT id, url, nombre_original, fecha_creacion
            FROM archivos
            WHERE entidad_tipo = 'beneficiario' AND entidad_id = @bid AND activo = true
            ORDER BY fecha_creacion DESC";
        cmd.Parameters.AddWithValue("bid", beneficiarioId);
        var archivos = new List<object>();
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
        {
            archivos.Add(new
            {
                Id             = r.GetGuid(0),
                Url            = r.GetString(1),
                NombreOriginal = r.IsDBNull(2) ? null : r.GetString(2),
                FechaCreacion  = r.GetDateTime(3),
            });
        }
        return Ok(archivos);
    }

    // POST api/documentos/beneficiario/{id}
    [HttpPost("beneficiario/{beneficiarioId:guid}")]
    public async Task<IActionResult> GuardarArchivoBeneficiario(
        Guid beneficiarioId, [FromBody] GuardarArchivoDto dto)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();

        await using (var cmdCheck = conn.CreateCommand())
        {
            cmdCheck.CommandText = "SELECT EXISTS(SELECT 1 FROM beneficiarios WHERE id = @id AND activo = true)";
            cmdCheck.Parameters.AddWithValue("id", beneficiarioId);
            var existe = (bool)(await cmdCheck.ExecuteScalarAsync())!;
            if (!existe) return NotFound(new { mensaje = "Beneficiario no encontrado." });
        }

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO archivos (entidad_tipo, entidad_id, url, nombre_original)
            VALUES ('beneficiario', @bid, @url, @nombreOrig)
            RETURNING id";
        cmd.Parameters.AddWithValue("bid",      beneficiarioId);
        cmd.Parameters.AddWithValue("url",      dto.Url);
        cmd.Parameters.AddWithValue("nombreOrig", (object?)(dto.NombreOriginal ?? dto.Titulo) ?? DBNull.Value);
        var id = (Guid)(await cmd.ExecuteScalarAsync())!;
        return Ok(new { Id = id });
    }

    // DELETE api/documentos/archivo/{id}
    [HttpDelete("archivo/{id:guid}")]
    public async Task<IActionResult> EliminarArchivo(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            UPDATE archivos
            SET activo = false, fecha_modificacion = NOW()
            WHERE id = @id AND activo = true";
        cmd.Parameters.AddWithValue("id", id);
        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound();
        return Ok();
    }

    private NpgsqlConnection AbrirConexion() => new(_db.Database.GetConnectionString());
}
