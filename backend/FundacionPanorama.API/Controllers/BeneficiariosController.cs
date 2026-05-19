// CRUD completo de beneficiarios (niños inscritos). La mayoría de endpoints requieren JWT.
// Regla de negocio: los beneficiarios no se eliminan permanentemente desde la UI,
// solo se "dan de baja" (activo=false). El DELETE existe para limpieza de datos por admin.
using System.Data;
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
    public async Task<IActionResult> Stats(CancellationToken ct)
    {
        var conn = _db.Database.GetDbConnection();
        if (conn.State != ConnectionState.Open)
            await conn.OpenAsync(ct);

        // ── 1. Contadores principales (1 query, 1 fila) ───────────────────────
        await using var cmd1 = conn.CreateCommand();
        cmd1.CommandText = """
            SELECT
              COUNT(*)::int                                                            AS total,
              COUNT(*) FILTER (WHERE activo = true)::int                              AS activos,
              COUNT(*) FILTER (WHERE activo = false)::int                             AS baja,
              COUNT(*) FILTER (WHERE numero_documento IS NULL
                                OR   numero_documento = '')::int                      AS sin_documento,
              (SELECT COUNT(DISTINCT beneficiario_id)::int
               FROM   beneficiario_alergia WHERE activo = true)                       AS con_alergia,
              (SELECT COUNT(*)::int FROM beneficiarios b2
               LEFT   JOIN beneficiario_salud bs ON bs.beneficiario_id = b2.id
               WHERE  bs.eps_id IS NULL)                                              AS sin_eps,
              (SELECT COUNT(*)::int FROM beneficiarios b2
               WHERE  NOT EXISTS (
                   SELECT 1 FROM beneficiario_acudiente bac
                   JOIN   acudientes ac ON ac.id = bac.acudiente_id
                   WHERE  bac.beneficiario_id = b2.id
                   AND    bac.es_principal = true AND bac.activo = true
                   AND    ac.whatsapp IS NOT NULL AND ac.whatsapp <> ''))             AS sin_whatsapp,
              (SELECT COUNT(*)::int FROM beneficiarios b2
               WHERE  NOT EXISTS (
                   SELECT 1 FROM beneficiario_acudiente bac
                   JOIN   acudientes ac ON ac.id = bac.acudiente_id
                   WHERE  bac.beneficiario_id = b2.id
                   AND    bac.es_principal = true AND bac.activo = true
                   AND    ac.direccion IS NOT NULL AND ac.direccion <> ''))           AS sin_direccion,
              (SELECT COUNT(*)::int FROM beneficiarios b2
               WHERE  NOT EXISTS (
                   SELECT 1 FROM beneficiario_talla bt
                   WHERE  bt.beneficiario_id = b2.id AND bt.activo = true))          AS sin_tallas,
              (SELECT COUNT(*)::int FROM beneficiarios b2
               WHERE  NOT EXISTS (
                   SELECT 1 FROM archivos ar
                   JOIN   cat_tipo_archivo cta ON cta.id = ar.tipo_archivo_id
                   WHERE  ar.entidad_tipo = 'beneficiario'
                   AND    ar.entidad_id   = b2.id
                   AND    ar.activo       = true
                   AND    cta.nombre      = 'Foto del menor'))                        AS sin_foto
            FROM beneficiarios b
            """;

        int total, activos, baja, sinDoc, conAlergia, sinEps, sinWhatsapp, sinDireccion, sinTallas, sinFoto;
        await using (var r = await cmd1.ExecuteReaderAsync(ct))
        {
            await r.ReadAsync(ct);
            total        = r.GetInt32(0);
            activos      = r.GetInt32(1);
            baja         = r.GetInt32(2);
            sinDoc       = r.GetInt32(3);
            conAlergia   = r.GetInt32(4);
            sinEps       = r.GetInt32(5);
            sinWhatsapp  = r.GetInt32(6);
            sinDireccion = r.GetInt32(7);
            sinTallas    = r.GetInt32(8);
            sinFoto      = r.GetInt32(9);
        }

        // ── 2. Distribución por rango de edad (1 query, 1 fila) ───────────────
        await using var cmd2 = conn.CreateCommand();
        cmd2.CommandText = """
            SELECT
              COUNT(*) FILTER (WHERE edad BETWEEN  0 AND  3)::int,
              COUNT(*) FILTER (WHERE edad BETWEEN  4 AND  6)::int,
              COUNT(*) FILTER (WHERE edad BETWEEN  7 AND  9)::int,
              COUNT(*) FILTER (WHERE edad BETWEEN 10 AND 12)::int,
              COUNT(*) FILTER (WHERE edad BETWEEN 13 AND 15)::int,
              COUNT(*) FILTER (WHERE edad >= 16)::int
            FROM (
              SELECT DATE_PART('year', AGE(fecha_nacimiento::date))::int AS edad
              FROM   beneficiarios
              WHERE  fecha_nacimiento IS NOT NULL
            ) sub
            """;
        var porEdad = new Dictionary<string, int>();
        await using (var r = await cmd2.ExecuteReaderAsync(ct))
        {
            await r.ReadAsync(ct);
            porEdad["0-3 años"]   = r.GetInt32(0);
            porEdad["4-6 años"]   = r.GetInt32(1);
            porEdad["7-9 años"]   = r.GetInt32(2);
            porEdad["10-12 años"] = r.GetInt32(3);
            porEdad["13-15 años"] = r.GetInt32(4);
            porEdad["16+ años"]   = r.GetInt32(5);
        }

        // ── 3. Inscripciones por mes — últimos 4 meses (4 filas) ─────────────
        await using var cmd3 = conn.CreateCommand();
        cmd3.CommandText = """
            WITH meses AS (
              SELECT generate_series(
                date_trunc('month', NOW() - INTERVAL '3 months'),
                date_trunc('month', NOW()),
                INTERVAL '1 month'
              ) AS mes
            )
            SELECT
              EXTRACT(YEAR  FROM m.mes)::int AS anio,
              EXTRACT(MONTH FROM m.mes)::int AS mes_num,
              COUNT(b.id)::int               AS total
            FROM  meses m
            LEFT  JOIN beneficiarios b
                  ON date_trunc('month', b.fecha_creacion) = m.mes
            GROUP BY m.mes
            ORDER BY m.mes
            """;
        var porMes = new Dictionary<string, int>();
        var esCO   = new System.Globalization.CultureInfo("es-CO");
        await using (var r = await cmd3.ExecuteReaderAsync(ct))
        {
            while (await r.ReadAsync(ct))
            {
                var label = new DateTime(r.GetInt32(0), r.GetInt32(1), 1).ToString("MMM yy", esCO);
                porMes[label] = r.GetInt32(2);
            }
        }

        // ── 4. Top 5 tallas (camisa, pantalón, zapatos) — máx 15 filas ───────
        await using var cmd4 = conn.CreateCommand();
        cmd4.CommandText = """
            WITH ultima AS (
              SELECT DISTINCT ON (beneficiario_id)
                talla_camisa, talla_pantalon, talla_zapatos
              FROM  beneficiario_talla
              WHERE activo = true
              ORDER BY beneficiario_id, fecha_medicion DESC
            )
            (SELECT 'camisa'   AS tipo, talla_camisa   AS val, COUNT(*)::int AS cnt
             FROM ultima WHERE talla_camisa IS NOT NULL GROUP BY talla_camisa   ORDER BY cnt DESC LIMIT 5)
            UNION ALL
            (SELECT 'pantalon' AS tipo, talla_pantalon AS val, COUNT(*)::int AS cnt
             FROM ultima WHERE talla_pantalon IS NOT NULL GROUP BY talla_pantalon ORDER BY cnt DESC LIMIT 5)
            UNION ALL
            (SELECT 'zapatos'  AS tipo, talla_zapatos  AS val, COUNT(*)::int AS cnt
             FROM ultima WHERE talla_zapatos IS NOT NULL GROUP BY talla_zapatos  ORDER BY cnt DESC LIMIT 5)
            """;
        var topCamisa   = new List<TallaFreq>();
        var topPantalon = new List<TallaFreq>();
        var topZapatos  = new List<TallaFreq>();
        await using (var r = await cmd4.ExecuteReaderAsync(ct))
        {
            while (await r.ReadAsync(ct))
            {
                var tf = new TallaFreq(r.GetString(1), r.GetInt32(2));
                switch (r.GetString(0))
                {
                    case "camisa":   topCamisa.Add(tf);   break;
                    case "pantalon": topPantalon.Add(tf); break;
                    case "zapatos":  topZapatos.Add(tf);  break;
                }
            }
        }

        return Ok(new BeneficiarioStatsDto
        {
            Total        = total,
            Activos      = activos,
            Baja         = baja,
            ConAlergia   = conAlergia,
            SinDocumento = sinDoc,
            SinEps       = sinEps,
            SinWhatsapp  = sinWhatsapp,
            SinDireccion = sinDireccion,
            SinTallas    = sinTallas,
            SinFoto      = sinFoto,
            PorEdad      = porEdad,
            PorMes       = porMes,
            TopCamisa    = topCamisa,
            TopZapatos   = topZapatos,
            TopPantalon  = topPantalon,
        });
    }

    // =========================================================================
    // GET api/beneficiarios/stats-ninos  — estadísticas del dashboard
    // =========================================================================
    [HttpGet("stats-ninos")]
    [Authorize]
    public async Task<IActionResult> StatsNinos(CancellationToken ct)
    {
        var conn = _db.Database.GetDbConnection();
        if (conn.State != ConnectionState.Open)
            await conn.OpenAsync(ct);

        // ── 1. Contadores principales ─────────────────────────────────────────
        await using var cmd1 = conn.CreateCommand();
        cmd1.CommandText = """
            SELECT
              COUNT(*)::int                                                              AS total_activos,
              COUNT(*) FILTER (WHERE fecha_nacimiento IS NULL)::int                     AS sin_edad,
              COUNT(*) FILTER (
                WHERE pais_nacimiento IS NOT NULL AND pais_nacimiento <> ''
                  AND LOWER(pais_nacimiento) <> 'colombia'
              )::int                                                                     AS extranjeros,
              COUNT(*) FILTER (
                WHERE (pais_nacimiento IS NULL OR pais_nacimiento = ''
                       OR LOWER(pais_nacimiento) = 'colombia')
                  AND departamento_nacimiento IS NOT NULL AND departamento_nacimiento <> ''
                  AND LOWER(departamento_nacimiento) NOT IN ('valle del cauca', 'valle')
              )::int                                                                     AS otra_region
            FROM beneficiarios
            WHERE activo = true
            """;
        int totalActivos, sinEdad, extranjeros, otraRegion;
        await using (var r = await cmd1.ExecuteReaderAsync(ct))
        {
            await r.ReadAsync(ct);
            totalActivos = r.GetInt32(0);
            sinEdad      = r.GetInt32(1);
            extranjeros  = r.GetInt32(2);
            otraRegion   = r.GetInt32(3);
        }

        // ── 2. Por rango de edad ──────────────────────────────────────────────
        await using var cmd2 = conn.CreateCommand();
        cmd2.CommandText = """
            SELECT
              COUNT(*) FILTER (WHERE edad BETWEEN  0 AND  5)::int AS pi,
              COUNT(*) FILTER (WHERE edad BETWEEN  6 AND  8)::int AS in1,
              COUNT(*) FILTER (WHERE edad BETWEEN  9 AND 11)::int AS in2,
              COUNT(*) FILTER (WHERE edad BETWEEN 12 AND 13)::int AS pa,
              COUNT(*) FILTER (WHERE edad BETWEEN 14 AND 16)::int AS ad
            FROM (
              SELECT DATE_PART('year', AGE(fecha_nacimiento::date))::int AS edad
              FROM   beneficiarios
              WHERE  activo = true AND fecha_nacimiento IS NOT NULL
            ) sub
            """;
        int cPI, cIN1, cIN2, cPA, cAD;
        await using (var r = await cmd2.ExecuteReaderAsync(ct))
        {
            await r.ReadAsync(ct);
            cPI  = r.GetInt32(0);
            cIN1 = r.GetInt32(1);
            cIN2 = r.GetInt32(2);
            cPA  = r.GetInt32(3);
            cAD  = r.GetInt32(4);
        }
        var porRango = new object[]
        {
            new { Codigo = "PI",  Nombre = "Primera infancia",  rango = "0 a 5 años",   total = cPI  },
            new { Codigo = "IN1", Nombre = "Infancia inicial",  rango = "6 a 8 años",   total = cIN1 },
            new { Codigo = "IN2", Nombre = "Infancia media",    rango = "9 a 11 años",  total = cIN2 },
            new { Codigo = "PA",  Nombre = "Preadolescencia",   rango = "12 a 13 años", total = cPA  },
            new { Codigo = "AD",  Nombre = "Adolescencia",      rango = "14 a 16 años", total = cAD  },
        };

        // ── 3. Top 10 países extranjeros ──────────────────────────────────────
        await using var cmd3 = conn.CreateCommand();
        cmd3.CommandText = """
            SELECT pais_nacimiento, COUNT(*)::int AS total
            FROM   beneficiarios
            WHERE  activo = true
              AND  pais_nacimiento IS NOT NULL AND pais_nacimiento <> ''
              AND  LOWER(pais_nacimiento) <> 'colombia'
            GROUP BY pais_nacimiento
            ORDER BY total DESC
            LIMIT 10
            """;
        var topPaises = new List<object>();
        await using (var r = await cmd3.ExecuteReaderAsync(ct))
        {
            while (await r.ReadAsync(ct))
                topPaises.Add(new { pais = r.GetString(0), total = r.GetInt32(1) });
        }

        // ── 4. Departamentos con ciudades (colombianos) ───────────────────────
        await using var cmd4 = conn.CreateCommand();
        cmd4.CommandText = """
            SELECT
              departamento_nacimiento,
              COALESCE(ciudad_nacimiento, '') AS ciudad,
              COUNT(*)::int                   AS total
            FROM   beneficiarios
            WHERE  activo = true
              AND  (pais_nacimiento IS NULL OR pais_nacimiento = ''
                    OR LOWER(pais_nacimiento) = 'colombia')
              AND  departamento_nacimiento IS NOT NULL AND departamento_nacimiento <> ''
            GROUP BY departamento_nacimiento, ciudad_nacimiento
            ORDER BY departamento_nacimiento, total DESC
            """;
        var deptoRows = new List<(string depto, string ciudad, int total)>();
        await using (var r = await cmd4.ExecuteReaderAsync(ct))
        {
            while (await r.ReadAsync(ct))
                deptoRows.Add((r.GetString(0), r.GetString(1), r.GetInt32(2)));
        }
        var departamentosConCiudades = deptoRows
            .GroupBy(x => x.depto)
            .Select(g => new {
                departamento = g.Key,
                total        = g.Sum(x => x.total),
                ciudades     = g
                    .Where(x => x.ciudad != "")
                    .OrderByDescending(x => x.total)
                    .Take(10)
                    .Select(x => new { ciudad = x.ciudad, total = x.total })
                    .ToList()
            })
            .OrderByDescending(g => g.total)
            .Take(15)
            .ToList();

        // ── 5. Por género ─────────────────────────────────────────────────────
        await using var cmd5 = conn.CreateCommand();
        cmd5.CommandText = """
            SELECT
              CASE WHEN genero IS NULL OR genero = '' THEN 'No especificado' ELSE genero END AS genero,
              COUNT(*)::int AS total
            FROM   beneficiarios
            WHERE  activo = true
            GROUP BY 1
            ORDER BY total DESC
            """;
        var porGenero = new List<object>();
        await using (var r = await cmd5.ExecuteReaderAsync(ct))
        {
            while (await r.ReadAsync(ct))
                porGenero.Add(new { genero = r.GetString(0), total = r.GetInt32(1) });
        }

        return Ok(new {
            totalActivos,
            sinEdad,
            extranjeros,
            otraRegion,
            porRango,
            topPaises,
            departamentosConCiudades,
            porGenero,
        });
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
            Nombre                  = dto.NombreMenor.Trim(),
            FechaNacimiento         = dto.FechaNacimiento,
            TipoDocumentoId         = tipoDocId,
            NumeroDocumento         = string.IsNullOrWhiteSpace(dto.NumeroDocumento) ? null : dto.NumeroDocumento.Trim(),
            PaisNacimiento          = string.IsNullOrWhiteSpace(dto.PaisNacimiento)         ? null : dto.PaisNacimiento.Trim(),
            DepartamentoNacimiento  = string.IsNullOrWhiteSpace(dto.DepartamentoNacimiento) ? null : dto.DepartamentoNacimiento.Trim(),
            CiudadNacimiento        = string.IsNullOrWhiteSpace(dto.CiudadNacimiento)       ? null : dto.CiudadNacimiento.Trim(),
            Barrio                  = string.IsNullOrWhiteSpace(dto.Barrio)                 ? null : dto.Barrio.Trim(),
            NumPersonasVive         = dto.NumPersonasVive,
            NumHermanos             = dto.NumHermanos,
            NombreColegio           = string.IsNullOrWhiteSpace(dto.NombreColegio)  ? null : dto.NombreColegio.Trim(),
            GradoEscolar            = string.IsNullOrWhiteSpace(dto.GradoEscolar)   ? null : dto.GradoEscolar.Trim(),
            TieneDiscapacidad       = dto.TieneDiscapacidad,
            DescripcionDiscapacidad = string.IsNullOrWhiteSpace(dto.DescripcionDiscapacidad) ? null : dto.DescripcionDiscapacidad.Trim(),
            ViveConNino             = dto.ViveConNino,
            Genero                  = string.IsNullOrWhiteSpace(dto.Genero) ? null : dto.Genero.Trim(),
            Autorizacion            = dto.Autorizacion,
            Activo                  = true
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

        beneficiario.Nombre                  = dto.NombreMenor.Trim();
        beneficiario.FechaNacimiento         = dto.FechaNacimiento;
        beneficiario.TipoDocumentoId         = tipoDocId;
        beneficiario.NumeroDocumento         = string.IsNullOrWhiteSpace(dto.NumeroDocumento) ? null : dto.NumeroDocumento.Trim();
        beneficiario.PaisNacimiento          = string.IsNullOrWhiteSpace(dto.PaisNacimiento)         ? null : dto.PaisNacimiento.Trim();
        beneficiario.DepartamentoNacimiento  = string.IsNullOrWhiteSpace(dto.DepartamentoNacimiento) ? null : dto.DepartamentoNacimiento.Trim();
        beneficiario.CiudadNacimiento        = string.IsNullOrWhiteSpace(dto.CiudadNacimiento)       ? null : dto.CiudadNacimiento.Trim();
        beneficiario.Barrio                  = string.IsNullOrWhiteSpace(dto.Barrio)                 ? null : dto.Barrio.Trim();
        beneficiario.NumPersonasVive         = dto.NumPersonasVive;
        beneficiario.NumHermanos             = dto.NumHermanos;
        beneficiario.NombreColegio           = string.IsNullOrWhiteSpace(dto.NombreColegio)  ? null : dto.NombreColegio.Trim();
        beneficiario.GradoEscolar            = string.IsNullOrWhiteSpace(dto.GradoEscolar)   ? null : dto.GradoEscolar.Trim();
        beneficiario.TieneDiscapacidad       = dto.TieneDiscapacidad;
        beneficiario.DescripcionDiscapacidad = string.IsNullOrWhiteSpace(dto.DescripcionDiscapacidad) ? null : dto.DescripcionDiscapacidad.Trim();
        beneficiario.ViveConNino             = dto.ViveConNino;
        beneficiario.Genero                  = string.IsNullOrWhiteSpace(dto.Genero) ? null : dto.Genero.Trim();
        beneficiario.Autorizacion            = dto.Autorizacion;

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
    public record DarDeBajaDto(string? Motivo);

    [HttpPatch("{id:guid}/baja")]
    [Authorize]
    public async Task<IActionResult> DarDeBaja(Guid id, [FromBody] DarDeBajaDto? dto)
    {
        var b = await _db.Beneficiarios.FindAsync(id);
        if (b is null) return NotFound();
        b.Activo     = false;
        b.MotivoBaja = string.IsNullOrWhiteSpace(dto?.Motivo) ? null : dto.Motivo.Trim();
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
        b.Activo     = true;
        b.MotivoBaja = null;
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
            !string.IsNullOrWhiteSpace(dto.TallaZapatos) ||
            dto.PesoKg.HasValue ||
            dto.TallaCm.HasValue;

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
                    PesoKg         = dto.PesoKg,
                    TallaCm        = dto.TallaCm,
                    FechaMedicion  = DateOnly.FromDateTime(DateTime.UtcNow),
                    Activo         = true
                });
            }
            else
            {
                tallaActual.TallaCamisa   = string.IsNullOrWhiteSpace(dto.TallaCamisa)   ? null : dto.TallaCamisa.Trim();
                tallaActual.TallaPantalon = string.IsNullOrWhiteSpace(dto.TallaPantalon) ? null : dto.TallaPantalon.Trim();
                tallaActual.TallaZapatos  = string.IsNullOrWhiteSpace(dto.TallaZapatos)  ? null : dto.TallaZapatos.Trim();
                tallaActual.PesoKg        = dto.PesoKg;
                tallaActual.TallaCm       = dto.TallaCm;
            }
        }

        // ── Archivos (fotos) ──────────────────────────────────────────────────
        await ActualizarArchivo(beneficiarioId, "Foto del menor",           dto.FotoMenorUrl);
        await ActualizarArchivo(beneficiarioId, "Foto documento",           dto.FotoDocumentoUrl);
        await ActualizarArchivo(beneficiarioId, "Foto documento (reverso)", dto.FotoDocumentoReversoUrl);
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
            Id                      = b.Id,
            NombreMenor             = b.Nombre,
            FechaNacimiento         = b.FechaNacimiento ?? DateOnly.MinValue,
            TipoDocumento           = b.TipoDocumento?.Codigo ?? "",
            NumeroDocumento         = b.NumeroDocumento,
            Eps                     = b.Salud?.Eps?.Nombre,
            TallaCamisa             = talla?.TallaCamisa,
            TallaPantalon           = talla?.TallaPantalon,
            TallaZapatos            = talla?.TallaZapatos,
            PesoKg                  = talla?.PesoKg,
            TallaCm                 = talla?.TallaCm,
            TieneAlergia            = b.Alergias.Any(a => a.Activo) ? "si" : "no",
            DescripcionAlergia      = alergia?.Descripcion,
            ObservacionesSalud      = b.Salud?.Observaciones,
            TieneDiscapacidad       = b.TieneDiscapacidad,
            DescripcionDiscapacidad = b.DescripcionDiscapacidad,
            NombreAcudiente         = principal?.Acudiente?.Nombre ?? "",
            Parentesco              = principal?.Parentesco?.Nombre,
            Whatsapp                = principal?.Acudiente?.Whatsapp,
            Direccion               = principal?.Acudiente?.Direccion,
            ViveConNino             = b.ViveConNino,
            PaisNacimiento          = b.PaisNacimiento,
            DepartamentoNacimiento  = b.DepartamentoNacimiento,
            CiudadNacimiento        = b.CiudadNacimiento,
            Barrio                  = b.Barrio,
            NumPersonasVive         = b.NumPersonasVive,
            NumHermanos             = b.NumHermanos,
            NombreColegio           = b.NombreColegio,
            GradoEscolar            = b.GradoEscolar,
            Genero                  = b.Genero,
            Autorizacion            = b.Autorizacion,
            FotoMenorUrl            = archivos.FirstOrDefault(a => a.TipoArchivo?.Nombre == "Foto del menor")?.Url,
            FotoDocumentoUrl        = archivos.FirstOrDefault(a => a.TipoArchivo?.Nombre == "Foto documento")?.Url,
            FotoDocumentoReversoUrl = archivos.FirstOrDefault(a => a.TipoArchivo?.Nombre == "Foto documento (reverso)")?.Url,
            CreatedAt               = b.FechaCreacion,
            Activo                  = b.Activo,
            MotivoBaja              = b.MotivoBaja
        };
    }
}
