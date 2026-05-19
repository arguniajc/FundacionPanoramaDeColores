using FundacionPanorama.API.Filters;
using FundacionPanorama.API.Services;
using FundacionPanorama.Application.Features.Organigrama;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/organigrama")]
[Authorize]
public class OrganigramaController(OrganigramaService svc, SupabaseStorageService storage) : ControllerBase
{
    [HttpGet]
    [RequierePermiso("talento_humano", "ver")]
    public async Task<IActionResult> Listar(CancellationToken ct)
        => Ok(await svc.ListarAsync(ct));

    [HttpPost]
    [RequierePermiso("talento_humano", "crear")]
    public async Task<IActionResult> Crear([FromBody] CrearOrganigramaPersonaDto dto, CancellationToken ct)
        => Ok(await svc.CrearAsync(dto, ct));

    [HttpPut("{id:guid}")]
    [RequierePermiso("talento_humano", "editar")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] ActualizarOrganigramaPersonaDto dto, CancellationToken ct)
    {
        var r = await svc.ActualizarAsync(id, dto, ct);
        return r is null ? NotFound() : Ok(r);
    }

    [HttpDelete("{id:guid}")]
    [RequierePermiso("talento_humano", "eliminar")]
    public async Task<IActionResult> Eliminar(Guid id, CancellationToken ct)
        => await svc.EliminarAsync(id, ct) ? NoContent() : NotFound();

    [HttpPost("{id:guid}/foto")]
    [RequierePermiso("talento_humano", "editar")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> SubirFoto(Guid id, IFormFile foto, CancellationToken ct)
    {
        if (foto is null || foto.Length == 0)
            return BadRequest(new { mensaje = "No se recibió ningún archivo." });

        var tiposOk = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
        if (!tiposOk.Contains(foto.ContentType.ToLower()))
            return BadRequest(new { mensaje = "Solo se permiten imágenes JPG, PNG o WEBP." });

        if (foto.Length > 5 * 1024 * 1024)
            return BadRequest(new { mensaje = "La imagen no puede superar 5 MB." });

        var url = await storage.SubirAsync(foto, "organigrama");
        var result = await svc.ActualizarAsync(id, new ActualizarOrganigramaPersonaDto(null, null, null, null, url, null), ct);
        return result is null ? NotFound() : Ok(new { url });
    }
}
