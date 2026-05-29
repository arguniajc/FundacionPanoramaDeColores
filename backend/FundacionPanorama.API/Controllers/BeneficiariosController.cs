// CRUD completo de beneficiarios (niños inscritos). La mayoría de endpoints requieren JWT.
// Regla de negocio: los beneficiarios no se eliminan permanentemente desde la UI,
// solo se "dan de baja" (activo=false). El DELETE existe para limpieza de datos por admin.
using FundacionPanorama.API.Data;
using FundacionPanorama.API.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Npgsql;
using NpgsqlTypes;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/beneficiarios")]
public class BeneficiariosController : BaseController
{
    private readonly AppDbContext _db;
    private readonly IMemoryCache _cache;

    public BeneficiariosController(AppDbContext db, IMemoryCache cache)
    {
        _db    = db;
        _cache = cache;
    }

    private NpgsqlConnection AbrirConexion() => new(_db.Database.GetConnectionString());

    // =========================================================================
    // GET api/beneficiarios?pagina=1&porPagina=10&buscar=...&estado=activos|baja|todos
    // =========================================================================
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> Listar(
        [FromQuery] int     pagina       = 1,
        [FromQuery] int     porPagina    = 10,
        [FromQuery] string? buscar       = null,
        [FromQuery] string  estado       = "activos",
        [FromQuery] string? genero       = null,
        [FromQuery] int?    edadMin      = null,
        [FromQuery] int?    edadMax      = null,
        [FromQuery] string? eps          = null,
        [FromQuery] string? tieneAlergia = null,
        [FromQuery] string? tipo         = null)
    {
        pagina    = Math.Max(1, pagina);
        porPagina = Math.Clamp(porPagina, 1, 100);

        await using var conn = AbrirConexion();
        await conn.OpenAsync();

        // Build WHERE filters
        var filters = new List<string>();
        switch (estado)
        {
            case "baja":  filters.Add("b.activo = false"); break;
            case "todos": break;
            default:      filters.Add("b.activo = true");  break;
        }
        if (tipo == "niño")
            filters.Add("DATE_PART('year', AGE(b.fecha_nacimiento::date))::int < 18");
        else if (tipo == "adulto")
            filters.Add("DATE_PART('year', AGE(b.fecha_nacimiento::date))::int >= 18");
        if (!string.IsNullOrWhiteSpace(buscar))
            filters.Add("""
                (concat_ws(' ', b.primer_nombre, b.segundo_nombre, b.primer_apellido, b.segundo_apellido) ILIKE @buscar
                 OR b.numero_documento ILIKE @buscar
                 OR EXISTS (
                     SELECT 1 FROM beneficiario_acudiente bac2
                     JOIN acudientes ac2 ON ac2.id = bac2.acudiente_id
                     WHERE bac2.beneficiario_id = b.id
                     AND (ac2.nombre ILIKE @buscar OR ac2.whatsapp ILIKE @buscar)
                 ))
                """);
        if (!string.IsNullOrWhiteSpace(genero))
            filters.Add("b.genero = @genero");
        if (edadMin.HasValue)
            filters.Add("DATE_PART('year', AGE(b.fecha_nacimiento::date))::int >= @edadMin");
        if (edadMax.HasValue)
            filters.Add("DATE_PART('year', AGE(b.fecha_nacimiento::date))::int <= @edadMax");
        if (!string.IsNullOrWhiteSpace(eps))
            filters.Add("""
                EXISTS (
                    SELECT 1 FROM beneficiario_salud bs2
                    JOIN cat_eps ce2 ON ce2.id = bs2.eps_id
                    WHERE bs2.beneficiario_id = b.id
                    AND ce2.nombre ILIKE @eps
                )
                """);
        if (tieneAlergia == "si")
            filters.Add("EXISTS (SELECT 1 FROM beneficiario_alergia ba2 WHERE ba2.beneficiario_id = b.id AND ba2.activo = true)");
        else if (tieneAlergia == "no")
            filters.Add("NOT EXISTS (SELECT 1 FROM beneficiario_alergia ba2 WHERE ba2.beneficiario_id = b.id AND ba2.activo = true)");

        var where = filters.Count > 0 ? "WHERE " + string.Join(" AND ", filters) : "";

        // Agrega los parámetros de filtro avanzado a un comando dado
        void AgregarFiltrosAvanzados(NpgsqlCommand cmd)
        {
            if (!string.IsNullOrWhiteSpace(buscar))  cmd.Parameters.AddWithValue("buscar",  $"%{buscar}%");
            if (!string.IsNullOrWhiteSpace(genero))  cmd.Parameters.AddWithValue("genero",  genero.Trim());
            if (edadMin.HasValue)                    cmd.Parameters.AddWithValue("edadMin", edadMin.Value);
            if (edadMax.HasValue)                    cmd.Parameters.AddWithValue("edadMax", edadMax.Value);
            if (!string.IsNullOrWhiteSpace(eps))     cmd.Parameters.AddWithValue("eps",     $"%{eps.Trim()}%");
        }

        // Count
        await using var cmdCount = conn.CreateCommand();
        cmdCount.CommandText = $"SELECT COUNT(*)::int FROM beneficiarios b {where}";
        AgregarFiltrosAvanzados(cmdCount);
        var total = (int)(await cmdCount.ExecuteScalarAsync())!;

        // IDs page
        await using var cmdIds = conn.CreateCommand();
        cmdIds.CommandText = $"""
            SELECT b.id FROM beneficiarios b {where}
            ORDER BY b.fecha_creacion DESC
            LIMIT @pp OFFSET @off
            """;
        AgregarFiltrosAvanzados(cmdIds);
        cmdIds.Parameters.AddWithValue("pp",  porPagina);
        cmdIds.Parameters.AddWithValue("off", (pagina - 1) * porPagina);

        var ids = new List<Guid>();
        await using (var r = await cmdIds.ExecuteReaderAsync())
            while (await r.ReadAsync())
                ids.Add(r.GetGuid(0));

        if (ids.Count == 0)
            return Ok(new BeneficiarioListDto { Data = [], Total = total, Pagina = pagina, PorPagina = porPagina });

        var datos = await CargarDtosAsync(conn, ids);
        // Preserve original order
        var ordered = ids.Select(id => datos.First(d => d.Id == id)).ToList();

        return Ok(new BeneficiarioListDto { Data = ordered, Total = total, Pagina = pagina, PorPagina = porPagina });
    }

    // =========================================================================
    // GET api/beneficiarios/stats
    // =========================================================================
    [HttpGet("stats")]
    [Authorize]
    public async Task<IActionResult> Stats([FromQuery] string? tipo = null, CancellationToken ct = default)
    {
        bool   filtrarTipo   = tipo == "niño" || tipo == "adulto";
        string cacheKeyStr   = filtrarTipo ? $"stats_{tipo!.Trim()}" : "stats";
        if (_cache.TryGetValue(cacheKeyStr, out object? cached)) return Ok(cached);

        await using var conn = AbrirConexion();
        await conn.OpenAsync(ct);

        string edadCond       = tipo == "niño"   ? "DATE_PART('year', AGE(b.fecha_nacimiento::date))::int < 18"
                              : tipo == "adulto" ? "DATE_PART('year', AGE(b.fecha_nacimiento::date))::int >= 18"
                              : null!;
        string edadCond2      = tipo == "niño"   ? "DATE_PART('year', AGE(b2.fecha_nacimiento::date))::int < 18"
                              : tipo == "adulto" ? "DATE_PART('year', AGE(b2.fecha_nacimiento::date))::int >= 18"
                              : null!;
        string edadCondX      = tipo == "niño"   ? "DATE_PART('year', AGE(bx.fecha_nacimiento::date))::int < 18"
                              : tipo == "adulto" ? "DATE_PART('year', AGE(bx.fecha_nacimiento::date))::int >= 18"
                              : null!;
        string edadCondPlain  = tipo == "niño"   ? "DATE_PART('year', AGE(fecha_nacimiento::date))::int < 18"
                              : tipo == "adulto" ? "DATE_PART('year', AGE(fecha_nacimiento::date))::int >= 18"
                              : null!;

        string tf   = filtrarTipo ? $"WHERE {edadCond}"  : "";
        string tfb2 = filtrarTipo ? $"AND {edadCond2}" : "";
        string tfba = filtrarTipo
            ? $"JOIN beneficiarios bx ON bx.id = ba.beneficiario_id WHERE ba.activo = true AND {edadCondX}"
            : "WHERE ba.activo = true";

        // ── 1. Contadores principales ─────────────────────────────────────────
        await using var cmd1 = conn.CreateCommand();
        cmd1.CommandText = $"""
            SELECT
              COUNT(*)::int                                                            AS total,
              COUNT(*) FILTER (WHERE activo = true)::int                              AS activos,
              COUNT(*) FILTER (WHERE activo = false)::int                             AS baja,
              COUNT(*) FILTER (WHERE numero_documento IS NULL
                                OR   numero_documento = '')::int                      AS sin_documento,
              (SELECT COUNT(DISTINCT ba.beneficiario_id)::int
               FROM   beneficiario_alergia ba
               {tfba})                                                                AS con_alergia,
              (SELECT COUNT(*)::int FROM beneficiarios b2
               LEFT   JOIN beneficiario_salud bs ON bs.beneficiario_id = b2.id
               WHERE  bs.eps_id IS NULL {tfb2})                                       AS sin_eps,
              (SELECT COUNT(*)::int FROM beneficiarios b2
               WHERE  {(filtrarTipo ? $"{edadCond2} AND " : "")}NOT EXISTS (
                   SELECT 1 FROM beneficiario_acudiente bac
                   JOIN   acudientes ac ON ac.id = bac.acudiente_id
                   WHERE  bac.beneficiario_id = b2.id
                   AND    bac.es_principal = true AND bac.activo = true
                   AND    ac.whatsapp IS NOT NULL AND ac.whatsapp <> ''))             AS sin_whatsapp,
              (SELECT COUNT(*)::int FROM beneficiarios b2
               WHERE  {(filtrarTipo ? $"{edadCond2} AND " : "")}NOT EXISTS (
                   SELECT 1 FROM beneficiario_acudiente bac
                   JOIN   acudientes ac ON ac.id = bac.acudiente_id
                   WHERE  bac.beneficiario_id = b2.id
                   AND    bac.es_principal = true AND bac.activo = true
                   AND    ac.direccion IS NOT NULL AND ac.direccion <> ''))           AS sin_direccion,
              (SELECT COUNT(*)::int FROM beneficiarios b2
               WHERE  {(filtrarTipo ? $"{edadCond2} AND " : "")}NOT EXISTS (
                   SELECT 1 FROM beneficiario_talla bt
                   WHERE  bt.beneficiario_id = b2.id AND bt.activo = true))          AS sin_tallas,
              (SELECT COUNT(*)::int FROM beneficiarios b2
               WHERE  {(filtrarTipo ? $"{edadCond2} AND " : "")}NOT EXISTS (
                   SELECT 1 FROM archivos ar
                   JOIN   cat_tipo_archivo cta ON cta.id = ar.tipo_archivo_id
                   WHERE  ar.entidad_tipo = 'beneficiario'
                   AND    ar.entidad_id   = b2.id
                   AND    ar.activo       = true
                   AND    cta.nombre      = 'Foto del menor'))                        AS sin_foto
            FROM beneficiarios b
            {tf}
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

        // ── 2. Distribución por rango de edad ─────────────────────────────────
        await using var cmd2 = conn.CreateCommand();
        cmd2.CommandText = $"""
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
              {(filtrarTipo ? $"AND {edadCondPlain}" : "")}
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

        // ── 3. Inscripciones por mes — últimos 4 meses ────────────────────────
        await using var cmd3 = conn.CreateCommand();
        cmd3.CommandText = $"""
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
                  {(filtrarTipo ? $"AND {edadCond}" : "")}
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

        // ── 4. Top 5 tallas ───────────────────────────────────────────────────
        await using var cmd4 = conn.CreateCommand();
        cmd4.CommandText = $"""
            WITH ultima AS (
              SELECT DISTINCT ON (bt.beneficiario_id)
                bt.talla_camisa, bt.talla_pantalon, bt.talla_zapatos
              FROM  beneficiario_talla bt
              {(filtrarTipo ? $"JOIN beneficiarios bx ON bx.id = bt.beneficiario_id AND {edadCondX}" : "")}
              WHERE bt.activo = true
              ORDER BY bt.beneficiario_id, bt.fecha_medicion DESC
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
                var tfreq = new TallaFreq(r.GetString(1), r.GetInt32(2));
                switch (r.GetString(0))
                {
                    case "camisa":   topCamisa.Add(tfreq);   break;
                    case "pantalon": topPantalon.Add(tfreq); break;
                    case "zapatos":  topZapatos.Add(tfreq);  break;
                }
            }
        }

