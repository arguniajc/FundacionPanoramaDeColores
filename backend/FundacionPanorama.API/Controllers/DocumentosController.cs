// Gestión de documentos: institucionales (tabla propia) y adicionales por beneficiario (tabla archivos).
using System.Security.Claims;
using FundacionPanorama.API.Data;
using FundacionPanorama.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
        var q = _db.DocumentosInstitucionales
            .Where(d => d.Activo);

        if (!string.IsNullOrWhiteSpace(categoria))
            q = q.Where(d => d.Categoria == categoria);

        var docs = await q
            .OrderByDescending(d => d.FechaCreacion)
            .Select(d => new
            {
                d.Id, d.Titulo, d.Descripcion, d.Categoria,
                d.Url, d.NombreOriginal, d.SubidoPorEmail, d.FechaCreacion
            })
            .ToListAsync();

        return Ok(docs);
    }

    // POST api/documentos
    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearDocumentoDto dto)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value
                 ?? User.FindFirst("email")?.Value
                 ?? "desconocido";

        var doc = new DocumentoInstitucional
        {
            Titulo         = dto.Titulo.Trim(),
            Descripcion    = dto.Descripcion?.Trim(),
            Categoria      = dto.Categoria,
            Url            = dto.Url,
            NombreOriginal = dto.NombreOriginal,
            SubidoPorEmail = email,
        };

        _db.DocumentosInstitucionales.Add(doc);
        await _db.SaveChangesAsync();
        return Ok(new { doc.Id });
    }

    // DELETE api/documentos/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var doc = await _db.DocumentosInstitucionales.FindAsync(id);
        if (doc is null || !doc.Activo) return NotFound();

        doc.Activo            = false;
        doc.FechaModificacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ── Por beneficiario (tabla archivos) ────────────────────────────────────

    // GET api/documentos/beneficiario/{id}
    [HttpGet("beneficiario/{beneficiarioId:guid}")]
    public async Task<IActionResult> ListarPorBeneficiario(Guid beneficiarioId)
    {
        var archivos = await _db.Archivos
            .Where(a => a.EntidadTipo == "beneficiario"
                     && a.EntidadId   == beneficiarioId
                     && a.Activo)
            .OrderByDescending(a => a.FechaCreacion)
            .Select(a => new
            {
                a.Id, a.Url, a.NombreOriginal, a.FechaCreacion
            })
            .ToListAsync();

        return Ok(archivos);
    }

    // POST api/documentos/beneficiario/{id}
    [HttpPost("beneficiario/{beneficiarioId:guid}")]
    public async Task<IActionResult> GuardarArchivoBeneficiario(
        Guid beneficiarioId, [FromBody] GuardarArchivoDto dto)
    {
        var existe = await _db.Beneficiarios.AnyAsync(b => b.Id == beneficiarioId && b.Activo);
        if (!existe) return NotFound(new { mensaje = "Beneficiario no encontrado." });

        var archivo = new Archivo
        {
            EntidadTipo    = "beneficiario",
            EntidadId      = beneficiarioId,
            Url            = dto.Url,
            NombreOriginal = dto.NombreOriginal ?? dto.Titulo,
        };

        _db.Archivos.Add(archivo);
        await _db.SaveChangesAsync();
        return Ok(new { archivo.Id });
    }

    // DELETE api/documentos/archivo/{id}
    [HttpDelete("archivo/{id:guid}")]
    public async Task<IActionResult> EliminarArchivo(Guid id)
    {
        var archivo = await _db.Archivos.FindAsync(id);
        if (archivo is null || !archivo.Activo) return NotFound();

        archivo.Activo            = false;
        archivo.FechaModificacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok();
    }
}
