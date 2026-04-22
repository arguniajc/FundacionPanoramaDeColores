// CRUD de sedes (ubicaciones físicas), programas y campos dinámicos de programas. Requiere JWT.
using System.Text.Json;
using FundacionPanorama.API.Data;
using FundacionPanorama.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FundacionPanorama.API.Controllers;

// DTOs de entrada y salida
public record SedeDto(Guid Id, string Nombre, string? Direccion, string? Ciudad, string? Telefono, bool Activo, DateTime FechaCreacion, List<ProgramaDto> Programas);
public record ProgramaDto(Guid Id, Guid SedeId, string NombreSede, string Nombre, string? Descripcion, int? CupoMaximo, bool Activo, DateTime FechaCreacion);
public record CrearSedeDto(string Nombre, string? Direccion, string? Ciudad, string? Telefono);
public record CrearProgramaDto(Guid SedeId, string Nombre, string? Descripcion, int? CupoMaximo);
public record CampoDto(Guid Id, Guid ProgramaId, string Etiqueta, string Tipo, bool Obligatorio, string[]? Opciones, int Orden, bool Activo);
public record CrearCampoDto(string Etiqueta, string Tipo, bool Obligatorio, string[]? Opciones, int Orden);

[ApiController]
[Route("api/sedes")]
[Authorize]
public class SedesController : ControllerBase
{
    private readonly AppDbContext _db;
    public SedesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] bool soloActivas = false)
    {
        var query = _db.Sedes.Include(s => s.Programas).AsQueryable();
        if (soloActivas) query = query.Where(s => s.Activo);

        var sedes = await query.OrderBy(s => s.Nombre).ToListAsync();
        return Ok(sedes.Select(MapearSede));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> ObtenerPorId(Guid id)
    {
        var s = await _db.Sedes.Include(s => s.Programas).FirstOrDefaultAsync(s => s.Id == id);
        if (s is null) return NotFound();
        return Ok(MapearSede(s));
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearSedeDto dto)
    {
        var sede = new Sede
        {
            Nombre    = dto.Nombre.Trim(),
            Direccion = dto.Direccion?.Trim(),
            Ciudad    = dto.Ciudad?.Trim(),
            Telefono  = dto.Telefono?.Trim(),
            Activo    = true
        };
        _db.Sedes.Add(sede);
        await _db.SaveChangesAsync();
        await _db.Entry(sede).Collection(s => s.Programas).LoadAsync();
        return CreatedAtAction(nameof(ObtenerPorId), new { id = sede.Id }, MapearSede(sede));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] CrearSedeDto dto)
    {
        var sede = await _db.Sedes.Include(s => s.Programas).FirstOrDefaultAsync(s => s.Id == id);
        if (sede is null) return NotFound();
        sede.Nombre    = dto.Nombre.Trim();
        sede.Direccion = dto.Direccion?.Trim();
        sede.Ciudad    = dto.Ciudad?.Trim();
        sede.Telefono  = dto.Telefono?.Trim();
        await _db.SaveChangesAsync();
        return Ok(MapearSede(sede));
    }

    [HttpPatch("{id:guid}/toggle")]
    public async Task<IActionResult> Toggle(Guid id)
    {
        var sede = await _db.Sedes.Include(s => s.Programas).FirstOrDefaultAsync(s => s.Id == id);
        if (sede is null) return NotFound();
        sede.Activo = !sede.Activo;
        await _db.SaveChangesAsync();
        return Ok(MapearSede(sede));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var sede = await _db.Sedes.FindAsync(id);
        if (sede is null) return NotFound();
        _db.Sedes.Remove(sede);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Programas ─────────────────────────────────────────────────────────────

    [HttpGet("{sedeId:guid}/programas")]
    public async Task<IActionResult> ListarProgramas(Guid sedeId)
    {
        var programas = await _db.Programas
            .Include(p => p.Sede)
            .Where(p => p.SedeId == sedeId)
            .OrderBy(p => p.Nombre)
            .ToListAsync();
        return Ok(programas.Select(MapearPrograma));
    }

    [HttpPost("programas")]
    public async Task<IActionResult> CrearPrograma([FromBody] CrearProgramaDto dto)
    {
        var sedeExiste = await _db.Sedes.AnyAsync(s => s.Id == dto.SedeId);
        if (!sedeExiste) return BadRequest(new { mensaje = "Sede no encontrada." });

        var programa = new Programa
        {
            SedeId      = dto.SedeId,
            Nombre      = dto.Nombre.Trim(),
            Descripcion = dto.Descripcion?.Trim(),
            CupoMaximo  = dto.CupoMaximo,
            Activo      = true
        };
        _db.Programas.Add(programa);
        await _db.SaveChangesAsync();
        await _db.Entry(programa).Reference(p => p.Sede).LoadAsync();
        return Ok(MapearPrograma(programa));
    }

    [HttpPut("programas/{id:guid}")]
    public async Task<IActionResult> ActualizarPrograma(Guid id, [FromBody] CrearProgramaDto dto)
    {
        var programa = await _db.Programas.Include(p => p.Sede).FirstOrDefaultAsync(p => p.Id == id);
        if (programa is null) return NotFound();
        programa.SedeId      = dto.SedeId;
        programa.Nombre      = dto.Nombre.Trim();
        programa.Descripcion = dto.Descripcion?.Trim();
        programa.CupoMaximo  = dto.CupoMaximo;
        await _db.SaveChangesAsync();
        return Ok(MapearPrograma(programa));
    }

    [HttpPatch("programas/{id:guid}/toggle")]
    public async Task<IActionResult> TogglePrograma(Guid id)
    {
        var programa = await _db.Programas.Include(p => p.Sede).FirstOrDefaultAsync(p => p.Id == id);
        if (programa is null) return NotFound();
        programa.Activo = !programa.Activo;
        await _db.SaveChangesAsync();
        return Ok(MapearPrograma(programa));
    }

    [HttpDelete("programas/{id:guid}")]
    public async Task<IActionResult> EliminarPrograma(Guid id)
    {
        var programa = await _db.Programas.FindAsync(id);
        if (programa is null) return NotFound();
        _db.Programas.Remove(programa);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Campos dinámicos de programa ──────────────────────────────────────────

    [HttpGet("programas/{programaId:guid}/campos")]
    public async Task<IActionResult> ListarCampos(Guid programaId)
    {
        var campos = await _db.ProgramasCampos
            .Where(c => c.ProgramaId == programaId && c.Activo)
            .OrderBy(c => c.Orden)
            .ToListAsync();
        return Ok(campos.Select(MapearCampo));
    }

    [HttpPost("programas/{programaId:guid}/campos")]
    public async Task<IActionResult> CrearCampo(Guid programaId, [FromBody] CrearCampoDto dto)
    {
        if (!await _db.Programas.AnyAsync(p => p.Id == programaId))
            return NotFound(new { mensaje = "Programa no encontrado." });

        var campo = new ProgramaCampo
        {
            ProgramaId   = programaId,
            Etiqueta     = dto.Etiqueta.Trim(),
            Tipo         = dto.Tipo,
            Obligatorio  = dto.Obligatorio,
            OpcionesJson = dto.Opciones is { Length: > 0 } ? JsonSerializer.Serialize(dto.Opciones) : null,
            Orden        = dto.Orden,
            Activo       = true,
        };
        _db.ProgramasCampos.Add(campo);
        await _db.SaveChangesAsync();
        return Ok(MapearCampo(campo));
    }

    [HttpPut("programas/{programaId:guid}/campos/{campoId:guid}")]
    public async Task<IActionResult> ActualizarCampo(Guid programaId, Guid campoId, [FromBody] CrearCampoDto dto)
    {
        var campo = await _db.ProgramasCampos
            .FirstOrDefaultAsync(c => c.Id == campoId && c.ProgramaId == programaId);
        if (campo is null) return NotFound();

        campo.Etiqueta     = dto.Etiqueta.Trim();
        campo.Tipo         = dto.Tipo;
        campo.Obligatorio  = dto.Obligatorio;
        campo.OpcionesJson = dto.Opciones is { Length: > 0 } ? JsonSerializer.Serialize(dto.Opciones) : null;
        campo.Orden        = dto.Orden;
        await _db.SaveChangesAsync();
        return Ok(MapearCampo(campo));
    }

    [HttpDelete("programas/{programaId:guid}/campos/{campoId:guid}")]
    public async Task<IActionResult> EliminarCampo(Guid programaId, Guid campoId)
    {
        var campo = await _db.ProgramasCampos
            .FirstOrDefaultAsync(c => c.Id == campoId && c.ProgramaId == programaId);
        if (campo is null) return NotFound();
        _db.ProgramasCampos.Remove(campo);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static SedeDto MapearSede(Sede s) => new(
        s.Id, s.Nombre, s.Direccion, s.Ciudad, s.Telefono, s.Activo, s.FechaCreacion,
        s.Programas.Select(p => new ProgramaDto(p.Id, p.SedeId, s.Nombre, p.Nombre, p.Descripcion, p.CupoMaximo, p.Activo, p.FechaCreacion)).ToList()
    );

    private static ProgramaDto MapearPrograma(Programa p) => new(
        p.Id, p.SedeId, p.Sede?.Nombre ?? "", p.Nombre, p.Descripcion, p.CupoMaximo, p.Activo, p.FechaCreacion
    );

    private static CampoDto MapearCampo(ProgramaCampo c) => new(
        c.Id, c.ProgramaId, c.Etiqueta, c.Tipo, c.Obligatorio,
        c.OpcionesJson is not null ? JsonSerializer.Deserialize<string[]>(c.OpcionesJson) : null,
        c.Orden, c.Activo
    );
}
