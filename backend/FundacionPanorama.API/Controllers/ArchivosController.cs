using FundacionPanorama.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/archivos")]
public class ArchivosController : ControllerBase
{
    private readonly SupabaseStorageService _storage;

    public ArchivosController(SupabaseStorageService storage) => _storage = storage;

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
}
