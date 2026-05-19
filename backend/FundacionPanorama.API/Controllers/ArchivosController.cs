// Sube archivos a Supabase Storage y lleva auditoría de descargas de documentos.
using System.Security.Claims;
using FundacionPanorama.API.Data;
using FundacionPanorama.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FundacionPanorama.API.Controllers;

public record LogDescargaDto(Guid BeneficiarioId, string? TipoArchivo, string? UrlArchivo);

[ApiController]
[Route("api/archivos")]
public class ArchivosController : ControllerBase
{
    private readonly SupabaseStorageService _storage;
    private readonly AppDbContext           _db;

    public ArchivosController(SupabaseStorageService storage, AppDbContext db)
    {
        _storage = storage;
        _db      = db;
    }

    // POST api/archivos/upload?carpeta=fotos
    [HttpPost("upload")]
    [Authorize]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload(
        IFormFile archivo,
        [FromQuery] string carpeta = "fotos")
    {
        if (archivo is null || archivo.Length == 0)
            return BadRequest(new { mensaje = "No se recibió ningún archivo." });

        var tiposPermitidos = new[]
        {
            "image/jpeg", "image/jpg", "image/png",
            "image/webp", "image/heic", "image/heif",
            "application/pdf"
        };

        if (!tiposPermitidos.Contains(archivo.ContentType.ToLower()))
            return BadRequest(new { mensaje = "Solo se permiten imágenes (JPG, PNG, WEBP) o PDF." });

        var esPdf    = archivo.ContentType.ToLower() == "application/pdf";
        long maxBytes = esPdf ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
        if (archivo.Length > maxBytes)
            return BadRequest(new { mensaje = esPdf ? "El PDF no puede superar 10 MB." : "La imagen no puede superar 5 MB." });

        try
        {
            var url = await _storage.SubirAsync(archivo, carpeta);
            return Ok(new { url });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { mensaje = $"Error al subir el archivo: {ex.Message}" });
        }
    }

    // GET api/archivos/log-descargas?pagina=1&porPagina=20
    [HttpGet("log-descargas")]
    [Authorize]
    public async Task<IActionResult> ObtenerLog(
        [FromQuery] int pagina    = 1,
        [FromQuery] int porPagina = 20)
    {
        pagina    = Math.Max(1, pagina);
        porPagina = Math.Clamp(porPagina, 1, 100);

        await using var conn = AbrirConexion();
        await conn.OpenAsync();

        long total;
        await using (var cmdCount = conn.CreateCommand())
        {
            cmdCount.CommandText = "SELECT COUNT(*) FROM log_descargas";
            total = (long)(await cmdCount.ExecuteScalarAsync())!;
        }

        var registros = new List<object>();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT l.id, l.usuario_email, l.beneficiario_id, b.nombre AS nombre_beneficiario,
                   l.tipo_archivo, l.url_archivo, l.descargado_en
            FROM log_descargas l
            JOIN beneficiarios b ON b.id = l.beneficiario_id
            ORDER BY l.descargado_en DESC
            LIMIT @limit OFFSET @offset";
        cmd.Parameters.AddWithValue("limit",  porPagina);
        cmd.Parameters.AddWithValue("offset", (pagina - 1) * porPagina);
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
        {
            registros.Add(new
            {
                Id                 = r.GetGuid(0),
                UsuarioEmail       = r.GetString(1),
                BeneficiarioId     = r.GetGuid(2),
                NombreBeneficiario = r.GetString(3),
                TipoArchivo        = r.IsDBNull(4) ? null : r.GetString(4),
                UrlArchivo         = r.IsDBNull(5) ? null : r.GetString(5),
                DescargadoEn       = r.GetDateTime(6),
            });
        }

        return Ok(new { data = registros, total, pagina, porPagina });
    }

    // POST api/archivos/log-descarga
    [HttpPost("log-descarga")]
    [Authorize]
    public async Task<IActionResult> LogDescarga([FromBody] LogDescargaDto dto)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value
                 ?? User.FindFirst("email")?.Value
                 ?? User.Identity?.Name
                 ?? "desconocido";

        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO log_descargas (usuario_email, beneficiario_id, tipo_archivo, url_archivo, descargado_en)
            VALUES (@email, @bid, @tipo, @url, NOW())";
        cmd.Parameters.AddWithValue("email", email);
        cmd.Parameters.AddWithValue("bid",   dto.BeneficiarioId);
        cmd.Parameters.AddWithValue("tipo",  dto.TipoArchivo ?? "documento");
        cmd.Parameters.AddWithValue("url",   (object?)dto.UrlArchivo ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync();
        return Ok();
    }

    private NpgsqlConnection AbrirConexion() => new(_db.Database.GetConnectionString());
}
