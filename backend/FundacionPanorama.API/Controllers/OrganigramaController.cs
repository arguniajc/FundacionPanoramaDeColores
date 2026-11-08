using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Organigrama;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/organigrama")]
[Authorize]
// Las fotos se suben con POST /api/archivos/upload?carpeta=organigrama y su URL viaja en Crear/Actualizar.
public class OrganigramaController(OrganigramaService svc) : ControllerBase
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
}
