// CRUD de inscripciones de beneficiarios a programas. Requiere JWT.
using FundacionPanorama.API.Data;
using FundacionPanorama.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FundacionPanorama.API.Controllers;

public record InscripcionDto(
    Guid     Id,
    Guid     BeneficiarioId,
    string   NombreBeneficiario,
    string?  DocumentoBeneficiario,
    Guid     ProgramaId,
    string   NombrePrograma,
    string   NombreSede,
    string   Estado,
    DateTime FechaInscripcion,
    string   Datos,
    string?  Observaciones,
    bool     Activo,
    DateTime FechaCreacion
);

public record CrearInscripcionDto(
    Guid    BeneficiarioId,
    Guid    ProgramaId,
    string  Datos,
    string? Observaciones
);

public record ActualizarInscripcionDto(
    string  Datos,
    string? Observaciones
);

public record CambiarEstadoDto(string Estado);

[ApiController]
[Route("api/inscripciones")]
[Authorize]
public class InscripcionesController : ControllerBase
{
    private readonly AppDbContext _db;
    public InscripcionesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Listar(
        [FromQuery] Guid?   programaId     = null,
        [FromQuery] Guid?   beneficiarioId = null,
        [FromQuery] string? estado         = null,
        [FromQuery] bool    soloActivas    = false)
    {
        var q = _db.Inscripciones
            .Include(i => i.Beneficiario)
            .Include(i => i.Programa).ThenInclude(p => p!.Sede)
            .AsQueryable();

        if (programaId.HasValue)     q = q.Where(i => i.ProgramaId == programaId);
        if (beneficiarioId.HasValue) q = q.Where(i => i.BeneficiarioId == beneficiarioId);
        if (!string.IsNullOrEmpty(estado)) q = q.Where(i => i.Estado == estado);
        if (soloActivas) q = q.Where(i => i.Activo);

        var items = await q.OrderByDescending(i => i.FechaInscripcion).ToListAsync();
        return Ok(items.Select(Mapear));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> ObtenerPorId(Guid id)
    {
        var ins = await _db.Inscripciones
            .Include(i => i.Beneficiario)
            .Include(i => i.Programa).ThenInclude(p => p!.Sede)
            .FirstOrDefaultAsync(i => i.Id == id);
        if (ins is null) return NotFound();
        return Ok(Mapear(ins));
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearInscripcionDto dto)
    {
        var beneficiario = await _db.Beneficiarios.FindAsync(dto.BeneficiarioId);
        if (beneficiario is null) return BadRequest(new { mensaje = "Beneficiario no encontrado." });

        var programa = await _db.Programas.Include(p => p.Sede).FirstOrDefaultAsync(p => p.Id == dto.ProgramaId);
        if (programa is null) return BadRequest(new { mensaje = "Programa no encontrado." });

        var inscripcion = new Inscripcion
        {
            BeneficiarioId = dto.BeneficiarioId,
            ProgramaId     = dto.ProgramaId,
            Estado         = "activa",
            Datos          = dto.Datos,
            Observaciones  = dto.Observaciones?.Trim(),
            Activo         = true,
        };
        _db.Inscripciones.Add(inscripcion);
        await _db.SaveChangesAsync();

        inscripcion.Beneficiario = beneficiario;
        inscripcion.Programa     = programa;
        return Ok(Mapear(inscripcion));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] ActualizarInscripcionDto dto)
    {
        var ins = await _db.Inscripciones
            .Include(i => i.Beneficiario)
            .Include(i => i.Programa).ThenInclude(p => p!.Sede)
            .FirstOrDefaultAsync(i => i.Id == id);
        if (ins is null) return NotFound();

        ins.Datos         = dto.Datos;
        ins.Observaciones = dto.Observaciones?.Trim();
        await _db.SaveChangesAsync();
        return Ok(Mapear(ins));
    }

    [HttpPatch("{id:guid}/estado")]
    public async Task<IActionResult> CambiarEstado(Guid id, [FromBody] CambiarEstadoDto dto)
    {
        var estadosValidos = new[] { "activa", "suspendida", "completada", "baja" };
        if (!estadosValidos.Contains(dto.Estado))
            return BadRequest(new { mensaje = "Estado no válido." });

        var ins = await _db.Inscripciones
            .Include(i => i.Beneficiario)
            .Include(i => i.Programa).ThenInclude(p => p!.Sede)
            .FirstOrDefaultAsync(i => i.Id == id);
        if (ins is null) return NotFound();

        ins.Estado = dto.Estado;
        ins.Activo = dto.Estado == "activa";
        await _db.SaveChangesAsync();
        return Ok(Mapear(ins));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var ins = await _db.Inscripciones.FindAsync(id);
        if (ins is null) return NotFound();
        _db.Inscripciones.Remove(ins);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static InscripcionDto Mapear(Inscripcion i) => new(
        i.Id,
        i.BeneficiarioId,
        i.Beneficiario?.Nombre ?? "",
        i.Beneficiario?.NumeroDocumento,
        i.ProgramaId,
        i.Programa?.Nombre ?? "",
        i.Programa?.Sede?.Nombre ?? "",
        i.Estado,
        i.FechaInscripcion,
        i.Datos,
        i.Observaciones,
        i.Activo,
        i.FechaCreacion
    );
}
