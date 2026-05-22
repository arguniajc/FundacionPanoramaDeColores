using FundacionPanorama.Application.Features.Reportes.DTOs;
using FundacionPanorama.Application.Features.Reportes.Interfaces;
using Npgsql;

namespace FundacionPanorama.Infrastructure.Persistence.Repositories;

public class ReportesRepository(DbConnectionFactory factory) : IReportesRepository
{
    // ── Beneficiarios ─────────────────────────────────────────────────────────

    public async Task<BeneficiariosReporteDto> BeneficiariosAsync(int? anio, CancellationToken ct)
    {
        int year = anio ?? DateTime.UtcNow.Year;
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);

        var resumen         = await QueryResumenBeneficiarios(conn, ct);
        var porEdad         = await QueryGrupo(conn, ct, """
            SELECT
              CASE
                WHEN fecha_nacimiento IS NULL THEN 'Sin registro'
                WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento::date)) BETWEEN 0  AND 5  THEN '0-5 años'
                WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento::date)) BETWEEN 6  AND 10 THEN '6-10 años'
                WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento::date)) BETWEEN 11 AND 15 THEN '11-15 años'
                WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento::date)) BETWEEN 16 AND 18 THEN '16-18 años'
                WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento::date)) BETWEEN 19 AND 25 THEN '19-25 años'
                WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento::date)) BETWEEN 26 AND 35 THEN '26-35 años'
                ELSE '36+ años'
              END AS etiqueta,
              COUNT(*) AS cantidad
            FROM beneficiarios
            WHERE activo = true
            GROUP BY etiqueta
            ORDER BY MIN(COALESCE(fecha_nacimiento, '9999-12-31'::date))
            """);
        var porGenero       = await QueryGrupo(conn, ct, """
            SELECT COALESCE(NULLIF(TRIM(genero),''), 'No especificado') AS etiqueta,
                   COUNT(*) AS cantidad
            FROM beneficiarios
            WHERE activo = true
            GROUP BY etiqueta
            ORDER BY cantidad DESC
            """);
        var porPrograma     = await QueryGrupo(conn, ct, """
            SELECT p.nombre AS etiqueta, COUNT(DISTINCT i.beneficiario_id) AS cantidad
            FROM inscripciones i
            JOIN programas p ON p.id = i.programa_id
            WHERE i.activo = true
            GROUP BY p.nombre
            ORDER BY cantidad DESC
            LIMIT 10
            """);
        var porGrado        = await QueryGrupo(conn, ct, """
            SELECT COALESCE(NULLIF(TRIM(grado_escolar),''), 'No registrado') AS etiqueta,
                   COUNT(*) AS cantidad
            FROM beneficiarios
            WHERE activo = true
            GROUP BY etiqueta
            ORDER BY cantidad DESC
            """);
        var nuevosPorMes    = await QuerySerieMes(conn, ct, $"""
            SELECT TO_CHAR(DATE_TRUNC('month', fecha_creacion), 'Mon YYYY') AS mes,
                   COUNT(*) AS cantidad
            FROM beneficiarios
            WHERE EXTRACT(YEAR FROM fecha_creacion) = {year}
            GROUP BY DATE_TRUNC('month', fecha_creacion)
            ORDER BY DATE_TRUNC('month', fecha_creacion)
            """);