        var statsDto = new BeneficiarioStatsDto
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
        };
        _cache.Set(cacheKeyStr, (object)statsDto, TimeSpan.FromMinutes(10));
        return Ok(statsDto);
    }

    // =========================================================================
    // GET api/beneficiarios/incompletos
    // Devuelve hasta 60 beneficiarios activos con campos de calidad vacíos,
    // ordenados por cantidad de campos faltantes (más incompleto primero).
    // =========================================================================
    [HttpGet("incompletos")]
    [Authorize]
    public async Task<IActionResult> Incompletos([FromQuery] string? tipo = null, CancellationToken ct = default)
    {
        bool   filtrarTipo    = tipo == "niño" || tipo == "adulto";
        string tipoEdadFiltro = tipo == "niño"   ? "AND DATE_PART('year', AGE(b.fecha_nacimiento::date))::int < 18"
                              : tipo == "adulto" ? "AND DATE_PART('year', AGE(b.fecha_nacimiento::date))::int >= 18"
                              : "";

        await using var conn = AbrirConexion();
        await conn.OpenAsync(ct);

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            WITH flags AS (
                SELECT
                    b.id,
                    TRIM(concat_ws(' ', b.primer_nombre, b.segundo_nombre,
                                   b.primer_apellido, b.segundo_apellido))             AS nombre,
                    af1.url                                                             AS foto,
                    (af1.url IS NULL)::int                                              AS sin_foto,
                    (af2.url IS NULL)::int                                              AS sin_foto_doc,
                    (ac.whatsapp  IS NULL OR ac.whatsapp  = '')::int                    AS sin_whatsapp,
                    (ac.direccion IS NULL OR ac.direccion = '')::int                    AS sin_direccion,
                    (bt.talla_camisa  IS NULL OR bt.talla_camisa  IN ('No registra',''))::int  AS sin_camisa,
                    (bt.talla_zapatos IS NULL OR bt.talla_zapatos IN ('No registra',''))::int  AS sin_zapatos,
                    (bt.peso_kg IS NULL OR bt.peso_kg = 0)::int                        AS sin_peso,
                    (bt.talla_cm IS NULL OR bt.talla_cm = 0)::int                      AS sin_talla,
                    (b.tipo = 'niño' AND (b.nombre_colegio IS NULL
                      OR b.nombre_colegio IN ('No registra','')))::int                 AS sin_colegio,
                    (b.tipo = 'niño' AND (b.grado_escolar IS NULL
                      OR b.grado_escolar = ''))::int                                   AS sin_grado
                FROM beneficiarios b
                LEFT JOIN beneficiario_acudiente bac
                       ON bac.beneficiario_id = b.id AND bac.es_principal = true AND bac.activo = true
                LEFT JOIN acudientes ac ON ac.id = bac.acudiente_id
                LEFT JOIN beneficiario_talla bt
                       ON bt.beneficiario_id = b.id AND bt.activo = true
                LEFT JOIN LATERAL (
                    SELECT url FROM archivos ar
                    JOIN   cat_tipo_archivo cta ON cta.id = ar.tipo_archivo_id
                    WHERE  ar.entidad_tipo = 'beneficiario' AND ar.entidad_id = b.id
                      AND  ar.activo = true AND cta.nombre = 'Foto del menor'
                    LIMIT  1
                ) af1 ON true
                LEFT JOIN LATERAL (
                    SELECT url FROM archivos ar
                    JOIN   cat_tipo_archivo cta ON cta.id = ar.tipo_archivo_id
                    WHERE  ar.entidad_tipo = 'beneficiario' AND ar.entidad_id = b.id
                      AND  ar.activo = true AND cta.nombre = 'Foto documento'
                    LIMIT  1
                ) af2 ON true
                WHERE b.activo = true
                {tipoEdadFiltro}
            ),
            scored AS (
                SELECT *,
                    (sin_foto + sin_foto_doc + sin_whatsapp + sin_direccion
                     + sin_camisa + sin_zapatos + sin_peso + sin_talla
                     + sin_colegio + sin_grado) AS total_faltantes
                FROM flags
            )
            SELECT id, nombre, foto,
                   sin_foto, sin_foto_doc, sin_whatsapp, sin_direccion,
                   sin_camisa, sin_zapatos, sin_peso, sin_talla,
                   sin_colegio, sin_grado, total_faltantes
            FROM   scored
            WHERE  total_faltantes > 0
            ORDER  BY total_faltantes DESC, nombre
            LIMIT  60
            """;
        var result = new List<PerfilIncompletoDto>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            var faltantes = new List<string>();
            if (r.GetInt32(3)  > 0) faltantes.Add("Foto del menor");
            if (r.GetInt32(4)  > 0) faltantes.Add("Foto documento");
            if (r.GetInt32(5)  > 0) faltantes.Add("WhatsApp");
            if (r.GetInt32(6)  > 0) faltantes.Add("Dirección");
            if (r.GetInt32(7)  > 0) faltantes.Add("Talla camisa");
            if (r.GetInt32(8)  > 0) faltantes.Add("Talla zapatos");
            if (r.GetInt32(9)  > 0) faltantes.Add("Peso");
            if (r.GetInt32(10) > 0) faltantes.Add("Talla altura");
            if (r.GetInt32(11) > 0) faltantes.Add("Colegio");
            if (r.GetInt32(12) > 0) faltantes.Add("Grado escolar");

            int totalFalt   = r.GetInt32(13);
            int completitud = (int)Math.Round((10.0 - totalFalt) / 10.0 * 100);

            result.Add(new PerfilIncompletoDto
            {
                Id          = r.GetGuid(0),
                Nombre      = r.GetString(1),
                FotoUrl     = r.IsDBNull(2) ? null : r.GetString(2),
                Faltantes   = faltantes,
                Completitud = completitud,
            });
        }

        return Ok(result);
    }

    // =========================================================================
    // GET api/beneficiarios/stats-ninos
    // =========================================================================
    [HttpGet("stats-ninos")]
    [Authorize]
    public async Task<IActionResult> StatsNinos(CancellationToken ct)
    {
        if (_cache.TryGetValue("stats_ninos", out object? cached)) return Ok(cached);

        await using var conn = AbrirConexion();
        await conn.OpenAsync(ct);

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
            while (await r.ReadAsync(ct))
                topPaises.Add(new { pais = r.GetString(0), total = r.GetInt32(1) });

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
            while (await r.ReadAsync(ct))
                deptoRows.Add((r.GetString(0), r.GetString(1), r.GetInt32(2)));

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
            while (await r.ReadAsync(ct))
                porGenero.Add(new { genero = r.GetString(0), total = r.GetInt32(1) });

        var ninosDto = (object)new {
            totalActivos,
            sinEdad,
            extranjeros,
            otraRegion,
            porRango,
            topPaises,
            departamentosConCiudades,
            porGenero,
        };
        _cache.Set("stats_ninos", ninosDto, TimeSpan.FromMinutes(10));
        return Ok(ninosDto);
    }

    // =========================================================================
    // GET api/beneficiarios/{id}
    // =========================================================================
    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> ObtenerPorId(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        var dtos = await CargarDtosAsync(conn, [id]);
        return dtos.Count == 0 ? NotFound() : Ok(dtos[0]);
    }

    // =========================================================================
    // GET api/beneficiarios/verificar-documento/{numero}
    // =========================================================================
    [HttpGet("verificar-documento/{numero}")]
    public async Task<IActionResult> VerificarDocumento(string numero)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*)::int FROM beneficiarios WHERE numero_documento = @doc";
        cmd.Parameters.AddWithValue("doc", numero);
        var cnt = (int)(await cmd.ExecuteScalarAsync())!;
        return Ok(new { existe = cnt > 0 });
    }

    // =========================================================================
    // POST api/beneficiarios
    // =========================================================================
    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearBeneficiarioDto dto)
    {
        var errVal = ValidarBeneficiario(dto);
        if (errVal.Count > 0) return BadRequest(new { mensaje = string.Join(" ", errVal), errores = errVal });

        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        // Duplicate document check
        if (!string.IsNullOrWhiteSpace(dto.NumeroDocumento))
        {
            await using var chk = conn.CreateCommand();
            chk.Transaction = tx;
            chk.CommandText = "SELECT COUNT(*)::int FROM beneficiarios WHERE numero_documento = @doc";
            chk.Parameters.AddWithValue("doc", dto.NumeroDocumento.Trim());
            if ((int)(await chk.ExecuteScalarAsync())! > 0)
                return Conflict(new { mensaje = "Este número de documento ya está inscrito." });
        }

        var tipoDocId = await ResolverTipoDocumentoIdAsync(conn, tx, dto.TipoDocumento);
        var epsId     = await ResolverEpsIdAsync(conn, tx, dto.Eps);

        // INSERT beneficiario
        await using var ins = conn.CreateCommand();
        ins.Transaction = tx;
        ins.CommandText = """
            INSERT INTO beneficiarios (
              primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
              fecha_nacimiento, tipo_documento_id, numero_documento,
              pais_nacimiento, departamento_nacimiento, ciudad_nacimiento, barrio,
              num_personas_vive, num_hermanos, nombre_colegio, grado_escolar,
              tiene_discapacidad, descripcion_discapacidad, vive_con_nino,
              genero, autorizacion, tipo, activo
            ) VALUES (
              @pn, @sn, @pa, @sa,
              @fn, @tdoc, @ndoc,
              @pais, @depto, @ciudad, @barrio,
              @npv, @nh, @col, @grado,
              @disc, @disc_desc, @vive,
              @genero, @auth, @tipo, true
            ) RETURNING id
            """;
        ins.Parameters.AddWithValue("pn", dto.PrimerNombre.Trim());
        ins.Parameters.AddWithValue("sn", string.IsNullOrWhiteSpace(dto.SegundoNombre)   ? DBNull.Value : (object)dto.SegundoNombre.Trim());
        ins.Parameters.AddWithValue("pa", dto.PrimerApellido.Trim());
        ins.Parameters.AddWithValue("sa", string.IsNullOrWhiteSpace(dto.SegundoApellido) ? DBNull.Value : (object)dto.SegundoApellido.Trim());
        ins.Parameters.Add(new NpgsqlParameter("fn",   NpgsqlDbType.Date)     { Value = (object)dto.FechaNacimiento });
        ins.Parameters.Add(new NpgsqlParameter("tdoc", NpgsqlDbType.Smallint) { Value = (object?)tipoDocId ?? DBNull.Value });
        ins.Parameters.AddWithValue("ndoc",  dto.NumeroDocumento.Trim());
        ins.Parameters.AddWithValue("pais",  dto.PaisNacimiento.Trim());
        ins.Parameters.AddWithValue("depto", dto.DepartamentoNacimiento.Trim());
        ins.Parameters.AddWithValue("ciudad",dto.CiudadNacimiento.Trim());
        ins.Parameters.AddWithValue("barrio",dto.Barrio.Trim());
        ins.Parameters.Add(new NpgsqlParameter("npv",  NpgsqlDbType.Integer) { Value = (object)dto.NumPersonasVive!.Value });
        ins.Parameters.Add(new NpgsqlParameter("nh",   NpgsqlDbType.Integer) { Value = (object)dto.NumHermanos!.Value    });
        ins.Parameters.AddWithValue("col",   string.IsNullOrWhiteSpace(dto.NombreColegio) ? DBNull.Value : (object)dto.NombreColegio.Trim());
        ins.Parameters.AddWithValue("grado", string.IsNullOrWhiteSpace(dto.GradoEscolar) ? DBNull.Value : (object)dto.GradoEscolar.Trim());
        ins.Parameters.AddWithValue("disc",  dto.TieneDiscapacidad);
        ins.Parameters.AddWithValue("disc_desc", string.IsNullOrWhiteSpace(dto.DescripcionDiscapacidad) ? DBNull.Value : (object)dto.DescripcionDiscapacidad.Trim());
        ins.Parameters.Add(new NpgsqlParameter("vive", NpgsqlDbType.Boolean) { Value = (object?)dto.ViveConNino ?? DBNull.Value });
        ins.Parameters.AddWithValue("genero",dto.Genero.Trim());
        ins.Parameters.AddWithValue("auth",  dto.Autorizacion);
        ins.Parameters.AddWithValue("tipo",  string.IsNullOrWhiteSpace(dto.Tipo) ? "niño" : dto.Tipo.Trim());

        var newId = (Guid)(await ins.ExecuteScalarAsync())!;

        await GuardarDependientesAsync(conn, tx, newId, dto, epsId, isNew: true);
        await RegistrarAuditAsync(conn, tx, "beneficiario", newId.ToString(), dto.NombreCompleto, "creado");

        await tx.CommitAsync();

        await using var conn2 = AbrirConexion();
        await conn2.OpenAsync();
        var dtos = await CargarDtosAsync(conn2, [newId]);
        return CreatedAtAction(nameof(ObtenerPorId), new { id = newId }, dtos[0]);
    }

    // =========================================================================
    // PUT api/beneficiarios/{id}
    // =========================================================================
    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] CrearBeneficiarioDto dto)
    {
        var errVal = ValidarBeneficiario(dto);
        if (errVal.Count > 0) return BadRequest(new { mensaje = string.Join(" ", errVal), errores = errVal });

        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        // Exists check
        if (!await BeneficiarioExisteAsync(conn, tx, id))
            return NotFound();

        await using var ex = conn.CreateCommand();
        ex.Transaction = tx;
        ex.CommandText = "SELECT numero_documento FROM beneficiarios WHERE id = @id";
        ex.Parameters.AddWithValue("id", id);
        var currentDocRaw = await ex.ExecuteScalarAsync();
        var currentDoc = currentDocRaw == null || currentDocRaw == DBNull.Value ? null : (string)currentDocRaw;

        // Duplicate document check
        if (!string.IsNullOrWhiteSpace(dto.NumeroDocumento) && dto.NumeroDocumento.Trim() != currentDoc)
        {
            await using var chk = conn.CreateCommand();
            chk.Transaction = tx;
            chk.CommandText = "SELECT COUNT(*)::int FROM beneficiarios WHERE numero_documento = @doc AND id <> @id";
            chk.Parameters.AddWithValue("doc", dto.NumeroDocumento.Trim());
            chk.Parameters.AddWithValue("id",  id);
            if ((int)(await chk.ExecuteScalarAsync())! > 0)
                return Conflict(new { mensaje = "Ese número de documento ya está registrado." });
        }

        var tipoDocId = await ResolverTipoDocumentoIdAsync(conn, tx, dto.TipoDocumento);
        var epsId     = await ResolverEpsIdAsync(conn, tx, dto.Eps);

        await using var upd = conn.CreateCommand();
        upd.Transaction = tx;
        upd.CommandText = """
            UPDATE beneficiarios SET
              primer_nombre           = @pn,
              segundo_nombre          = @sn,
              primer_apellido         = @pa,
              segundo_apellido        = @sa,
              fecha_nacimiento        = @fn,
              tipo_documento_id       = @tdoc,
              numero_documento        = @ndoc,
              pais_nacimiento         = @pais,
              departamento_nacimiento = @depto,
              ciudad_nacimiento       = @ciudad,
              barrio                  = @barrio,
              num_personas_vive       = @npv,
              num_hermanos            = @nh,
              nombre_colegio          = @col,
              grado_escolar           = @grado,
              tiene_discapacidad      = @disc,
              descripcion_discapacidad= @disc_desc,
              vive_con_nino           = @vive,
              genero                  = @genero,
              autorizacion            = @auth,
              tipo                    = @tipo
            WHERE id = @id
            """;
        upd.Parameters.AddWithValue("pn", dto.PrimerNombre.Trim());
        upd.Parameters.AddWithValue("sn", string.IsNullOrWhiteSpace(dto.SegundoNombre)   ? DBNull.Value : (object)dto.SegundoNombre.Trim());
        upd.Parameters.AddWithValue("pa", dto.PrimerApellido.Trim());
        upd.Parameters.AddWithValue("sa", string.IsNullOrWhiteSpace(dto.SegundoApellido) ? DBNull.Value : (object)dto.SegundoApellido.Trim());
        upd.Parameters.Add(new NpgsqlParameter("fn",   NpgsqlDbType.Date)     { Value = (object)dto.FechaNacimiento });
        upd.Parameters.Add(new NpgsqlParameter("tdoc", NpgsqlDbType.Smallint) { Value = (object?)tipoDocId ?? DBNull.Value });
        upd.Parameters.AddWithValue("ndoc",  dto.NumeroDocumento.Trim());
        upd.Parameters.AddWithValue("pais",  dto.PaisNacimiento.Trim());
        upd.Parameters.AddWithValue("depto", dto.DepartamentoNacimiento.Trim());
        upd.Parameters.AddWithValue("ciudad",dto.CiudadNacimiento.Trim());
        upd.Parameters.AddWithValue("barrio",dto.Barrio.Trim());
        upd.Parameters.Add(new NpgsqlParameter("npv",  NpgsqlDbType.Integer) { Value = (object)dto.NumPersonasVive!.Value });
        upd.Parameters.Add(new NpgsqlParameter("nh",   NpgsqlDbType.Integer) { Value = (object)dto.NumHermanos!.Value    });
        upd.Parameters.AddWithValue("col",   string.IsNullOrWhiteSpace(dto.NombreColegio) ? DBNull.Value : (object)dto.NombreColegio.Trim());
        upd.Parameters.AddWithValue("grado", string.IsNullOrWhiteSpace(dto.GradoEscolar) ? DBNull.Value : (object)dto.GradoEscolar.Trim());
        upd.Parameters.AddWithValue("disc",  dto.TieneDiscapacidad);
        upd.Parameters.AddWithValue("disc_desc", string.IsNullOrWhiteSpace(dto.DescripcionDiscapacidad) ? DBNull.Value : (object)dto.DescripcionDiscapacidad.Trim());
        upd.Parameters.Add(new NpgsqlParameter("vive", NpgsqlDbType.Boolean) { Value = (object?)dto.ViveConNino ?? DBNull.Value });
        upd.Parameters.AddWithValue("genero",dto.Genero.Trim());
        upd.Parameters.AddWithValue("auth",  dto.Autorizacion);
        upd.Parameters.AddWithValue("tipo",  string.IsNullOrWhiteSpace(dto.Tipo) ? "niño" : dto.Tipo.Trim());
        upd.Parameters.AddWithValue("id",    id);
        await upd.ExecuteNonQueryAsync();

        await GuardarDependientesAsync(conn, tx, id, dto, epsId, isNew: false);
        await RegistrarAuditAsync(conn, tx, "beneficiario", id.ToString(), dto.NombreCompleto, "editado");

        await tx.CommitAsync();

        await using var conn2 = AbrirConexion();
        await conn2.OpenAsync();
        var resultDtos = await CargarDtosAsync(conn2, [id]);
        return Ok(resultDtos[0]);
    }

    // =========================================================================
    // PATCH api/beneficiarios/{id}/baja
    // =========================================================================
    public record DarDeBajaDto(string? Motivo);

    [HttpPatch("{id:guid}/baja")]
    [Authorize]
    public async Task<IActionResult> DarDeBaja(Guid id, [FromBody] DarDeBajaDto? dto)
    {
        if (!EsAdmin()) return Forbid();
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "UPDATE beneficiarios SET activo = false, motivo_baja = @motivo WHERE id = @id";
        cmd.Parameters.AddWithValue("motivo", string.IsNullOrWhiteSpace(dto?.Motivo) ? DBNull.Value : (object)dto.Motivo.Trim());
        cmd.Parameters.AddWithValue("id", id);
        if (await cmd.ExecuteNonQueryAsync() == 0) return NotFound();

        var dtos = await CargarDtosAsync(conn, [id]);
        var motivoLog = string.IsNullOrWhiteSpace(dto?.Motivo) ? null : $"Motivo: {dto.Motivo.Trim()}";
        await RegistrarAuditAsync(conn, null, "beneficiario", id.ToString(), dtos[0].NombreMenor, "baja", motivoLog);
        return Ok(dtos[0]);
    }

    // =========================================================================
    // PATCH api/beneficiarios/{id}/reactivar
    // =========================================================================
    [HttpPatch("{id:guid}/reactivar")]
    [Authorize]
    public async Task<IActionResult> Reactivar(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "UPDATE beneficiarios SET activo = true, motivo_baja = NULL WHERE id = @id";
        cmd.Parameters.AddWithValue("id", id);
        if (await cmd.ExecuteNonQueryAsync() == 0) return NotFound();

        var dtos = await CargarDtosAsync(conn, [id]);
        await RegistrarAuditAsync(conn, null, "beneficiario", id.ToString(), dtos[0].NombreMenor, "reactivado");
        return Ok(dtos[0]);
    }

    // =========================================================================
    // DELETE api/beneficiarios/{id}
    // =========================================================================
    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        if (!EsAdmin()) return Forbid();

        await using var conn = AbrirConexion();
        await conn.OpenAsync();

        // Existencia y nombre (para audit log)
        await using var exCmd = conn.CreateCommand();
        exCmd.CommandText = "SELECT concat_ws(' ', primer_nombre, segundo_nombre, primer_apellido, segundo_apellido) FROM beneficiarios WHERE id = @id";
        exCmd.Parameters.AddWithValue("id", id);
        var nombreBen = await exCmd.ExecuteScalarAsync() as string;
        if (nombreBen == null) return NotFound();

        // Tablas que bloquean la eliminación
        await using var chkIns = conn.CreateCommand();
        chkIns.CommandText = "SELECT COUNT(*)::int FROM inscripciones WHERE beneficiario_id = @id";
        chkIns.Parameters.AddWithValue("id", id);
        var cntIns = (int)(await chkIns.ExecuteScalarAsync())!;

        await using var chkMov = conn.CreateCommand();
        chkMov.CommandText = "SELECT COUNT(*)::int FROM inventario_movimientos WHERE beneficiario_id = @id";
        chkMov.Parameters.AddWithValue("id", id);
        var cntMov = (int)(await chkMov.ExecuteScalarAsync())!;

        if (cntIns > 0 || cntMov > 0)
        {
            var partes = new List<string>();
            if (cntIns > 0) partes.Add($"{cntIns} inscripción{(cntIns > 1 ? "es" : "")} a programa{(cntIns > 1 ? "s" : "")}");
            if (cntMov > 0) partes.Add($"{cntMov} movimiento{(cntMov > 1 ? "s" : "")} de inventario");
            return Conflict(new { mensaje = $"No se puede eliminar: el beneficiario tiene {string.Join(" y ", partes)} vinculados." });
        }

        // Eliminar en orden: sub-tablas de perfil → archivos → log → beneficiario
        await using var tx = await conn.BeginTransactionAsync();
        try
        {
            foreach (var tabla in new[] { "beneficiario_alergia", "beneficiario_talla",
                                          "beneficiario_salud",   "beneficiario_acudiente",
                                          "actividad_asistencia" })
            {
                await using var del = conn.CreateCommand();
                del.Transaction  = tx;
                del.CommandText  = $"DELETE FROM {tabla} WHERE beneficiario_id = @id";
                del.Parameters.AddWithValue("id", id);
                await del.ExecuteNonQueryAsync();
            }

            await using var delArch = conn.CreateCommand();
            delArch.Transaction = tx;
            delArch.CommandText = "DELETE FROM archivos WHERE entidad_tipo = 'beneficiario' AND entidad_id = @id";
            delArch.Parameters.AddWithValue("id", id);
            await delArch.ExecuteNonQueryAsync();

            await using var delLog = conn.CreateCommand();
            delLog.Transaction = tx;
            delLog.CommandText = "DELETE FROM log_descargas WHERE beneficiario_id = @id";
            delLog.Parameters.AddWithValue("id", id);
            await delLog.ExecuteNonQueryAsync();

            await RegistrarAuditAsync(conn, tx, "beneficiario", id.ToString(), nombreBen, "eliminado");

            await using var delBen = conn.CreateCommand();
            delBen.Transaction = tx;
            delBen.CommandText = "DELETE FROM beneficiarios WHERE id = @id";
            delBen.Parameters.AddWithValue("id", id);
            await delBen.ExecuteNonQueryAsync();

            await tx.CommitAsync();
            return NoContent();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    // Valida campos obligatorios del DTO antes de tocar la BD.
    private static List<string> ValidarBeneficiario(CrearBeneficiarioDto dto)
    {
        var e = new List<string>();
        if (string.IsNullOrWhiteSpace(dto.NumeroDocumento))       e.Add("El número de documento es obligatorio.");
        if (string.IsNullOrWhiteSpace(dto.Genero))                e.Add("El género es obligatorio.");
        if (string.IsNullOrWhiteSpace(dto.PaisNacimiento))        e.Add("El país de nacimiento es obligatorio.");
        if (string.IsNullOrWhiteSpace(dto.DepartamentoNacimiento))e.Add("El departamento es obligatorio.");
        if (string.IsNullOrWhiteSpace(dto.CiudadNacimiento))      e.Add("La ciudad es obligatoria.");
        if (string.IsNullOrWhiteSpace(dto.Barrio))                e.Add("El barrio es obligatorio.");
        if (!dto.NumPersonasVive.HasValue)                        e.Add("El N.º de personas con quienes vive es obligatorio.");
        if (!dto.NumHermanos.HasValue)                            e.Add("El N.º de hermanos es obligatorio.");
        if (string.IsNullOrWhiteSpace(dto.Eps))                   e.Add("La EPS es obligatoria.");
        if (string.IsNullOrWhiteSpace(dto.TallaCamisa))           e.Add("La talla de camisa es obligatoria.");
        if (string.IsNullOrWhiteSpace(dto.TallaPantalon))         e.Add("La talla de pantalón es obligatoria.");
        if (string.IsNullOrWhiteSpace(dto.TallaZapatos))          e.Add("La talla de zapatos es obligatoria.");
        if (!dto.PesoKg.HasValue)                                 e.Add("El peso es obligatorio.");
        if (!dto.TallaCm.HasValue)                                e.Add("La talla/altura es obligatoria.");
        var esNino = string.IsNullOrWhiteSpace(dto.Tipo) || dto.Tipo.ToLower() == "niño";
        if (esNino)
        {
            if (string.IsNullOrWhiteSpace(dto.NombreAcudiente))   e.Add("El nombre del acudiente es obligatorio.");
            if (string.IsNullOrWhiteSpace(dto.Parentesco))        e.Add("El parentesco es obligatorio.");
            if (string.IsNullOrWhiteSpace(dto.Whatsapp))          e.Add("El WhatsApp del acudiente es obligatorio.");
            if (!dto.ViveConNino.HasValue)                        e.Add("Debe indicar si el acudiente vive con el niño.");
            if (string.IsNullOrWhiteSpace(dto.Direccion))         e.Add("La dirección es obligatoria.");
        }
        return e;
    }

    // Devuelve true si el JWT corresponde a un administrador (o sesión legacy sin claim de rol).
    private bool EsAdmin()
    {
        var rol = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
        return string.IsNullOrEmpty(rol) || rol is "administrador" or "Admin";
    }

    // =========================================================================
    // GET api/beneficiarios/{id}/historial
    // =========================================================================
    [HttpGet("{id:guid}/historial")]
    [Authorize]
    public async Task<IActionResult> Historial(Guid id, [FromQuery] int limite = 50)
    {
        limite = Math.Clamp(limite, 1, 200);
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT id, accion, usuario_email, detalle, fecha
            FROM audit_log
            WHERE entidad_tipo = 'beneficiario' AND entidad_id = @id
            ORDER BY fecha DESC
            LIMIT @limite
            """;
        cmd.Parameters.AddWithValue("id",     id);
        cmd.Parameters.AddWithValue("limite", limite);

        var result = new List<object>();
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
        {
            result.Add(new
            {
                id           = r.GetGuid(0),
                accion       = r.GetString(1),
                usuarioEmail = r.IsDBNull(2) ? null : r.GetString(2),
                detalle      = r.IsDBNull(3) ? null : r.GetString(3),
                fecha        = r.GetDateTime(4),
            });
        }
        return Ok(result);
    }

    // =========================================================================
    // POST api/beneficiarios/importar-csv
    // =========================================================================
    [HttpPost("importar-csv")]
    [Authorize]
    [RequestSizeLimit(5_242_880)]
    public async Task<IActionResult> ImportarCsv(IFormFile archivo)
    {
        if (archivo is null || archivo.Length == 0)
            return BadRequest(new { mensaje = "Archivo CSV requerido." });

        using var reader = new System.IO.StreamReader(archivo.OpenReadStream(), System.Text.Encoding.UTF8);
        var lineas = new List<string>();
        string? linea;
        while ((linea = await reader.ReadLineAsync()) is not null)
            lineas.Add(linea);

        if (lineas.Count < 2)
            return BadRequest(new { mensaje = "El archivo debe tener al menos una fila de datos además del encabezado." });

        var headers = ParseCsvRow(lineas[0]).Select(h => h.Trim().ToLowerInvariant()).ToArray();
        int IdxOf(string name) => Array.IndexOf(headers, name);

        var iNombre  = IdxOf("nombre");
        var iFn      = IdxOf("fecha_nacimiento");
        var iTdoc    = IdxOf("tipo_documento");
        var iNdoc    = IdxOf("numero_documento");
        var iGenero  = IdxOf("genero");
        var iPais    = IdxOf("pais_nacimiento");
        var iDepto   = IdxOf("departamento_nacimiento");
        var iCiudad  = IdxOf("ciudad_nacimiento");
        var iBarrio  = IdxOf("barrio");
        var iColegio = IdxOf("nombre_colegio");
        var iGrado   = IdxOf("grado_escolar");

        if (iNombre < 0)
            return BadRequest(new { mensaje = "El CSV debe tener una columna 'nombre'." });

        var insertados = 0;
        var omitidos   = 0;
        var errores    = new List<object>();

        await using var conn = AbrirConexion();
        await conn.OpenAsync();

        for (int fi = 1; fi < lineas.Count; fi++)
        {
            var row = ParseCsvRow(lineas[fi]);
            if (row.Length == 0 || (row.Length == 1 && string.IsNullOrWhiteSpace(row[0]))) continue;

            string Cell(int idx) => idx >= 0 && idx < row.Length ? row[idx].Trim() : "";

            var nombre = Cell(iNombre);
            if (string.IsNullOrWhiteSpace(nombre))
            {
                errores.Add(new { fila = fi + 1, nombre = "(vacío)", motivo = "El nombre es obligatorio." });
                continue;
            }

            var ndoc = Cell(iNdoc);
            if (!string.IsNullOrWhiteSpace(ndoc))
            {
                await using var chk = conn.CreateCommand();
                chk.CommandText = "SELECT COUNT(*)::int FROM beneficiarios WHERE numero_documento = @doc";
                chk.Parameters.AddWithValue("doc", ndoc);
                if ((int)(await chk.ExecuteScalarAsync())! > 0) { omitidos++; continue; }
            }

            await using var tx = await conn.BeginTransactionAsync();
            try
            {
                DateOnly? fechaNac = null;
                var fnStr = Cell(iFn);
                if (!string.IsNullOrWhiteSpace(fnStr) && DateOnly.TryParse(fnStr, out var fd))
                    fechaNac = fd;

                var tipoDocId = await ResolverTipoDocumentoIdAsync(conn, tx, Cell(iTdoc));

                await using var ins = conn.CreateCommand();
                ins.Transaction = tx;
                ins.CommandText = """
                    INSERT INTO beneficiarios (
                      nombre, fecha_nacimiento, tipo_documento_id, numero_documento,
                      pais_nacimiento, departamento_nacimiento, ciudad_nacimiento, barrio,
                      nombre_colegio, grado_escolar, tiene_discapacidad, genero,
                      autorizacion, activo
                    ) VALUES (
                      @nombre, @fn, @tdoc, @ndoc,
                      @pais, @depto, @ciudad, @barrio,
                      @col, @grado, false, @genero,
                      false, true
                    )
                    """;
                ins.Parameters.AddWithValue("nombre", nombre);
                ins.Parameters.Add(new NpgsqlParameter("fn",   NpgsqlDbType.Date)     { Value = (object?)fechaNac ?? DBNull.Value });
                ins.Parameters.Add(new NpgsqlParameter("tdoc", NpgsqlDbType.Smallint) { Value = (object?)tipoDocId ?? DBNull.Value });
                ins.Parameters.AddWithValue("ndoc",   string.IsNullOrWhiteSpace(ndoc)           ? DBNull.Value : (object)ndoc);
                ins.Parameters.AddWithValue("pais",   string.IsNullOrWhiteSpace(Cell(iPais))    ? DBNull.Value : (object)Cell(iPais));
                ins.Parameters.AddWithValue("depto",  string.IsNullOrWhiteSpace(Cell(iDepto))   ? DBNull.Value : (object)Cell(iDepto));
                ins.Parameters.AddWithValue("ciudad", string.IsNullOrWhiteSpace(Cell(iCiudad))  ? DBNull.Value : (object)Cell(iCiudad));
                ins.Parameters.AddWithValue("barrio", string.IsNullOrWhiteSpace(Cell(iBarrio))  ? DBNull.Value : (object)Cell(iBarrio));
                ins.Parameters.AddWithValue("col",    string.IsNullOrWhiteSpace(Cell(iColegio)) ? DBNull.Value : (object)Cell(iColegio));
                ins.Parameters.AddWithValue("grado",  string.IsNullOrWhiteSpace(Cell(iGrado))   ? DBNull.Value : (object)Cell(iGrado));
                ins.Parameters.AddWithValue("genero", string.IsNullOrWhiteSpace(Cell(iGenero))  ? DBNull.Value : (object)Cell(iGenero));

                await ins.ExecuteNonQueryAsync();
                await tx.CommitAsync();
                insertados++;
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                errores.Add(new { fila = fi + 1, nombre, motivo = ex.Message });
            }
        }

        return Ok(new { total = lineas.Count - 1, insertados, omitidos, errores });
    }

    // =========================================================================
    // POST api/beneficiarios/importar-xlsx
    // =========================================================================
    [HttpPost("importar-xlsx")]
    [Authorize]
    public async Task<IActionResult> ImportarXlsx(
        [FromBody] List<ImportarBeneficiarioRowDto> filas, CancellationToken ct)
    {
        if (filas is null || filas.Count == 0)
            return BadRequest(new { mensaje = "No hay filas para importar." });

        var insertados = 0;
        var omitidos   = 0;
        var errores    = new List<object>();

        await using var conn = AbrirConexion();
        await conn.OpenAsync(ct);

        static DateOnly? ParseFecha(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return null;
            var formats = new[] { "yyyy-MM-dd", "dd/MM/yyyy", "d/M/yyyy", "MM/dd/yyyy", "M/d/yyyy" };
            if (DateOnly.TryParseExact(s.Trim(), formats,
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out var d)) return d;
            if (DateOnly.TryParse(s.Trim(), out var d2)) return d2;
            return null;
        }

        for (int fi = 0; fi < filas.Count; fi++)
        {
            var fila   = filas[fi];
            var nombre = $"{fila.PrimerNombre?.Trim()} {fila.PrimerApellido?.Trim()}".Trim();

            if (string.IsNullOrWhiteSpace(fila.PrimerNombre) || string.IsNullOrWhiteSpace(fila.PrimerApellido))
            {
                errores.Add(new { fila = fi + 2, nombre = nombre.Length > 0 ? nombre : "(vacío)",
                    motivo = "PRIMER_NOMBRE y PRIMER_APELLIDO son obligatorios." });
                continue;
            }

            var fechaNac = ParseFecha(fila.FechaNacimiento);
            if (fechaNac is null)
            {
                errores.Add(new { fila = fi + 2, nombre,
                    motivo = "FECHA_NACIMIENTO inválida. Use formato AAAA-MM-DD." });
                continue;
            }

            var ndoc = fila.NumeroDocumento?.Trim();
            if (!string.IsNullOrWhiteSpace(ndoc))
            {
                await using var chk = conn.CreateCommand();
                chk.CommandText = "SELECT COUNT(*)::int FROM beneficiarios WHERE numero_documento = @doc";
                chk.Parameters.AddWithValue("doc", ndoc);
                if ((int)(await chk.ExecuteScalarAsync(ct))! > 0) { omitidos++; continue; }
            }

            await using var tx = await conn.BeginTransactionAsync(ct);
            try
            {
                var dto = new CrearBeneficiarioDto
                {
                    PrimerNombre    = fila.PrimerNombre!.Trim(),
                    SegundoNombre   = string.IsNullOrWhiteSpace(fila.SegundoNombre)   ? null : fila.SegundoNombre.Trim(),
                    PrimerApellido  = fila.PrimerApellido!.Trim(),
                    SegundoApellido = string.IsNullOrWhiteSpace(fila.SegundoApellido) ? null : fila.SegundoApellido.Trim(),
                    FechaNacimiento = fechaNac.Value,
                    TipoDocumento   = fila.TipoDocumento  ?? "",
                    NumeroDocumento = string.IsNullOrWhiteSpace(ndoc) ? null : ndoc,
                    Genero          = fila.Genero?.Trim(),
                    Eps             = fila.Eps?.Trim(),
                    NombreAcudiente = fila.NombreAcudiente?.Trim(),
                    Parentesco      = fila.Parentesco?.Trim(),
                    Whatsapp        = fila.Whatsapp?.Trim(),
                    Direccion       = fila.Direccion?.Trim(),
                    GradoEscolar    = fila.GradoEscolar?.Trim(),
                    NombreColegio   = fila.NombreColegio?.Trim(),
                    TieneAlergia    = string.IsNullOrWhiteSpace(fila.TieneAlergia) ? "no" : fila.TieneAlergia.Trim().ToLower(),
                    DescripcionAlergia = fila.DescripcionAlergia?.Trim(),
                    Tipo            = string.IsNullOrWhiteSpace(fila.Tipo) ? "niño" : fila.Tipo.Trim(),
                };

                var tipoDocId = await ResolverTipoDocumentoIdAsync(conn, tx, dto.TipoDocumento);
                var epsId     = await ResolverEpsIdAsync(conn, tx, dto.Eps);

                await using var ins = conn.CreateCommand();
                ins.Transaction = tx;
                ins.CommandText = """
                    INSERT INTO beneficiarios (
                      primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
                      fecha_nacimiento, tipo_documento_id, numero_documento,
                      pais_nacimiento, departamento_nacimiento, ciudad_nacimiento, barrio,
                      num_personas_vive, num_hermanos, nombre_colegio, grado_escolar,
                      tiene_discapacidad, descripcion_discapacidad, vive_con_nino,
                      genero, autorizacion, tipo, activo
                    ) VALUES (
                      @pn, @sn, @pa, @sa,
                      @fn, @tdoc, @ndoc,
                      NULL, NULL, NULL, NULL,
                      NULL, NULL, @col, @grado,
                      false, NULL, NULL,
                      @genero, false, @tipo, true
                    ) RETURNING id
                    """;
                ins.Parameters.AddWithValue("pn", dto.PrimerNombre);
                ins.Parameters.AddWithValue("sn", (object?)dto.SegundoNombre   ?? DBNull.Value);
                ins.Parameters.AddWithValue("pa", dto.PrimerApellido);
                ins.Parameters.AddWithValue("sa", (object?)dto.SegundoApellido ?? DBNull.Value);
                ins.Parameters.Add(new NpgsqlParameter("fn",   NpgsqlDbType.Date)     { Value = fechaNac.Value });
                ins.Parameters.Add(new NpgsqlParameter("tdoc", NpgsqlDbType.Smallint) { Value = (object?)tipoDocId ?? DBNull.Value });
                ins.Parameters.AddWithValue("ndoc",  (object?)dto.NumeroDocumento ?? DBNull.Value);
                ins.Parameters.AddWithValue("col",   (object?)dto.NombreColegio   ?? DBNull.Value);
                ins.Parameters.AddWithValue("grado", (object?)dto.GradoEscolar    ?? DBNull.Value);
                ins.Parameters.AddWithValue("genero",(object?)dto.Genero           ?? DBNull.Value);
                ins.Parameters.AddWithValue("tipo",  dto.Tipo);

                var newId = (Guid)(await ins.ExecuteScalarAsync(ct))!;

                await GuardarDependientesAsync(conn, tx, newId, dto, epsId, isNew: true);
                await RegistrarAuditAsync(conn, tx, "beneficiario", newId.ToString(), dto.NombreCompleto, "creado");

                await tx.CommitAsync(ct);
                insertados++;
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync(ct);
                errores.Add(new { fila = fi + 2, nombre, motivo = ex.Message });
            }
        }

        return Ok(new { total = filas.Count, insertados, omitidos, errores });
    }

    private static string[] ParseCsvRow(string line)
    {
        var result  = new List<string>();
        var current = new System.Text.StringBuilder();
        bool inQuotes = false;
        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];
            if (c == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"') { current.Append('"'); i++; }
                else inQuotes = !inQuotes;
            }
            else if (c == ',' && !inQuotes) { result.Add(current.ToString()); current.Clear(); }
            else current.Append(c);
        }
        result.Add(current.ToString());
        return result.ToArray();
    }

    // =========================================================================
    // HELPERS PRIVADOS
    // =========================================================================

    private static async Task<bool> BeneficiarioExisteAsync(NpgsqlConnection conn, NpgsqlTransaction tx, Guid id)
    {
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = "SELECT COUNT(*)::int FROM beneficiarios WHERE id = @id";
        cmd.Parameters.AddWithValue("id", id);
        return (int)(await cmd.ExecuteScalarAsync())! > 0;
    }

    private static async Task<short?> ResolverTipoDocumentoIdAsync(NpgsqlConnection conn, NpgsqlTransaction tx, string? codigo)
    {
        if (string.IsNullOrWhiteSpace(codigo)) return null;
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = "SELECT id FROM cat_tipos_documento WHERE UPPER(codigo) = UPPER(@c) LIMIT 1";
        cmd.Parameters.AddWithValue("c", codigo.Trim());
        var v = await cmd.ExecuteScalarAsync();
        return v is null ? null : (short?)Convert.ToInt16(v);
    }

    private static async Task<short?> ResolverEpsIdAsync(NpgsqlConnection conn, NpgsqlTransaction tx, string? nombre)
    {
        if (string.IsNullOrWhiteSpace(nombre)) return null;
        var n = nombre.Trim();

        await using var sel = conn.CreateCommand();
        sel.Transaction = tx;
        sel.CommandText = "SELECT id FROM cat_eps WHERE LOWER(nombre) = LOWER(@n) LIMIT 1";
        sel.Parameters.AddWithValue("n", n);
        var v = await sel.ExecuteScalarAsync();
        if (v is not null) return (short?)Convert.ToInt16(v);

        // Create new EPS
        await using var ins = conn.CreateCommand();
        ins.Transaction = tx;
        ins.CommandText = "INSERT INTO cat_eps (nombre, activo) VALUES (@n, true) RETURNING id";
        ins.Parameters.AddWithValue("n", n);
        return (short?)Convert.ToInt16(await ins.ExecuteScalarAsync());
    }

    private static async Task<short?> ResolverParentescoIdAsync(NpgsqlConnection conn, NpgsqlTransaction tx, string? nombre)
    {
        if (string.IsNullOrWhiteSpace(nombre)) return null;
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = "SELECT id FROM cat_parentescos WHERE LOWER(nombre) = LOWER(@n) LIMIT 1";
        cmd.Parameters.AddWithValue("n", nombre.Trim());
        var v = await cmd.ExecuteScalarAsync();
        return v is null ? null : (short?)Convert.ToInt16(v);
    }

    private static async Task<short?> ResolverTipoArchivoIdAsync(NpgsqlConnection conn, NpgsqlTransaction? tx, string nombre)
    {
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = "SELECT id FROM cat_tipo_archivo WHERE nombre = @n LIMIT 1";
        cmd.Parameters.AddWithValue("n", nombre);
        var v = await cmd.ExecuteScalarAsync();
        return v is null ? null : (short?)Convert.ToInt16(v);
    }

    private static async Task GuardarDependientesAsync(
        NpgsqlConnection conn, NpgsqlTransaction tx, Guid benId, CrearBeneficiarioDto dto, short? epsId, bool isNew)
    {
        // ── Acudiente ──────────────────────────────────────────────────────────
        if (!string.IsNullOrWhiteSpace(dto.NombreAcudiente))
        {
            var nombreAcu   = dto.NombreAcudiente.Trim();
            var whatsappAcu = dto.Whatsapp?.Trim()  ?? "";
            var direccAcu   = dto.Direccion?.Trim() ?? "";
            Guid? acudienteId = null;

            if (!isNew)
            {
                // Update existing principal acudiente
                await using var updAcu = conn.CreateCommand();
                updAcu.Transaction = tx;
                updAcu.CommandText = """
                    UPDATE acudientes SET nombre = @n, whatsapp = @w, direccion = @d
                    WHERE id = (
                      SELECT bac.acudiente_id FROM beneficiario_acudiente bac
                      WHERE bac.beneficiario_id = @bid AND bac.es_principal = true AND bac.activo = true
                      LIMIT 1
                    )
                    RETURNING id
                    """;
                updAcu.Parameters.AddWithValue("n",   nombreAcu);
                updAcu.Parameters.AddWithValue("w",   whatsappAcu);
                updAcu.Parameters.AddWithValue("d",   direccAcu);
                updAcu.Parameters.AddWithValue("bid", benId);
                var updId = await updAcu.ExecuteScalarAsync();
                if (updId is not null) acudienteId = (Guid)updId;
            }

            if (acudienteId is null)
            {
                // Find or create acudiente
                await using var findAcu = conn.CreateCommand();
                findAcu.Transaction = tx;
                findAcu.CommandText = """
                    SELECT id FROM acudientes
                    WHERE LOWER(nombre) = LOWER(@n) AND COALESCE(whatsapp,'') = COALESCE(@w,'')
                    LIMIT 1
                    """;
                findAcu.Parameters.AddWithValue("n", nombreAcu);
                findAcu.Parameters.AddWithValue("w", (object?)whatsappAcu ?? DBNull.Value);
                var found = await findAcu.ExecuteScalarAsync();

                if (found is not null)
                {
                    acudienteId = (Guid)found;
                }
                else
                {
                    await using var insAcu = conn.CreateCommand();
                    insAcu.Transaction = tx;
                    insAcu.CommandText = "INSERT INTO acudientes (nombre, whatsapp, direccion, activo) VALUES (@n,@w,@d,true) RETURNING id";
                    insAcu.Parameters.AddWithValue("n", nombreAcu);
                    insAcu.Parameters.AddWithValue("w", whatsappAcu);
                    insAcu.Parameters.AddWithValue("d", direccAcu);
                    acudienteId = (Guid)(await insAcu.ExecuteScalarAsync())!;
                }

                var parentescoId = await ResolverParentescoIdAsync(conn, tx, dto.Parentesco);

                // Check if relation already exists
                await using var relChk = conn.CreateCommand();
                relChk.Transaction = tx;
                relChk.CommandText = "SELECT id FROM beneficiario_acudiente WHERE beneficiario_id = @b AND acudiente_id = @a";
                relChk.Parameters.AddWithValue("b", benId);
                relChk.Parameters.AddWithValue("a", acudienteId);
                var relId = await relChk.ExecuteScalarAsync();

                if (relId is null)
                {
                    // Demote previous principal
                    await using var demote = conn.CreateCommand();
                    demote.Transaction = tx;
                    demote.CommandText = "UPDATE beneficiario_acudiente SET es_principal = false WHERE beneficiario_id = @b AND es_principal = true";
                    demote.Parameters.AddWithValue("b", benId);
                    await demote.ExecuteNonQueryAsync();

                    await using var insRel = conn.CreateCommand();
                    insRel.Transaction = tx;
                    insRel.CommandText = """
                        INSERT INTO beneficiario_acudiente (beneficiario_id, acudiente_id, parentesco_id, es_principal, activo)
                        VALUES (@b, @a, @p, true, true)
                        """;
                    insRel.Parameters.AddWithValue("b", benId);
                    insRel.Parameters.AddWithValue("a", acudienteId.Value);
                    insRel.Parameters.Add(new NpgsqlParameter("p", NpgsqlDbType.Smallint) { Value = (object?)parentescoId ?? DBNull.Value });
                    await insRel.ExecuteNonQueryAsync();
                }
                else
                {
                    await using var updRel = conn.CreateCommand();
                    updRel.Transaction = tx;
                    updRel.CommandText = "UPDATE beneficiario_acudiente SET parentesco_id = @p, es_principal = true WHERE id = @id";
                    updRel.Parameters.Add(new NpgsqlParameter("p", NpgsqlDbType.Smallint) { Value = (object?)parentescoId ?? DBNull.Value });
                    updRel.Parameters.AddWithValue("id", (Guid)relId);
                    await updRel.ExecuteNonQueryAsync();
                }
            }
            else
            {
                // Update parentesco of existing principal relation
                var parentescoId = await ResolverParentescoIdAsync(conn, tx, dto.Parentesco);
                await using var updPar = conn.CreateCommand();
                updPar.Transaction = tx;
                updPar.CommandText = "UPDATE beneficiario_acudiente SET parentesco_id = @p WHERE beneficiario_id = @b AND es_principal = true";
                updPar.Parameters.Add(new NpgsqlParameter("p", NpgsqlDbType.Smallint) { Value = (object?)parentescoId ?? DBNull.Value });
                updPar.Parameters.AddWithValue("b", benId);
                await updPar.ExecuteNonQueryAsync();
            }
        }

        // ── Salud ─────────────────────────────────────────────────────────────
        await using var saludChk = conn.CreateCommand();
        saludChk.Transaction = tx;
        saludChk.CommandText = "SELECT COUNT(*)::int FROM beneficiario_salud WHERE beneficiario_id = @b";
        saludChk.Parameters.AddWithValue("b", benId);
        var saludExists = (int)(await saludChk.ExecuteScalarAsync())! > 0;

        await using var saludCmd = conn.CreateCommand();
        saludCmd.Transaction = tx;
        saludCmd.CommandText = saludExists
            ? "UPDATE beneficiario_salud SET eps_id = @eps, observaciones = @obs WHERE beneficiario_id = @b"
            : "INSERT INTO beneficiario_salud (beneficiario_id, eps_id, observaciones, activo) VALUES (@b, @eps, @obs, true)";
        saludCmd.Parameters.AddWithValue("b",   benId);
        saludCmd.Parameters.Add(new NpgsqlParameter("eps", NpgsqlDbType.Smallint) { Value = (object?)epsId ?? DBNull.Value });
        saludCmd.Parameters.AddWithValue("obs",  dto.ObservacionesSalud?.Trim() ?? "");
        await saludCmd.ExecuteNonQueryAsync();

        // ── Alergias ──────────────────────────────────────────────────────────
        if (dto.TieneAlergia?.ToLower() == "si")
        {
            await using var alChk = conn.CreateCommand();
            alChk.Transaction = tx;
            alChk.CommandText = "SELECT COUNT(*)::int FROM beneficiario_alergia WHERE beneficiario_id = @b AND activo = true";
            alChk.Parameters.AddWithValue("b", benId);
            var tieneAlergia = (int)(await alChk.ExecuteScalarAsync())! > 0;

            if (!tieneAlergia)
            {
                // Get or create generic allergy in catalog
                await using var catChk = conn.CreateCommand();
                catChk.Transaction = tx;
                catChk.CommandText = "SELECT id FROM alergias_catalogo WHERE nombre = 'Alergia registrada (detalle pendiente)' LIMIT 1";
                var catId = await catChk.ExecuteScalarAsync();
                if (catId is null)
                {
                    await using var catIns = conn.CreateCommand();
                    catIns.Transaction = tx;
                    catIns.CommandText = "INSERT INTO alergias_catalogo (nombre, activo) VALUES ('Alergia registrada (detalle pendiente)', true) RETURNING id";
                    catId = await catIns.ExecuteScalarAsync();
                }

                await using var alIns = conn.CreateCommand();
                alIns.Transaction = tx;
                alIns.CommandText = "INSERT INTO beneficiario_alergia (beneficiario_id, alergia_id, descripcion, activo) VALUES (@b, @al, @desc, true)";
                alIns.Parameters.AddWithValue("b",    benId);
                alIns.Parameters.AddWithValue("al",   Convert.ToInt32(catId));
                alIns.Parameters.AddWithValue("desc", string.IsNullOrWhiteSpace(dto.DescripcionAlergia) ? DBNull.Value : (object)dto.DescripcionAlergia.Trim());
                await alIns.ExecuteNonQueryAsync();
            }
            else
            {
                await using var alUpd = conn.CreateCommand();
                alUpd.Transaction = tx;
                alUpd.CommandText = "UPDATE beneficiario_alergia SET descripcion = @desc WHERE beneficiario_id = @b AND activo = true";
                alUpd.Parameters.AddWithValue("desc", string.IsNullOrWhiteSpace(dto.DescripcionAlergia) ? DBNull.Value : (object)dto.DescripcionAlergia.Trim());
                alUpd.Parameters.AddWithValue("b",    benId);
                await alUpd.ExecuteNonQueryAsync();
            }
        }
        else
        {
            await using var alDel = conn.CreateCommand();
            alDel.Transaction = tx;
            alDel.CommandText = "UPDATE beneficiario_alergia SET activo = false WHERE beneficiario_id = @b AND activo = true";
            alDel.Parameters.AddWithValue("b", benId);
            await alDel.ExecuteNonQueryAsync();
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
            await using var tlChk = conn.CreateCommand();
            tlChk.Transaction = tx;
            tlChk.CommandText = "SELECT id FROM beneficiario_talla WHERE beneficiario_id = @b AND activo = true ORDER BY fecha_medicion DESC LIMIT 1";
            tlChk.Parameters.AddWithValue("b", benId);
            var tlId = await tlChk.ExecuteScalarAsync();

            await using var tlCmd = conn.CreateCommand();
            tlCmd.Transaction = tx;
            if (tlId is null)
            {
                tlCmd.CommandText = """
                    INSERT INTO beneficiario_talla (beneficiario_id, talla_camisa, talla_pantalon, talla_zapatos, peso_kg, talla_cm, fecha_medicion, activo)
                    VALUES (@b, @tc, @tp, @tz, @pk, @cm, CURRENT_DATE, true)
                    """;
            }
            else
            {
                tlCmd.CommandText = "UPDATE beneficiario_talla SET talla_camisa=@tc, talla_pantalon=@tp, talla_zapatos=@tz, peso_kg=@pk, talla_cm=@cm WHERE id=@id";
                tlCmd.Parameters.AddWithValue("id", (Guid)tlId);
            }
            tlCmd.Parameters.AddWithValue("b",  benId);
            tlCmd.Parameters.AddWithValue("tc", string.IsNullOrWhiteSpace(dto.TallaCamisa)   ? "" : dto.TallaCamisa.Trim());
            tlCmd.Parameters.AddWithValue("tp", string.IsNullOrWhiteSpace(dto.TallaPantalon) ? "" : dto.TallaPantalon.Trim());
            tlCmd.Parameters.AddWithValue("tz", string.IsNullOrWhiteSpace(dto.TallaZapatos)  ? "" : dto.TallaZapatos.Trim());
            tlCmd.Parameters.Add(new NpgsqlParameter("pk", NpgsqlDbType.Numeric) { Value = (object?)(dto.PesoKg  ?? 0m) });
            tlCmd.Parameters.Add(new NpgsqlParameter("cm", NpgsqlDbType.Integer) { Value = (object?)(dto.TallaCm ?? 0)  });
            await tlCmd.ExecuteNonQueryAsync();
        }

        // ── Archivos (fotos) ──────────────────────────────────────────────────
        await ActualizarArchivoAsync(conn, tx, benId, "Foto del menor",           dto.FotoMenorUrl);
        await ActualizarArchivoAsync(conn, tx, benId, "Foto documento",           dto.FotoDocumentoUrl);
        await ActualizarArchivoAsync(conn, tx, benId, "Foto documento (reverso)", dto.FotoDocumentoReversoUrl);
    }

    private static async Task ActualizarArchivoAsync(
        NpgsqlConnection conn, NpgsqlTransaction tx, Guid benId, string tipoNombre, string? url)
    {
        var tipoId = await ResolverTipoArchivoIdAsync(conn, tx, tipoNombre);
        if (tipoId is null) return;

        await using var chk = conn.CreateCommand();
        chk.Transaction = tx;
        chk.CommandText = "SELECT id FROM archivos WHERE entidad_tipo = 'beneficiario' AND entidad_id = @b AND tipo_archivo_id = @t AND activo = true LIMIT 1";
        chk.Parameters.AddWithValue("b", benId);
        chk.Parameters.Add(new NpgsqlParameter("t", NpgsqlDbType.Smallint) { Value = tipoId });
        var existeId = await chk.ExecuteScalarAsync();

        if (string.IsNullOrWhiteSpace(url))
        {
            if (existeId is not null)
            {
                await using var del = conn.CreateCommand();
                del.Transaction = tx;
                del.CommandText = "UPDATE archivos SET activo = false WHERE id = @id";
                del.Parameters.AddWithValue("id", (Guid)existeId);
                await del.ExecuteNonQueryAsync();
            }
            return;
        }

        if (existeId is null)
        {
            await using var ins = conn.CreateCommand();
            ins.Transaction = tx;
            ins.CommandText = "INSERT INTO archivos (entidad_tipo, entidad_id, tipo_archivo_id, url, activo) VALUES ('beneficiario', @b, @t, @url, true)";
            ins.Parameters.AddWithValue("b",   benId);
            ins.Parameters.Add(new NpgsqlParameter("t", NpgsqlDbType.Smallint) { Value = tipoId });
            ins.Parameters.AddWithValue("url", url.Trim());
            await ins.ExecuteNonQueryAsync();
        }
        else
        {
            await using var upd = conn.CreateCommand();
            upd.Transaction = tx;
            upd.CommandText = "UPDATE archivos SET url = @url WHERE id = @id";
            upd.Parameters.AddWithValue("url", url.Trim());
            upd.Parameters.AddWithValue("id",  (Guid)existeId);
            await upd.ExecuteNonQueryAsync();
        }
    }

    // Loads complete BeneficiarioDto for a list of IDs using a single JOIN query
    private static async Task<List<BeneficiarioDto>> CargarDtosAsync(NpgsqlConnection conn, List<Guid> ids)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT
              b.id,
              concat_ws(' ', b.primer_nombre, b.segundo_nombre, b.primer_apellido, b.segundo_apellido) AS nombre_completo,
              b.fecha_nacimiento, b.numero_documento, b.activo, b.motivo_baja,
              b.fecha_creacion, b.pais_nacimiento, b.departamento_nacimiento, b.ciudad_nacimiento,
              b.barrio, b.num_personas_vive, b.num_hermanos, b.nombre_colegio, b.grado_escolar,
              b.tiene_discapacidad, b.descripcion_discapacidad, b.vive_con_nino, b.genero, b.autorizacion,
              COALESCE(ctd.codigo, '')             AS tipo_documento,
              bs.observaciones                     AS obs_salud,
              ce.nombre                            AS eps,
              acu.nombre                           AS acu_nombre,
              acu.whatsapp, acu.direccion,
              acu.parentesco,
              tl.talla_camisa, tl.talla_pantalon, tl.talla_zapatos, tl.peso_kg, tl.talla_cm,
              al.descripcion                       AS al_desc,
              al.al_cnt,
              af1.url                              AS foto_menor,
              af2.url                              AS foto_doc,
              af3.url                              AS foto_doc_rev,
              b.primer_nombre, b.segundo_nombre, b.primer_apellido, b.segundo_apellido,
              b.tipo
            FROM beneficiarios b
            LEFT JOIN cat_tipos_documento ctd ON ctd.id = b.tipo_documento_id
            LEFT JOIN beneficiario_salud bs ON bs.beneficiario_id = b.id
            LEFT JOIN cat_eps ce ON ce.id = bs.eps_id
            LEFT JOIN LATERAL (
              SELECT a.nombre, a.whatsapp, a.direccion, cp.nombre AS parentesco
              FROM beneficiario_acudiente bac
              JOIN acudientes a ON a.id = bac.acudiente_id
              LEFT JOIN cat_parentescos cp ON cp.id = bac.parentesco_id
              WHERE bac.beneficiario_id = b.id AND bac.es_principal = true AND bac.activo = true
              LIMIT 1
            ) acu ON true
            LEFT JOIN LATERAL (
              SELECT talla_camisa, talla_pantalon, talla_zapatos, peso_kg, talla_cm
              FROM beneficiario_talla
              WHERE beneficiario_id = b.id AND activo = true
              ORDER BY fecha_medicion DESC
              LIMIT 1
            ) tl ON true
            LEFT JOIN LATERAL (
              SELECT
                (SELECT descripcion FROM beneficiario_alergia WHERE beneficiario_id = b.id AND activo = true LIMIT 1) AS descripcion,
                (SELECT COUNT(*)::int FROM beneficiario_alergia WHERE beneficiario_id = b.id AND activo = true)       AS al_cnt
            ) al ON true
            LEFT JOIN LATERAL (
              SELECT ar.url FROM archivos ar
              JOIN cat_tipo_archivo cta ON cta.id = ar.tipo_archivo_id
              WHERE ar.entidad_tipo = 'beneficiario' AND ar.entidad_id = b.id AND ar.activo = true AND cta.nombre = 'Foto del menor'
              LIMIT 1
            ) af1 ON true
            LEFT JOIN LATERAL (
              SELECT ar.url FROM archivos ar
              JOIN cat_tipo_archivo cta ON cta.id = ar.tipo_archivo_id
              WHERE ar.entidad_tipo = 'beneficiario' AND ar.entidad_id = b.id AND ar.activo = true AND cta.nombre = 'Foto documento'
              LIMIT 1
            ) af2 ON true
            LEFT JOIN LATERAL (
              SELECT ar.url FROM archivos ar
              JOIN cat_tipo_archivo cta ON cta.id = ar.tipo_archivo_id
              WHERE ar.entidad_tipo = 'beneficiario' AND ar.entidad_id = b.id AND ar.activo = true AND cta.nombre = 'Foto documento (reverso)'
              LIMIT 1
            ) af3 ON true
            WHERE b.id = ANY(@ids)
            ORDER BY b.fecha_creacion DESC
            """;
        cmd.Parameters.Add(new NpgsqlParameter("ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = ids.ToArray() });

        var result = new List<BeneficiarioDto>();
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
        {
            result.Add(new BeneficiarioDto
            {
                Id                      = r.GetGuid(0),
                NombreMenor             = r.GetString(1),
                FechaNacimiento         = r.IsDBNull(2)  ? DateOnly.MinValue : DateOnly.FromDateTime(r.GetDateTime(2)),
                NumeroDocumento         = r.IsDBNull(3)  ? null : r.GetString(3),
                Activo                  = r.GetBoolean(4),
                MotivoBaja              = r.IsDBNull(5)  ? null : r.GetString(5),
                CreatedAt               = r.GetDateTime(6),
                PaisNacimiento          = r.IsDBNull(7)  ? null : r.GetString(7),
                DepartamentoNacimiento  = r.IsDBNull(8)  ? null : r.GetString(8),
                CiudadNacimiento        = r.IsDBNull(9)  ? null : r.GetString(9),
                Barrio                  = r.IsDBNull(10) ? null : r.GetString(10),
                NumPersonasVive         = r.IsDBNull(11) ? null : r.GetInt32(11),
                NumHermanos             = r.IsDBNull(12) ? null : r.GetInt32(12),
                NombreColegio           = r.IsDBNull(13) ? null : r.GetString(13),
                GradoEscolar            = r.IsDBNull(14) ? null : r.GetString(14),
                TieneDiscapacidad       = r.GetBoolean(15),
                DescripcionDiscapacidad = r.IsDBNull(16) ? null : r.GetString(16),
                ViveConNino             = r.IsDBNull(17) ? null : r.GetBoolean(17),
                Genero                  = r.IsDBNull(18) ? null : r.GetString(18),
                Autorizacion            = r.GetBoolean(19),
                TipoDocumento           = r.GetString(20),
                ObservacionesSalud      = r.IsDBNull(21) ? null : r.GetString(21),
                Eps                     = r.IsDBNull(22) ? null : r.GetString(22),
                NombreAcudiente         = r.IsDBNull(23) ? "" : r.GetString(23),
                Whatsapp                = r.IsDBNull(24) ? null : r.GetString(24),
                Direccion               = r.IsDBNull(25) ? null : r.GetString(25),
                Parentesco              = r.IsDBNull(26) ? null : r.GetString(26),
                TallaCamisa             = r.IsDBNull(27) ? null : r.GetString(27),
                TallaPantalon           = r.IsDBNull(28) ? null : r.GetString(28),
                TallaZapatos            = r.IsDBNull(29) ? null : r.GetString(29),
                PesoKg                  = r.IsDBNull(30) ? null : r.GetDecimal(30),
                TallaCm                 = r.IsDBNull(31) ? null : r.GetInt32(31),
                DescripcionAlergia      = r.IsDBNull(32) ? null : r.GetString(32),
                TieneAlergia            = r.GetInt32(33) > 0 ? "si" : "no",
                FotoMenorUrl            = r.IsDBNull(34) ? null : r.GetString(34),
                FotoDocumentoUrl        = r.IsDBNull(35) ? null : r.GetString(35),
                FotoDocumentoReversoUrl = r.IsDBNull(36) ? null : r.GetString(36),
                PrimerNombre            = r.IsDBNull(37) ? "" : r.GetString(37),
                SegundoNombre           = r.IsDBNull(38) ? null : r.GetString(38),
                PrimerApellido          = r.IsDBNull(39) ? "" : r.GetString(39),
                SegundoApellido         = r.IsDBNull(40) ? null : r.GetString(40),
                Tipo                    = r.IsDBNull(41) ? "niño" : r.GetString(41),
            });
        }
        return result;
    }
}
