// Gestión de documentos: institucionales (tabla propia) y adicionales por beneficiario (tabla archivos).
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FundacionPanorama.API.Filters;
using FundacionPanorama.API.Services;
using Microsoft.Extensions.Options;
using FundacionPanorama.Application.Features.Documentos;
using FundacionPanorama.Application.Features.Documentos.DTOs;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/documentos")]
[Authorize]
public class DocumentosController(DocumentosService svc, IOptions<SupabaseOptions> supabase) : ControllerBase
{
    // Enlaces https permitidos: solo los públicos del propio Supabase (el resto debe ser "privado://…")
    string? OrigenPublico => string.IsNullOrWhiteSpace(supabase.Value.Url)
        ? null
        : $"{supabase.Value.Url}/storage/v1/object/public/"; // igual que SupabaseStorageService.PrefijoPublico

    // ── Institucionales ──────────────────────────────────────────────────────

    // GET api/documentos?categoria=Actas
    [HttpGet]
    [RequierePermiso("documentos", "ver")]
    public async Task<IActionResult> Listar([FromQuery] string? categoria)
        => Ok(await svc.ListarAsync(categoria));

    // POST api/documentos
    [HttpPost]
    [RequierePermiso("documentos", "crear")]
    public async Task<IActionResult> Crear([FromBody] CrearDocumentoDto dto)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value
                 ?? User.FindFirst("email")?.Value
                 ?? "desconocido";

        var id = await svc.CrearAsync(dto, email, OrigenPublico);
        return Ok(new { Id = id });
    }

    // DELETE api/documentos/{id}
    [HttpDelete("{id:guid}")]
    [RequierePermiso("documentos", "eliminar")]
    public async Task<IActionResult> Eliminar(Guid id)
        => await svc.EliminarAsync(id) ? Ok() : NotFound();

    // ── Por beneficiario (tabla archivos) ────────────────────────────────────

    // GET api/documentos/beneficiario/{id}
    [HttpGet("beneficiario/{beneficiarioId:guid}")]
    [RequierePermiso("beneficiarios", "ver")]
    public async Task<IActionResult> ListarPorBeneficiario(Guid beneficiarioId)
        => Ok(await svc.ListarPorBeneficiarioAsync(beneficiarioId));

    // POST api/documentos/beneficiario/{id}
    [HttpPost("beneficiario/{beneficiarioId:guid}")]
    [RequierePermiso("documentos", "crear")]
    public async Task<IActionResult> GuardarArchivoBeneficiario(
        Guid beneficiarioId, [FromBody] GuardarArchivoDto dto)
    {
        var id = await svc.GuardarArchivoBeneficiarioAsync(beneficiarioId, dto, OrigenPublico);
        if (id is null) return NotFound(new { mensaje = "Beneficiario no encontrado." });
        return Ok(new { Id = id.Value });
    }

    // DELETE api/documentos/archivo/{id}
    [HttpDelete("archivo/{id:guid}")]
    [RequierePermiso("documentos", "eliminar")]
    public async Task<IActionResult> EliminarArchivo(Guid id)
        => await svc.EliminarArchivoAsync(id) ? Ok() : NotFound();
}