        return new BeneficiariosReporteDto(resumen, porEdad, porGenero, porPrograma, porGrado, nuevosPorMes);
    }

    static async Task<ResumenBeneficiariosDto> QueryResumenBeneficiarios(NpgsqlConnection conn, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT
              COUNT(*),
              SUM(CASE WHEN activo THEN 1 ELSE 0 END),
              SUM(CASE WHEN NOT activo THEN 1 ELSE 0 END),
              SUM(CASE WHEN tiene_discapacidad THEN 1 ELSE 0 END),
              SUM(CASE WHEN autorizacion THEN 1 ELSE 0 END)
            FROM beneficiarios
            """;
        await using var r = await cmd.ExecuteReaderAsync(ct);
        await r.ReadAsync(ct);
        return new ResumenBeneficiariosDto(
            (int)(long)r[0], (int)(long)r[1], (int)(long)r[2], (int)(long)r[3], (int)(long)r[4]);
    }

    // ── Programas ─────────────────────────────────────────────────────────────

    public async Task<ProgramasReporteDto> ProgramasAsync(CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);

        var resumen = await QueryResumenProgramas(conn, ct);

        var inscritos = await QueryProgramaDetalle(conn, ct);

        var estadoInscripciones = await QueryGrupo(conn, ct, """
            SELECT COALESCE(estado,'activa') AS etiqueta, COUNT(*) AS cantidad
            FROM inscripciones
            GROUP BY etiqueta
            ORDER BY cantidad DESC
            """);

        var porSede = await QueryGrupo(conn, ct, """
            SELECT COALESCE(s.nombre,'Sin sede') AS etiqueta, COUNT(p.id) AS cantidad
            FROM programas p
            LEFT JOIN sedes s ON s.id = p.sede_id
            WHERE p.activo = true
            GROUP BY s.nombre
            ORDER BY cantidad DESC
            """);

        return new ProgramasReporteDto(resumen, inscritos, estadoInscripciones, porSede);
    }

    static async Task<ResumenProgramasDto> QueryResumenProgramas(NpgsqlConnection conn, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT COUNT(*), SUM(CASE WHEN activo THEN 1 ELSE 0 END),
                   (SELECT COUNT(*) FROM inscripciones WHERE activo = true)
            FROM programas
            """;
        await using var r = await cmd.ExecuteReaderAsync(ct);
        await r.ReadAsync(ct);
        return new ResumenProgramasDto((int)(long)r[0], (int)(long)r[1], (int)(long)r[2]);
    }

    static async Task<IReadOnlyList<ProgramaDetalleDto>> QueryProgramaDetalle(NpgsqlConnection conn, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT p.nombre,
                   COUNT(i.id)                              AS total,
                   SUM(CASE WHEN i.activo THEN 1 ELSE 0 END) AS activos
            FROM programas p
            LEFT JOIN inscripciones i ON i.programa_id = p.id
            GROUP BY p.nombre
            ORDER BY total DESC
            LIMIT 15
            """;
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<ProgramaDetalleDto>();
        while (await r.ReadAsync(ct))
            list.Add(new ProgramaDetalleDto(r.GetString(0), (int)(long)r[1], (int)(long)r[2]));
        return list;
    }

    // ── Inventario ────────────────────────────────────────────────────────────

    public async Task<InventarioReporteDto> InventarioAsync(CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);

        var resumen = await QueryResumenInventario(conn, ct);

        var porCategoria = await QueryCategoria(conn, ct);

        var movPorTipo = await QueryGrupo(conn, ct, """
            SELECT t.nombre AS etiqueta, COUNT(m.id) AS cantidad
            FROM inventario_movimientos m
            JOIN cat_tipo_movimiento_inv t ON t.id = m.tipo_movimiento_id
            WHERE m.fecha_movimiento >= NOW() - INTERVAL '30 days'
            GROUP BY t.nombre
            ORDER BY cantidad DESC
            """);

        var criticos = await QueryItemsCriticos(conn, ct);

        return new InventarioReporteDto(resumen, porCategoria, movPorTipo, criticos);
    }

    static async Task<ResumenInventarioDto> QueryResumenInventario(NpgsqlConnection conn, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT COUNT(*),
                   SUM(CASE WHEN stock_actual < stock_minimo THEN 1 ELSE 0 END),
                   COUNT(DISTINCT COALESCE(categoria,'Sin categoría')),
                   COALESCE(SUM(stock_actual), 0)
            FROM inventario_items
            WHERE activo = true
            """;
        await using var r = await cmd.ExecuteReaderAsync(ct);
        await r.ReadAsync(ct);
        return new ResumenInventarioDto(
            (int)(long)r[0], (int)(long)r[1], (int)(long)r[2],
            r.IsDBNull(3) ? 0 : (decimal)r[3]);
    }

    static async Task<IReadOnlyList<CategoriaDto>> QueryCategoria(NpgsqlConnection conn, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT COALESCE(categoria,'Sin categoría') AS categoria,
                   COUNT(*) AS items,
                   COALESCE(SUM(stock_actual), 0) AS stock_total
            FROM inventario_items
            WHERE activo = true
            GROUP BY categoria
            ORDER BY items DESC
            """;
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<CategoriaDto>();
        while (await r.ReadAsync(ct))
            list.Add(new CategoriaDto(r.GetString(0), (int)(long)r[1], (decimal)r[2]));
        return list;
    }

    static async Task<IReadOnlyList<ItemCriticoDto>> QueryItemsCriticos(NpgsqlConnection conn, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT nombre, stock_actual, stock_minimo, COALESCE(categoria,'Sin categoría')
            FROM inventario_items
            WHERE activo = true AND stock_actual < stock_minimo
            ORDER BY (stock_actual - stock_minimo) ASC
            LIMIT 10
            """;
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<ItemCriticoDto>();
        while (await r.ReadAsync(ct))
            list.Add(new ItemCriticoDto(r.GetString(0), (decimal)r[1], (decimal)r[2], r.GetString(3)));
        return list;
    }

    // ── Actividades ───────────────────────────────────────────────────────────

    public async Task<ActividadesReporteDto> ActividadesAsync(int? anio, CancellationToken ct)
    {
        int year = anio ?? DateTime.UtcNow.Year;
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);

        var resumen = await QueryResumenActividades(conn, ct, year);

        var porEstado = await QueryGrupo(conn, ct, $"""
            SELECT estado AS etiqueta, COUNT(*) AS cantidad
            FROM actividades
            WHERE EXTRACT(YEAR FROM fecha_inicio) = {year}
            GROUP BY estado
            ORDER BY cantidad DESC
            """);

        var asistencia = await QueryAsistencia(conn, ct, year);

        var porMes = await QuerySerieMes(conn, ct, $"""
            SELECT TO_CHAR(DATE_TRUNC('month', fecha_inicio), 'Mon YYYY') AS mes,
                   COUNT(*) AS cantidad
            FROM actividades
            WHERE EXTRACT(YEAR FROM fecha_inicio) = {year}
            GROUP BY DATE_TRUNC('month', fecha_inicio)
            ORDER BY DATE_TRUNC('month', fecha_inicio)
            """);

        return new ActividadesReporteDto(resumen, porEstado, asistencia, porMes);
    }

    static async Task<ResumenActividadesDto> QueryResumenActividades(NpgsqlConnection conn, CancellationToken ct, int year)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            SELECT COUNT(*),
                   SUM(CASE WHEN estado = 'completada'   THEN 1 ELSE 0 END),
                   SUM(CASE WHEN estado = 'en_curso'     THEN 1 ELSE 0 END),
                   SUM(CASE WHEN estado = 'planificada'  THEN 1 ELSE 0 END),
                   COALESCE((SELECT COUNT(*) FROM actividad_asistencia aa
                              JOIN actividades a2 ON a2.id = aa.actividad_id
                              WHERE aa.asistio = true AND EXTRACT(YEAR FROM a2.fecha_inicio) = {year}), 0),
                   COALESCE((SELECT AVG(sub.cnt) FROM (
                       SELECT COUNT(*) AS cnt FROM actividad_asistencia aa
                       JOIN actividades a3 ON a3.id = aa.actividad_id
                       WHERE aa.asistio = true AND EXTRACT(YEAR FROM a3.fecha_inicio) = {year}
                       GROUP BY aa.actividad_id
                   ) sub), 0)
            FROM actividades
            WHERE EXTRACT(YEAR FROM fecha_inicio) = {year}
            """;
        await using var r = await cmd.ExecuteReaderAsync(ct);
        await r.ReadAsync(ct);
        return new ResumenActividadesDto(
            (int)(long)r[0], (int)(long)r[1], (int)(long)r[2], (int)(long)r[3],
            (int)(long)r[4],
            r.IsDBNull(5) ? 0 : Math.Round(Convert.ToDouble(r[5]), 1));
    }

    static async Task<IReadOnlyList<AsistenciaItemDto>> QueryAsistencia(NpgsqlConnection conn, CancellationToken ct, int year)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            SELECT a.titulo,
                   (SELECT COUNT(*) FROM actividad_asistencia aa WHERE aa.actividad_id = a.id) AS inscritos,
                   (SELECT COUNT(*) FROM actividad_asistencia aa WHERE aa.actividad_id = a.id AND aa.asistio = true) AS asistieron
            FROM actividades a
            WHERE a.estado = 'completada' AND EXTRACT(YEAR FROM a.fecha_inicio) = {year}
            ORDER BY a.fecha_inicio DESC
            LIMIT 10
            """;
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<AsistenciaItemDto>();
        while (await r.ReadAsync(ct))
            list.Add(new AsistenciaItemDto(r.GetString(0), (int)(long)r[1], (int)(long)r[2]));
        return list;
    }

    // ── Donaciones ────────────────────────────────────────────────────────────

    public async Task<DonacionesReporteDto> DonacionesAsync(int? anio, CancellationToken ct)
    {
        int year = anio ?? DateTime.UtcNow.Year;
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);

        var resumen     = await QueryResumenDonaciones(conn, ct, year);
        var porTipo     = await QueryTipoDonacion(conn, ct, year);
        var porMes      = await QuerySerieDinero(conn, ct, year);
        var topDonantes = await QueryTopDonantes(conn, ct, year);

        return new DonacionesReporteDto(resumen, porTipo, porMes, topDonantes);
    }

    static async Task<ResumenDonacionesDto> QueryResumenDonaciones(NpgsqlConnection conn, CancellationToken ct, int year)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            SELECT COUNT(*),
                   COALESCE(SUM(CASE WHEN tipo = 'dinero' THEN monto ELSE 0 END), 0),
                   COALESCE(AVG(CASE WHEN tipo = 'dinero' THEN monto END), 0)
            FROM donaciones
            WHERE activo = true AND EXTRACT(YEAR FROM fecha_donacion) = {year}
            """;
        await using var r = await cmd.ExecuteReaderAsync(ct);
        await r.ReadAsync(ct);
        return new ResumenDonacionesDto(
            (int)(long)r[0],
            r.IsDBNull(1) ? 0 : (decimal)r[1],
            r.IsDBNull(2) ? 0 : Math.Round((decimal)(double)r[2], 0));
    }

    static async Task<IReadOnlyList<TipoDonacionDto>> QueryTipoDonacion(NpgsqlConnection conn, CancellationToken ct, int year)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            SELECT tipo, COUNT(*) AS cantidad, COALESCE(SUM(monto), 0) AS monto_total
            FROM donaciones
            WHERE activo = true AND EXTRACT(YEAR FROM fecha_donacion) = {year}
            GROUP BY tipo
            ORDER BY cantidad DESC
            """;
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<TipoDonacionDto>();
        while (await r.ReadAsync(ct))
            list.Add(new TipoDonacionDto(r.GetString(0), (int)(long)r[1], (decimal)r[2]));
        return list;
    }

    static async Task<IReadOnlyList<SerieMonetoDto>> QuerySerieDinero(NpgsqlConnection conn, CancellationToken ct, int year)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            SELECT TO_CHAR(DATE_TRUNC('month', fecha_donacion), 'Mon YYYY') AS mes,
                   COALESCE(SUM(monto), 0) AS monto_total,
                   COUNT(*) AS cantidad
            FROM donaciones
            WHERE activo = true AND EXTRACT(YEAR FROM fecha_donacion) = {year}
            GROUP BY DATE_TRUNC('month', fecha_donacion)
            ORDER BY DATE_TRUNC('month', fecha_donacion)
            """;
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<SerieMonetoDto>();
        while (await r.ReadAsync(ct))
            list.Add(new SerieMonetoDto(r.GetString(0), (decimal)r[1], (int)(long)r[2]));
        return list;
    }

    static async Task<IReadOnlyList<TopDonanteDto>> QueryTopDonantes(NpgsqlConnection conn, CancellationToken ct, int year)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            SELECT d.nombre, COALESCE(SUM(don.monto), 0) AS total_monto, COUNT(don.id) AS total_donaciones
            FROM donantes d
            JOIN donaciones don ON don.donante_id = d.id
            WHERE don.activo = true AND EXTRACT(YEAR FROM don.fecha_donacion) = {year}
            GROUP BY d.nombre
            ORDER BY total_monto DESC
            LIMIT 8
            """;
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<TopDonanteDto>();
        while (await r.ReadAsync(ct))
            list.Add(new TopDonanteDto(r.GetString(0), (decimal)r[1], (int)(long)r[2]));
        return list;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    static async Task<IReadOnlyList<GrupoDto>> QueryGrupo(NpgsqlConnection conn, CancellationToken ct, string sql)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<GrupoDto>();
        while (await r.ReadAsync(ct))
            list.Add(new GrupoDto(r.GetString(0), (int)(long)r[1]));
        return list;
    }

    static async Task<IReadOnlyList<SerieMesDto>> QuerySerieMes(NpgsqlConnection conn, CancellationToken ct, string sql)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<SerieMesDto>();
        while (await r.ReadAsync(ct))
            list.Add(new SerieMesDto(r.GetString(0), (int)(long)r[1]));
        return list;
    }
}
