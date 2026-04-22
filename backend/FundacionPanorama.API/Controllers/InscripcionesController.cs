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
        var q = _db.Inscripciones.AsQueryable();
        if (programaId.HasValue)     q = q.Where(i => i.ProgramaId == programaId);
        if (beneficiarioId.HasValue) q = q.Where(i => i.BeneficiarioId == beneficiarioId);
        if (!string.IsNullOrEmpty(estado)) q = q.Where(i => i.Estado == estado);
        if (soloActivas) q = q.Where(i => i.Activo);

        var items = await q.OrderByDescending(i => i.FechaInscripcion).ToListAsync();
        return Ok(await EnriquecerLista(items));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> ObtenerPorId(Guid id)
    {
        var ins = await _db.Inscripciones.FindAsync(id);
        if (ins is null) return NotFound();
        return Ok((await EnriquecerLista([ins]))[0]);
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearInscripcionDto dto)
    {
        if (!await _db.Beneficiarios.AnyAsync(b => b.Id == dto.BeneficiarioId))
            return BadRequest(new { mensaje = "Beneficiario no encontrado." });
        if (!await _db.Programas.AnyAsync(p => p.Id == dto.ProgramaId))
            return BadRequest(new { mensaje = "Programa no encontrado." });

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
        return Ok((await EnriquecerLista([inscripcion]))[0]);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] ActualizarInscripcionDto dto)
    {
        var ins = await _db.Inscripciones.FindAsync(id);
        if (ins is null) return NotFound();
        ins.Datos         = dto.Datos;
        ins.Observaciones = dto.Observaciones?.Trim();
        await _db.SaveChangesAsync();
        return Ok((await EnriquecerLista([ins]))[0]);
    }

    [HttpPatch("{id:guid}/estado")]
    public async Task<IActionResult> CambiarEstado(Guid id, [FromBody] CambiarEstadoDto dto)
    {
        var estadosValidos = new[] { "activa", "suspendida", "completada", "baja" };
        if (!estadosValidos.Contains(dto.Estado))
            return BadRequest(new { mensaje = "Estado no válido." });

        var ins = await _db.Inscripciones.FindAsync(id);
        if (ins is null) return NotFound();
        ins.Estado = dto.Estado;
        ins.Activo = dto.Estado == "activa";
        await _db.SaveChangesAsync();
        return Ok((await EnriquecerLista([ins]))[0]);
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

    // Carga beneficiarios y programas por IDs para evitar navigation properties
    private async Task<List<InscripcionDto>> EnriquecerLista(IEnumerable<Inscripcion> items)
    {
        var lista        = items.ToList();
        var benefIds     = lista.Select(i => i.BeneficiarioId).Distinct().ToList();
        var progIds      = lista.Select(i => i.ProgramaId).Distinct().ToList();

        var beneficiarios = await _db.Beneficiarios
            .Where(b => benefIds.Contains(b.Id))
            .Select(b => new { b.Id, b.Nombre, b.NumeroDocumento })
            .ToListAsync();

        var programas = await _db.Programas
            .Where(p => progIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Nombre, p.SedeId })
            .ToListAsync();

        var sedeIds = programas.Select(p => p.SedeId).Distinct().ToList();
        var sedes   = await _db.Sedes
            .Where(s => sedeIds.Contains(s.Id))
            .Select(s => new { s.Id, s.Nombre })
            .ToListAsync();

        return lista.Select(i =>
        {
            var b = beneficiarios.FirstOrDefault(x => x.Id == i.BeneficiarioId);
            var p = programas.FirstOrDefault(x => x.Id == i.ProgramaId);
            var s = p is not null ? sedes.FirstOrDefault(x => x.Id == p.SedeId) : null;
            return new InscripcionDto(
                i.Id,
                i.BeneficiarioId,
                b?.Nombre ?? "",
                b?.NumeroDocumento,
                i.ProgramaId,
                p?.Nombre ?? "",
                s?.Nombre ?? "",
                i.Estado,
                i.FechaInscripcion,
                i.Datos,
                i.Observaciones,
                i.Activo,
                i.FechaCreacion
            );
        }).ToList();
    }
}
