using System.Security.Claims;
using FundacionPanorama.API.Data;
using FundacionPanorama.API.Models;
using FundacionPanorama.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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
    // Recibe un IFormFile "archivo", lo sube a Supabase Storage y devuelve la URL pública.
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

    // POST api/archivos/log-descarga
    [HttpPost("log-descarga")]
    [Authorize]
    public async Task<IActionResult> LogDescarga([FromBody] LogDescargaDto dto)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value
                 ?? User.FindFirst("email")?.Value
                 ?? User.Identity?.Name
                 ?? "desconocido";

        _db.LogDescargas.Add(new LogDescarga
        {
            UsuarioEmail    = email,
            BeneficiarioId  = dto.BeneficiarioId,
            TipoArchivo     = dto.TipoArchivo ?? "documento",
            UrlArchivo      = dto.UrlArchivo,
            DescargadoEn    = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();
        return Ok();
    }
}
