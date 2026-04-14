using FundacionPanorama.API.Data;
using FundacionPanorama.API.DTOs;
using FundacionPanorama.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InscripcionesController : ControllerBase
{
    private readonly AppDbContext _db;

    public InscripcionesController(AppDbContext db)
    {
        _db = db;
    }

    // GET api/inscripciones?pagina=1&porPagina=10&buscar=nombre&estado=activos|baja|todos
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> Listar(
        [FromQuery] int     pagina    = 1,
        [FromQuery] int     porPagina = 10,
        [FromQuery] string? buscar    = null,
        [FromQuery] string  estado    = "activos")
    {
        var query = _db.Inscripciones.AsQueryable();

        query = estado switch
        {
            "baja"  => query.Where(i => !i.Activo),
            "todos" => query,
            _       => query.Where(i => i.Activo)
        };

        if (!string.IsNullOrWhiteSpace(buscar))
        {
            var texto = buscar.ToLower();
            query = query.Where(i =>
                i.NombreMenor.ToLower().Contains(texto) ||
                (i.NumeroDocumento != null && i.NumeroDocumento.ToLower().Contains(texto)) ||
                i.NombreAcudiente.ToLower().Contains(texto) ||
                (i.Whatsapp != null && i.Whatsapp.Contains(texto)));
        }

        var total = await query.CountAsync();
        var datos = await query
            .OrderByDescending(i => i.CreatedAt)
            .Skip((pagina - 1) * porPagina)
            .Take(porPagina)
            .Select(i => MapearDto(i))
            .ToListAsync();

        return Ok(new InscripcionListDto
        {
            Data      = datos,
            Total     = total,
            Pagina    = pagina,
            PorPagina = porPagina
        });
    }

    // GET api/inscripciones/stats
    [HttpGet("stats")]
    [Authorize]
    public async Task<IActionResult> Stats()
    {
        var items = await _db.Inscripciones
            .Select(i => new
            {
                i.Activo,
                i.FechaNacimiento,
                i.TieneAlergia,
                i.NumeroDocumento,
                i.Eps,
                i.Whatsapp,
                i.Direccion,
                i.TallaCamisa,
                i.TallaPantalon,
                i.TallaZapatos,
                i.FotoMenorUrl,
                i.CreatedAt,
            })
            .ToListAsync();

        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);

        static int? Edad(DateOnly f)
        {
            var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
            int e = hoy.Year - f.Year;
            if (hoy < f.AddYears(e)) e--;
            return e;
        }

        // Rangos de edad
        (string Label, int Min, int Max)[] rangos =
        [
            ("0-3 años",   0,  3),
            ("4-6 años",   4,  6),
            ("7-9 años",   7,  9),
            ("10-12 años", 10, 12),
            ("13-15 años", 13, 15),
            ("16+ años",   16, 99),
        ];

        var porEdad = rangos.ToDictionary(
            r => r.Label,
            r => items.Count(i =>
            {
                var e = Edad(i.FechaNacimiento);
                return e >= r.Min && e <= r.Max;
            }));

        // Inscripciones por mes (últimos 4 meses)
        var porMes = Enumerable.Range(0, 4)
            .Select(k =>
            {
                var d = DateTime.UtcNow.AddMonths(-(3 - k));
                var label = d.ToString("MMM yy", new System.Globalization.CultureInfo("es-CO"));
                var count = items.Count(i =>
                    i.CreatedAt.Month == d.Month && i.CreatedAt.Year == d.Year);
                return (label, count);
            })
            .ToDictionary(x => x.label, x => x.count);

        // Top tallas
        static List<TallaFreq> TopTallas(IEnumerable<string?> valores) =>
            valores
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .GroupBy(v => v!)
                .OrderByDescending(g => g.Count())
                .Take(5)
                .Select(g => new TallaFreq(g.Key, g.Count()))
                .ToList();

        var dto = new InscripcionStatsDto
        {
            Total        = items.Count,
            Activos      = items.Count(i => i.Activo),
            Baja         = items.Count(i => !i.Activo),
            ConAlergia   = items.Count(i => i.TieneAlergia == "si"),
            SinDocumento = items.Count(i => string.IsNullOrWhiteSpace(i.NumeroDocumento)),
            SinEps       = items.Count(i => string.IsNullOrWhiteSpace(i.Eps)),
            SinWhatsapp  = items.Count(i => string.IsNullOrWhiteSpace(i.Whatsapp)),
            SinDireccion = items.Count(i => string.IsNullOrWhiteSpace(i.Direccion)),
            SinTallas    = items.Count(i =>
                string.IsNullOrWhiteSpace(i.TallaCamisa) ||
                string.IsNullOrWhiteSpace(i.TallaPantalon) ||
                string.IsNullOrWhiteSpace(i.TallaZapatos)),
            SinFoto      = items.Count(i => string.IsNullOrWhiteSpace(i.FotoMenorUrl)),
            PorEdad      = porEdad,
            PorMes       = porMes,
            TopCamisa    = TopTallas(items.Select(i => i.TallaCamisa)),
            TopZapatos   = TopTallas(items.Select(i => i.TallaZapatos)),
            TopPantalon  = TopTallas(items.Select(i => i.TallaPantalon)),
        };

        return Ok(dto);
    }

    // GET api/inscripciones/{id}
    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> ObtenerPorId(Guid id)
    {
        var inscripcion = await _db.Inscripciones.FindAsync(id);
        if (inscripcion is null) return NotFound();
        return Ok(MapearDto(inscripcion));
    }

    // GET api/inscripciones/verificar-documento/{numero}
    [HttpGet("verificar-documento/{numero}")]
    public async Task<IActionResult> VerificarDocumento(string numero)
    {
        var existe = await _db.Inscripciones
            .AnyAsync(i => i.NumeroDocumento == numero);
        return Ok(new { existe });
    }

    // POST api/inscripciones
    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearInscripcionDto dto)
    {
        if (!string.IsNullOrWhiteSpace(dto.NumeroDocumento))
        {
            var existe = await _db.Inscripciones
                .AnyAsync(i => i.NumeroDocumento == dto.NumeroDocumento);
            if (existe)
                return Conflict(new { mensaje = "Este número de documento ya está inscrito." });
        }

        var inscripcion = new Inscripcion
        {
            NombreMenor        = dto.NombreMenor,
            FechaNacimiento    = dto.FechaNacimiento,
            TipoDocumento      = dto.TipoDocumento,
            NumeroDocumento    = dto.NumeroDocumento,
            Eps                = dto.Eps,
            TallaCamisa        = dto.TallaCamisa,
            TallaPantalon      = dto.TallaPantalon,
            TallaZapatos       = dto.TallaZapatos,
            TieneAlergia       = dto.TieneAlergia,
            DescripcionAlergia = dto.DescripcionAlergia,
            ObservacionesSalud = dto.ObservacionesSalud,
            NombreAcudiente    = dto.NombreAcudiente,
            Parentesco         = dto.Parentesco,
            Whatsapp           = dto.Whatsapp,
            Direccion          = dto.Direccion,
            FotoMenorUrl       = dto.FotoMenorUrl,
            FotoDocumentoUrl   = dto.FotoDocumentoUrl,
            Activo             = true
        };

        _db.Inscripciones.Add(inscripcion);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(ObtenerPorId), new { id = inscripcion.Id }, MapearDto(inscripcion));
    }

    // PUT api/inscripciones/{id}
    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] CrearInscripcionDto dto)
    {
        var inscripcion = await _db.Inscripciones.FindAsync(id);
        if (inscripcion is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.NumeroDocumento) &&
            dto.NumeroDocumento != inscripcion.NumeroDocumento)
        {
            var existe = await _db.Inscripciones
                .AnyAsync(i => i.NumeroDocumento == dto.NumeroDocumento && i.Id != id);
            if (existe)
                return Conflict(new { mensaje = "Ese número de documento ya está registrado." });
        }

        inscripcion.NombreMenor        = dto.NombreMenor;
        inscripcion.FechaNacimiento    = dto.FechaNacimiento;
        inscripcion.TipoDocumento      = dto.TipoDocumento;
        inscripcion.NumeroDocumento    = dto.NumeroDocumento;
        inscripcion.Eps                = dto.Eps;
        inscripcion.TallaCamisa        = dto.TallaCamisa;
        inscripcion.TallaPantalon      = dto.TallaPantalon;
        inscripcion.TallaZapatos       = dto.TallaZapatos;
        inscripcion.TieneAlergia       = dto.TieneAlergia;
        inscripcion.DescripcionAlergia = dto.DescripcionAlergia;
        inscripcion.ObservacionesSalud = dto.ObservacionesSalud;
        inscripcion.NombreAcudiente    = dto.NombreAcudiente;
        inscripcion.Parentesco         = dto.Parentesco;
        inscripcion.Whatsapp           = dto.Whatsapp;
        inscripcion.Direccion          = dto.Direccion;

        await _db.SaveChangesAsync();
        return Ok(MapearDto(inscripcion));
    }

    // PATCH api/inscripciones/{id}/baja
    [HttpPatch("{id:guid}/baja")]
    [Authorize]
    public async Task<IActionResult> DarDeBaja(Guid id)
    {
        var inscripcion = await _db.Inscripciones.FindAsync(id);
        if (inscripcion is null) return NotFound();

        inscripcion.Activo = false;
        await _db.SaveChangesAsync();
        return Ok(MapearDto(inscripcion));
    }

    // PATCH api/inscripciones/{id}/reactivar
    [HttpPatch("{id:guid}/reactivar")]
    [Authorize]
    public async Task<IActionResult> Reactivar(Guid id)
    {
        var inscripcion = await _db.Inscripciones.FindAsync(id);
        if (inscripcion is null) return NotFound();

        inscripcion.Activo = true;
        await _db.SaveChangesAsync();
        return Ok(MapearDto(inscripcion));
    }

    // DELETE api/inscripciones/{id}
    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var inscripcion = await _db.Inscripciones.FindAsync(id);
        if (inscripcion is null) return NotFound();

        _db.Inscripciones.Remove(inscripcion);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static InscripcionDto MapearDto(Inscripcion i) => new()
    {
        Id                 = i.Id,
        NombreMenor        = i.NombreMenor,
        FechaNacimiento    = i.FechaNacimiento,
        TipoDocumento      = i.TipoDocumento,
        NumeroDocumento    = i.NumeroDocumento,
        Eps                = i.Eps,
        TallaCamisa        = i.TallaCamisa,
        TallaPantalon      = i.TallaPantalon,
        TallaZapatos       = i.TallaZapatos,
        TieneAlergia       = i.TieneAlergia,
        DescripcionAlergia = i.DescripcionAlergia,
        ObservacionesSalud = i.ObservacionesSalud,
        NombreAcudiente    = i.NombreAcudiente,
        Parentesco         = i.Parentesco,
        Whatsapp           = i.Whatsapp,
        Direccion          = i.Direccion,
        FotoMenorUrl       = i.FotoMenorUrl,
        FotoDocumentoUrl   = i.FotoDocumentoUrl,
        CreatedAt          = i.CreatedAt,
        Activo             = i.Activo   // true por defecto si la columna aún no existe
    };
}
