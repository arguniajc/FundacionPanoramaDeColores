using FundacionPanorama.API.Data;
using FundacionPanorama.API.DTOs;
using FundacionPanorama.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/beneficiarios")]
public class BeneficiariosController : ControllerBase
{
    private readonly AppDbContext _db;

    public BeneficiariosController(AppDbContext db) => _db = db;

    // =========================================================================
    // GET api/beneficiarios?pagina=1&porPagina=10&buscar=...&estado=activos|baja|todos
    // =========================================================================
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> Listar(
        [FromQuery] int     pagina    = 1,
        [FromQuery] int     porPagina = 10,
        [FromQuery] string? buscar    = null,
        [FromQuery] string  estado    = "activos")
    {
        var query = _db.Beneficiarios.AsQueryable();

        query = estado switch
        {
            "baja"  => query.Where(b => !b.Activo),
            "todos" => query,
            _       => query.Where(b => b.Activo)
        };

        if (!string.IsNullOrWhiteSpace(buscar))
        {
            var t = buscar.ToLower();
            query = query.Where(b =>
                b.Nombre.ToLower().Contains(t) ||
                (b.NumeroDocumento != null && b.NumeroDocumento.ToLower().Contains(t)) ||
                b.BeneficiarioAcudientes.Any(ba =>
                    ba.Acudiente != null && ba.Acudiente.Nombre.ToLower().Contains(t)) ||
                b.BeneficiarioAcudientes.Any(ba =>
                    ba.Acudiente != null && ba.Acudiente.Whatsapp != null &&
                    ba.Acudiente.Whatsapp.Contains(t)));
        }

        var total = await query.CountAsync();

        var ids = await query
            .OrderByDescending(b => b.FechaCreacion)
            .Skip((pagina - 1) * porPagina)
            .Take(porPagina)
            .Select(b => b.Id)
            .ToListAsync();

        var beneficiarios = await _db.Beneficiarios
            .Where(b => ids.Contains(b.Id))
            .Include(b => b.TipoDocumento)
            .Include(b => b.Salud).ThenInclude(s => s!.Eps)
            .Include(b => b.BeneficiarioAcudientes)
                .ThenInclude(ba => ba.Acudiente)
            .Include(b => b.BeneficiarioAcudientes)
                .ThenInclude(ba => ba.Parentesco)
            .Include(b => b.Tallas)
            .Include(b => b.Alergias)
            .ToListAsync();

        // Preservar orden original de ids
        beneficiarios = ids.Select(id => beneficiarios.First(b => b.Id == id)).ToList();

        // Cargar archivos en lote para los ids de la página
        var archivos = await _db.Archivos
            .Where(a => a.EntidadTipo == "beneficiario" && ids.Contains(a.EntidadId) && a.Activo)
            .Include(a => a.TipoArchivo)
            .ToListAsync();

        var datos = beneficiarios
            .Select(b => MapearDto(b, archivos.Where(a => a.EntidadId == b.Id).ToList()))
            .ToList();

        return Ok(new BeneficiarioListDto
        {
            Data      = datos,
            Total     = total,
            Pagina    = pagina,
            PorPagina = porPagina
        });
    }

    // =========================================================================
    // GET api/beneficiarios/stats
    // =========================================================================
    [HttpGet("stats")]
    [Authorize]
    public async Task<IActionResult> Stats()
    {
        var beneficiarios = await _db.Beneficiarios
            .Include(b => b.Salud)
            .Include(b => b.BeneficiarioAcudientes).ThenInclude(ba => ba.Acudiente)
            .Include(b => b.Tallas)
            .Include(b => b.Alergias)
            .ToListAsync();

        var idsActivos = beneficiarios.Select(b => b.Id).ToList();

        var archivos = await _db.Archivos
            .Where(a => a.EntidadTipo == "beneficiario" && idsActivos.Contains(a.EntidadId)
                        && a.Activo && a.TipoArchivo!.Nombre == "Foto del menor")
            .Select(a => a.EntidadId)
            .ToListAsync();

        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);

