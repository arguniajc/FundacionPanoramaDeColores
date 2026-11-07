// CRUD de inscripciones (Npgsql directo en InscripcionesRepository). Requiere JWT.
using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Inscripciones;
using FundacionPanorama.Application.Features.Inscripciones.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/inscripciones")]
[Authorize]
public class InscripcionesController(InscripcionesService svc) : ControllerBase
{
    [HttpGet]
    [RequierePermiso("inscripciones", "ver")]
    public async Task<IActionResult> Listar(
        [FromQuery] Guid?   programaId     = null,
        [FromQuery] Guid?   beneficiarioId = null,
        [FromQuery] string? estado         = null)
        => Ok(await svc.ListarAsync(programaId, beneficiarioId, estado));

    [HttpGet("{id:guid}")]
    [RequierePermiso("inscripciones", "ver")]
    public async Task<IActionResult> ObtenerPorId(Guid id)
    {
        var insc = await svc.ObtenerAsync(id);
        return insc is null ? NotFound() : Ok(insc);
    }

    [HttpPost]
    [RequierePermiso("inscripciones", "crear")]
    public async Task<IActionResult> Crear([FromBody] CrearInscripcionDto dto)
    {
        if (!InscripcionesService.EsJsonValido(dto.Datos))
            return BadRequest(new { mensaje = "El campo 'datos' no contiene JSON válido." });

        var res = await svc.CrearAsync(dto);
        return res.Error switch
        {
            ErrorCrearInscripcion.BeneficiarioNoEncontrado => BadRequest(new { mensaje = "Beneficiario no encontrado." }),
            ErrorCrearInscripcion.ProgramaNoEncontrado     => BadRequest(new { mensaje = "Programa no encontrado." }),
            ErrorCrearInscripcion.YaInscritoActivo         => Conflict(new { mensaje = "El beneficiario ya está inscrito activamente en este programa." }),
            _                                              => Ok(res.Inscripcion),
        };
    }

    [HttpPut("{id:guid}")]
    [RequierePermiso("inscripciones", "editar")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] ActualizarInscripcionDto dto)
    {
        if (!InscripcionesService.EsJsonValido(dto.Datos))
            return BadRequest(new { mensaje = "El campo 'datos' no contiene JSON válido." });

        var insc = await svc.ActualizarAsync(id, dto);
        return insc is null ? NotFound() : Ok(insc);
    }

    [HttpPatch("{id:guid}/estado")]
    [RequierePermiso("inscripciones", "editar")]
    public async Task<IActionResult> CambiarEstado(Guid id, [FromBody] CambiarEstadoDto dto)
    {
        if (!InscripcionesService.EsEstadoValido(dto.Estado)) return BadRequest(new { mensaje = "Estado no válido." });

        var insc = await svc.CambiarEstadoAsync(id, dto.Estado);
        return insc is null ? NotFound() : Ok(insc);
    }

    [HttpDelete("{id:guid}")]
    [RequierePermiso("inscripciones", "eliminar")]
    public async Task<IActionResult> Eliminar(Guid id)
        => await svc.EliminarAsync(id) ? NoContent() : NotFound();
}