        static int? Edad(DateOnly? f)
        {
            if (f is null) return null;
            var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
            int e = hoy.Year - f.Value.Year;
            if (hoy < f.Value.AddYears(e)) e--;
            return e;
        }

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
            r => beneficiarios.Count(b =>
            {
                var e = Edad(b.FechaNacimiento);
                return e is not null && e >= r.Min && e <= r.Max;
            }));

        var porMes = Enumerable.Range(0, 4)
            .Select(k =>
            {
                var d     = DateTime.UtcNow.AddMonths(-(3 - k));
                var label = d.ToString("MMM yy", new System.Globalization.CultureInfo("es-CO"));
                var count = beneficiarios.Count(b =>
                    b.FechaCreacion.Month == d.Month && b.FechaCreacion.Year == d.Year);
                return (label, count);
            })
            .ToDictionary(x => x.label, x => x.count);

        static List<TallaFreq> TopTallas(IEnumerable<string?> valores) =>
            valores
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .GroupBy(v => v!)
                .OrderByDescending(g => g.Count())
                .Take(5)
                .Select(g => new TallaFreq(g.Key, g.Count()))
                .ToList();

        var ultimasTallas = beneficiarios
            .Select(b => b.Tallas.OrderByDescending(t => t.FechaMedicion).FirstOrDefault(t => t.Activo))
            .ToList();

        var dto = new BeneficiarioStatsDto
        {
            Total        = beneficiarios.Count,
            Activos      = beneficiarios.Count(b => b.Activo),
            Baja         = beneficiarios.Count(b => !b.Activo),
            ConAlergia   = beneficiarios.Count(b => b.Alergias.Any(a => a.Activo)),
            SinDocumento = beneficiarios.Count(b => string.IsNullOrWhiteSpace(b.NumeroDocumento)),
            SinEps       = beneficiarios.Count(b => b.Salud?.EpsId is null),
            SinWhatsapp  = beneficiarios.Count(b =>
                !b.BeneficiarioAcudientes.Any(ba => ba.EsPrincipal && ba.Activo &&
                    !string.IsNullOrWhiteSpace(ba.Acudiente?.Whatsapp))),
            SinDireccion = beneficiarios.Count(b =>
                !b.BeneficiarioAcudientes.Any(ba => ba.EsPrincipal && ba.Activo &&
                    !string.IsNullOrWhiteSpace(ba.Acudiente?.Direccion))),
            SinTallas    = beneficiarios.Count(b => !b.Tallas.Any(t => t.Activo)),
            SinFoto      = beneficiarios.Count(b => !archivos.Contains(b.Id)),
            PorEdad      = porEdad,
            PorMes       = porMes,
            TopCamisa    = TopTallas(ultimasTallas.Select(t => t?.TallaCamisa)),
            TopZapatos   = TopTallas(ultimasTallas.Select(t => t?.TallaZapatos)),
            TopPantalon  = TopTallas(ultimasTallas.Select(t => t?.TallaPantalon)),
        };

        return Ok(dto);
    }

    // =========================================================================
    // GET api/beneficiarios/{id}
    // =========================================================================
    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> ObtenerPorId(Guid id)
    {
        var b = await CargarCompleto(id);
        if (b is null) return NotFound();

        var archivos = await _db.Archivos
            .Where(a => a.EntidadTipo == "beneficiario" && a.EntidadId == id && a.Activo)
            .Include(a => a.TipoArchivo)
            .ToListAsync();

        return Ok(MapearDto(b, archivos));
    }

    // =========================================================================
    // GET api/beneficiarios/verificar-documento/{numero}
    // =========================================================================
    [HttpGet("verificar-documento/{numero}")]
    public async Task<IActionResult> VerificarDocumento(string numero)
    {
        var existe = await _db.Beneficiarios.AnyAsync(b => b.NumeroDocumento == numero);
        return Ok(new { existe });
    }

    // =========================================================================
    // POST api/beneficiarios
    // =========================================================================
    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearBeneficiarioDto dto)
    {
        if (!string.IsNullOrWhiteSpace(dto.NumeroDocumento))
        {
            if (await _db.Beneficiarios.AnyAsync(b => b.NumeroDocumento == dto.NumeroDocumento))
                return Conflict(new { mensaje = "Este número de documento ya está inscrito." });
        }

        var tipoDocId = await ResolverTipoDocumentoId(dto.TipoDocumento);
        var epsId     = await ResolverEpsId(dto.Eps);

        var beneficiario = new Beneficiario
        {
            Nombre          = dto.NombreMenor.Trim(),
            FechaNacimiento = dto.FechaNacimiento,
            TipoDocumentoId = tipoDocId,
            NumeroDocumento = string.IsNullOrWhiteSpace(dto.NumeroDocumento) ? null : dto.NumeroDocumento.Trim(),
            Activo          = true
        };
        _db.Beneficiarios.Add(beneficiario);
        await _db.SaveChangesAsync();

        await CrearOActualizarDependientes(beneficiario.Id, dto, epsId, isNew: true);
        await _db.SaveChangesAsync();

        var creado = await CargarCompleto(beneficiario.Id);
        var archivos = await _db.Archivos
            .Where(a => a.EntidadTipo == "beneficiario" && a.EntidadId == beneficiario.Id && a.Activo)
            .Include(a => a.TipoArchivo)
            .ToListAsync();

        return CreatedAtAction(nameof(ObtenerPorId), new { id = beneficiario.Id }, MapearDto(creado!, archivos));
    }

    // =========================================================================
    // PUT api/beneficiarios/{id}
    // =========================================================================
    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] CrearBeneficiarioDto dto)
    {
        var beneficiario = await _db.Beneficiarios.FindAsync(id);
        if (beneficiario is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.NumeroDocumento) &&
            dto.NumeroDocumento != beneficiario.NumeroDocumento)
        {
            if (await _db.Beneficiarios.AnyAsync(b => b.NumeroDocumento == dto.NumeroDocumento && b.Id != id))
                return Conflict(new { mensaje = "Ese número de documento ya está registrado." });
        }

        var tipoDocId = await ResolverTipoDocumentoId(dto.TipoDocumento);
        var epsId     = await ResolverEpsId(dto.Eps);

        beneficiario.Nombre          = dto.NombreMenor.Trim();
        beneficiario.FechaNacimiento = dto.FechaNacimiento;
        beneficiario.TipoDocumentoId = tipoDocId;
        beneficiario.NumeroDocumento = string.IsNullOrWhiteSpace(dto.NumeroDocumento) ? null : dto.NumeroDocumento.Trim();

        await CrearOActualizarDependientes(id, dto, epsId, isNew: false);
        await _db.SaveChangesAsync();

        var actualizado = await CargarCompleto(id);
        var archivos = await _db.Archivos
            .Where(a => a.EntidadTipo == "beneficiario" && a.EntidadId == id && a.Activo)
            .Include(a => a.TipoArchivo)
            .ToListAsync();

        return Ok(MapearDto(actualizado!, archivos));
    }

    // =========================================================================
    // PATCH api/beneficiarios/{id}/baja
    // =========================================================================
    [HttpPatch("{id:guid}/baja")]
    [Authorize]
    public async Task<IActionResult> DarDeBaja(Guid id)
    {
        var b = await _db.Beneficiarios.FindAsync(id);
        if (b is null) return NotFound();
        b.Activo = false;
        await _db.SaveChangesAsync();

        var cargado  = await CargarCompleto(id);
        var archivos = await _db.Archivos
            .Where(a => a.EntidadTipo == "beneficiario" && a.EntidadId == id && a.Activo)
            .Include(a => a.TipoArchivo).ToListAsync();
        return Ok(MapearDto(cargado!, archivos));
    }

    // =========================================================================
    // PATCH api/beneficiarios/{id}/reactivar
    // =========================================================================
    [HttpPatch("{id:guid}/reactivar")]
    [Authorize]
    public async Task<IActionResult> Reactivar(Guid id)
    {
        var b = await _db.Beneficiarios.FindAsync(id);
        if (b is null) return NotFound();
        b.Activo = true;
        await _db.SaveChangesAsync();

        var cargado  = await CargarCompleto(id);
        var archivos = await _db.Archivos
            .Where(a => a.EntidadTipo == "beneficiario" && a.EntidadId == id && a.Activo)
            .Include(a => a.TipoArchivo).ToListAsync();
        return Ok(MapearDto(cargado!, archivos));
    }

    // =========================================================================
    // DELETE api/beneficiarios/{id}
    // =========================================================================
    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var b = await _db.Beneficiarios.FindAsync(id);
        if (b is null) return NotFound();
        _db.Beneficiarios.Remove(b);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // =========================================================================
    // HELPERS PRIVADOS
    // =========================================================================

    private async Task<Beneficiario?> CargarCompleto(Guid id) =>
        await _db.Beneficiarios
            .Include(b => b.TipoDocumento)
            .Include(b => b.Salud).ThenInclude(s => s!.Eps)
            .Include(b => b.BeneficiarioAcudientes).ThenInclude(ba => ba.Acudiente)
            .Include(b => b.BeneficiarioAcudientes).ThenInclude(ba => ba.Parentesco)
            .Include(b => b.Tallas)
            .Include(b => b.Alergias)
            .FirstOrDefaultAsync(b => b.Id == id);

    private async Task<short?> ResolverTipoDocumentoId(string codigo)
    {
        if (string.IsNullOrWhiteSpace(codigo)) return null;
        return await _db.CatTiposDocumento
            .Where(td => td.Codigo.ToUpper() == codigo.ToUpper().Trim())
            .Select(td => (short?)td.Id)
            .FirstOrDefaultAsync();
    }

    private async Task<short?> ResolverEpsId(string? nombre)
    {
        if (string.IsNullOrWhiteSpace(nombre)) return null;

        var nombreTrim = nombre.Trim();
        var eps = await _db.CatEps
            .FirstOrDefaultAsync(e => e.Nombre.ToLower() == nombreTrim.ToLower());

        if (eps is not null) return eps.Id;

        // Crear EPS nueva si no existe (el formulario permite texto libre)
        var nueva = new CatEps { Nombre = nombreTrim, Activo = true };
        _db.CatEps.Add(nueva);
        await _db.SaveChangesAsync();
        return nueva.Id;
    }

    private async Task<short?> ResolverParentescoId(string? nombre)
    {
        if (string.IsNullOrWhiteSpace(nombre)) return null;
        return await _db.CatParentescos
            .Where(p => p.Nombre.ToLower() == nombre.ToLower().Trim())
            .Select(p => (short?)p.Id)
            .FirstOrDefaultAsync();
    }

    private async Task<short?> ResolverTipoArchivoId(string nombreTipo)
    {
        return await _db.CatTiposArchivo
            .Where(ta => ta.Nombre == nombreTipo)
            .Select(ta => (short?)ta.Id)
            .FirstOrDefaultAsync();
    }

    private async Task CrearOActualizarDependientes(
        Guid beneficiarioId, CrearBeneficiarioDto dto, short? epsId, bool isNew)
    {
        // ── Acudiente ──────────────────────────────────────────────────────────
        if (!string.IsNullOrWhiteSpace(dto.NombreAcudiente))
        {
            var nombreAcu  = dto.NombreAcudiente.Trim();
            var whatsappAcu = string.IsNullOrWhiteSpace(dto.Whatsapp) ? null : dto.Whatsapp.Trim();
            var direccionAcu = string.IsNullOrWhiteSpace(dto.Direccion) ? null : dto.Direccion.Trim();

            Acudiente? acudiente = null;

            if (!isNew)
            {
                // Buscar relación principal existente
                var relPrincipal = await _db.BeneficiarioAcudientes
                    .Include(ba => ba.Acudiente)
                    .FirstOrDefaultAsync(ba => ba.BeneficiarioId == beneficiarioId && ba.EsPrincipal);

                if (relPrincipal?.Acudiente is not null)
                {
                    acudiente          = relPrincipal.Acudiente;
                    acudiente.Nombre   = nombreAcu;
                    acudiente.Whatsapp = whatsappAcu;
                    acudiente.Direccion = direccionAcu;
                }
            }

            if (acudiente is null)
            {
                // Intentar reusar acudiente existente con mismo nombre+whatsapp
                acudiente = await _db.Acudientes.FirstOrDefaultAsync(a =>
                    a.Nombre.ToLower() == nombreAcu.ToLower() &&
                    (a.Whatsapp ?? "") == (whatsappAcu ?? ""));

                if (acudiente is null)
                {
                    acudiente = new Acudiente
                    {
                        Nombre    = nombreAcu,
                        Whatsapp  = whatsappAcu,
                        Direccion = direccionAcu,
                        Activo    = true
                    };
                    _db.Acudientes.Add(acudiente);
                    await _db.SaveChangesAsync();
                }

                var parentescoId = await ResolverParentescoId(dto.Parentesco);

                var relExistente = await _db.BeneficiarioAcudientes
                    .FirstOrDefaultAsync(ba =>
                        ba.BeneficiarioId == beneficiarioId && ba.AcudienteId == acudiente.Id);

                if (relExistente is null)
                {
                    // Desactivar cualquier otra relación principal
                    var anterioresPrinc = await _db.BeneficiarioAcudientes
                        .Where(ba => ba.BeneficiarioId == beneficiarioId && ba.EsPrincipal)
                        .ToListAsync();
                    anterioresPrinc.ForEach(ba => ba.EsPrincipal = false);

                    _db.BeneficiarioAcudientes.Add(new BeneficiarioAcudiente
                    {
                        BeneficiarioId = beneficiarioId,
                        AcudienteId    = acudiente.Id,
                        ParentescoId   = parentescoId,
                        EsPrincipal    = true,
                        Activo         = true
                    });
                }
                else
                {
                    var parentescoIdUpd = await ResolverParentescoId(dto.Parentesco);
                    relExistente.ParentescoId = parentescoIdUpd;
                    relExistente.EsPrincipal  = true;
                }
            }
            else
            {
                // Actualizar parentesco de la relación principal existente
                var relPrincipal = await _db.BeneficiarioAcudientes
                    .FirstOrDefaultAsync(ba => ba.BeneficiarioId == beneficiarioId && ba.EsPrincipal);
                if (relPrincipal is not null)
                    relPrincipal.ParentescoId = await ResolverParentescoId(dto.Parentesco);
            }
        }

        // ── Salud ─────────────────────────────────────────────────────────────
        var salud = await _db.BeneficiariosSalud
            .FirstOrDefaultAsync(s => s.BeneficiarioId == beneficiarioId);

        if (salud is null)
        {
            _db.BeneficiariosSalud.Add(new BeneficiarioSalud
            {
                BeneficiarioId = beneficiarioId,
                EpsId          = epsId,
                Observaciones  = string.IsNullOrWhiteSpace(dto.ObservacionesSalud) ? null : dto.ObservacionesSalud.Trim(),
                Activo         = true
            });
        }
        else
        {
            salud.EpsId         = epsId;
            salud.Observaciones = string.IsNullOrWhiteSpace(dto.ObservacionesSalud) ? null : dto.ObservacionesSalud.Trim();
        }

        // ── Alergias ──────────────────────────────────────────────────────────
        if (dto.TieneAlergia?.ToLower() == "si")
        {
            var tieneRelAlergia = await _db.BeneficiariosAlergia
                .AnyAsync(ba => ba.BeneficiarioId == beneficiarioId && ba.Activo);

            if (!tieneRelAlergia)
            {
                // Obtener o crear entrada genérica en el catálogo
                var alergiaGen = await _db.AlergiasCatalogo
                    .FirstOrDefaultAsync(a => a.Nombre == "Alergia registrada (detalle pendiente)");

                if (alergiaGen is null)
                {
                    alergiaGen = new AlergiasCatalogo
                    {
                        Nombre = "Alergia registrada (detalle pendiente)",
                        Activo = true
                    };
                    _db.AlergiasCatalogo.Add(alergiaGen);
                    await _db.SaveChangesAsync();
                }

                _db.BeneficiariosAlergia.Add(new BeneficiarioAlergia
                {
                    BeneficiarioId = beneficiarioId,
                    AlergiaId      = alergiaGen.Id,
                    Descripcion    = string.IsNullOrWhiteSpace(dto.DescripcionAlergia) ? null : dto.DescripcionAlergia.Trim(),
                    Activo         = true
                });
            }
            else
            {
                // Actualizar descripción del primer registro activo
                var relAlergia = await _db.BeneficiariosAlergia
                    .FirstOrDefaultAsync(ba => ba.BeneficiarioId == beneficiarioId && ba.Activo);
                if (relAlergia is not null)
                    relAlergia.Descripcion = string.IsNullOrWhiteSpace(dto.DescripcionAlergia) ? null : dto.DescripcionAlergia.Trim();
            }
        }
        else
        {
            // Desactivar alergias si se cambia a "no"
            var alergias = await _db.BeneficiariosAlergia
                .Where(ba => ba.BeneficiarioId == beneficiarioId && ba.Activo)
                .ToListAsync();
            alergias.ForEach(a => a.Activo = false);
        }

        // ── Tallas ────────────────────────────────────────────────────────────
        var hasTallas =
            !string.IsNullOrWhiteSpace(dto.TallaCamisa) ||
            !string.IsNullOrWhiteSpace(dto.TallaPantalon) ||
            !string.IsNullOrWhiteSpace(dto.TallaZapatos);

        if (hasTallas)
        {
            var tallaActual = await _db.BeneficiariosTalla
                .Where(t => t.BeneficiarioId == beneficiarioId && t.Activo)
                .OrderByDescending(t => t.FechaMedicion)
                .FirstOrDefaultAsync();

            if (tallaActual is null)
            {
                _db.BeneficiariosTalla.Add(new BeneficiarioTalla
                {
                    BeneficiarioId = beneficiarioId,
                    TallaCamisa    = string.IsNullOrWhiteSpace(dto.TallaCamisa)   ? null : dto.TallaCamisa.Trim(),
                    TallaPantalon  = string.IsNullOrWhiteSpace(dto.TallaPantalon) ? null : dto.TallaPantalon.Trim(),
                    TallaZapatos   = string.IsNullOrWhiteSpace(dto.TallaZapatos)  ? null : dto.TallaZapatos.Trim(),
                    FechaMedicion  = DateOnly.FromDateTime(DateTime.UtcNow),
                    Activo         = true
                });
            }
            else
            {
                tallaActual.TallaCamisa   = string.IsNullOrWhiteSpace(dto.TallaCamisa)   ? null : dto.TallaCamisa.Trim();
                tallaActual.TallaPantalon = string.IsNullOrWhiteSpace(dto.TallaPantalon) ? null : dto.TallaPantalon.Trim();
                tallaActual.TallaZapatos  = string.IsNullOrWhiteSpace(dto.TallaZapatos)  ? null : dto.TallaZapatos.Trim();
            }
        }

        // ── Archivos (fotos) ──────────────────────────────────────────────────
        await ActualizarArchivo(beneficiarioId, "Foto del menor",  dto.FotoMenorUrl);
        await ActualizarArchivo(beneficiarioId, "Foto documento",  dto.FotoDocumentoUrl);
    }

    private async Task ActualizarArchivo(Guid beneficiarioId, string tipoNombre, string? url)
    {
        var tipoId = await ResolverTipoArchivoId(tipoNombre);
        if (tipoId is null) return;

        var existente = await _db.Archivos.FirstOrDefaultAsync(a =>
            a.EntidadTipo == "beneficiario" && a.EntidadId == beneficiarioId &&
            a.TipoArchivoId == tipoId && a.Activo);

        if (string.IsNullOrWhiteSpace(url))
        {
            if (existente is not null) existente.Activo = false;
            return;
        }

        if (existente is null)
        {
            _db.Archivos.Add(new Archivo
            {
                EntidadTipo   = "beneficiario",
                EntidadId     = beneficiarioId,
                TipoArchivoId = tipoId,
                Url           = url.Trim(),
                Activo        = true
            });
        }
        else
        {
            existente.Url = url.Trim();
        }
    }

    // =========================================================================
    // MAPEO DTO
    // =========================================================================
    private static BeneficiarioDto MapearDto(Beneficiario b, List<Archivo> archivos)
    {
        var principal = b.BeneficiarioAcudientes
            .FirstOrDefault(ba => ba.EsPrincipal && ba.Activo);

        var talla = b.Tallas
            .Where(t => t.Activo)
            .OrderByDescending(t => t.FechaMedicion)
            .FirstOrDefault();

        var alergia = b.Alergias.FirstOrDefault(a => a.Activo);

        return new BeneficiarioDto
        {
            Id                 = b.Id,
            NombreMenor        = b.Nombre,
            FechaNacimiento    = b.FechaNacimiento ?? DateOnly.MinValue,
            TipoDocumento      = b.TipoDocumento?.Codigo ?? "",
            NumeroDocumento    = b.NumeroDocumento,
            Eps                = b.Salud?.Eps?.Nombre,
            TallaCamisa        = talla?.TallaCamisa,
            TallaPantalon      = talla?.TallaPantalon,
            TallaZapatos       = talla?.TallaZapatos,
            TieneAlergia       = b.Alergias.Any(a => a.Activo) ? "si" : "no",
            DescripcionAlergia = alergia?.Descripcion,
            ObservacionesSalud = b.Salud?.Observaciones,
            NombreAcudiente    = principal?.Acudiente?.Nombre ?? "",
            Parentesco         = principal?.Parentesco?.Nombre,
            Whatsapp           = principal?.Acudiente?.Whatsapp,
            Direccion          = principal?.Acudiente?.Direccion,
            FotoMenorUrl       = archivos.FirstOrDefault(a => a.TipoArchivo?.Nombre == "Foto del menor")?.Url,
            FotoDocumentoUrl   = archivos.FirstOrDefault(a => a.TipoArchivo?.Nombre == "Foto documento")?.Url,
            CreatedAt          = b.FechaCreacion,
            Activo             = b.Activo
        };
    }
}
