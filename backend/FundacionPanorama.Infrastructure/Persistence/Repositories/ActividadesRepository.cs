using FundacionPanorama.Application.Features.Actividades.DTOs;
using FundacionPanorama.Application.Features.Actividades.Interfaces;
using Npgsql;

namespace FundacionPanorama.Infrastructure.Persistence.Repositories;

public class ActividadesRepository(DbConnectionFactory factory) : IActividadesRepository
{
    public async Task<IReadOnlyList<ActividadResumenDto>> ListarAsync(int? mes, int? anio, Guid? programaId, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();

        var where = new List<string>();
        if (mes.HasValue)        where.Add("EXTRACT(MONTH FROM a.fecha_inicio) = @mes");
        if (anio.HasValue)       where.Add("EXTRACT(YEAR  FROM a.fecha_inicio) = @anio");
        if (programaId.HasValue) where.Add("a.programa_id = @pid");

        cmd.CommandText = $"""
            SELECT a.id, a.titulo, a.descripcion, a.programa_id, p.nombre AS programa_nombre,
                   a.fecha_inicio, a.fecha_fin, a.lugar, a.estado,
                   (SELECT COUNT(*) FROM actividad_asistencia aa WHERE aa.actividad_id = a.id) AS total_inscritos
            FROM actividades a
            LEFT JOIN programas p ON p.id = a.programa_id
            {(where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "")}
            ORDER BY a.fecha_inicio
            """;

        if (mes.HasValue)        cmd.Parameters.AddWithValue("mes",  mes.Value);
        if (anio.HasValue)       cmd.Parameters.AddWithValue("anio", anio.Value);
        if (programaId.HasValue) cmd.Parameters.AddWithValue("pid",  programaId.Value);

        await using var r = await cmd.ExecuteReaderAsync(ct);
        var filas = new List<(Guid Id, string Titulo, string? Desc, Guid? ProgId, string? ProgNombre, DateTime FI, DateTime? FF, string? Lugar, string Estado, int Total)>();
        while (await r.ReadAsync(ct))
            filas.Add((r.GetGuid(0), r.GetString(1), r.IsDBNull(2) ? null : r.GetString(2),
                r.IsDBNull(3) ? null : r.GetGuid(3), r.IsDBNull(4) ? null : r.GetString(4),
                r.GetDateTime(5), r.IsDBNull(6) ? null : r.GetDateTime(6),
                r.IsDBNull(7) ? null : r.GetString(7), r.GetString(8), (int)(long)r[9]));
        await r.DisposeAsync();

        if (filas.Count == 0) return [];

        var ids    = filas.Select(f => f.Id).ToArray();
        var diasMap = await CargarDiasAsync(conn, ids, ct);

        return filas.Select(f => new ActividadResumenDto(
            f.Id, f.Titulo, f.Desc, f.ProgId, f.ProgNombre,
            f.FI, f.FF, f.Lugar, f.Estado, f.Total,
            diasMap.TryGetValue(f.Id, out var d) ? d : [])).ToList();
    }

    public async Task<ActividadDto?> ObtenerAsync(Guid id, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT a.id, a.titulo, a.descripcion, a.programa_id, p.nombre AS programa_nombre,
                   a.fecha_inicio, a.fecha_fin, a.lugar, a.estado,
                   (SELECT COUNT(*)           FROM actividad_asistencia aa WHERE aa.actividad_id = a.id)                       AS total_inscritos,
                   (SELECT COUNT(*)           FROM actividad_asistencia aa WHERE aa.actividad_id = a.id AND aa.asistio = true) AS total_asistieron,
                   a.created_at
            FROM actividades a
            LEFT JOIN programas p ON p.id = a.programa_id
            WHERE a.id = @id
            """;
        cmd.Parameters.AddWithValue("id", id);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct)) return null;

        var row = (
            Id:             r.GetGuid(0),
            Titulo:         r.GetString(1),
            Desc:           r.IsDBNull(2)  ? null : r.GetString(2),
            ProgId:         r.IsDBNull(3)  ? (Guid?)null : r.GetGuid(3),
            ProgNombre:     r.IsDBNull(4)  ? null : r.GetString(4),
            FI:             r.GetDateTime(5),
            FF:             r.IsDBNull(6)  ? (DateTime?)null : r.GetDateTime(6),
            Lugar:          r.IsDBNull(7)  ? null : r.GetString(7),
            Estado:         r.GetString(8),
            TotalInscritos: (int)(long)r[9],
            TotalAsistieron:(int)(long)r[10],
            CreatedAt:      r.GetDateTime(11));
        await r.DisposeAsync();

        var diasMap = await CargarDiasAsync(conn, [row.Id], ct);
        var dias = diasMap.TryGetValue(row.Id, out var d) ? d : (IReadOnlyList<ActividadDiaDto>)[];

        return new ActividadDto(
            row.Id, row.Titulo, row.Desc, row.ProgId, row.ProgNombre,
            row.FI, row.FF, row.Lugar, row.Estado,
            row.TotalInscritos, row.TotalAsistieron, row.CreatedAt, dias);
    }

    public async Task<ActividadDto> CrearAsync(CrearActividadDto dto, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO actividades (titulo, descripcion, programa_id, fecha_inicio, fecha_fin, lugar)
            VALUES (@titulo, @desc, @pid, @fi, @ff, @lugar)
            RETURNING id
            """;
        cmd.Parameters.AddWithValue("titulo", dto.Titulo.Trim());
        cmd.Parameters.AddWithValue("desc",   (object?)dto.Descripcion?.Trim() ?? DBNull.Value);
        cmd.Parameters.Add(new NpgsqlParameter("pid", NpgsqlTypes.NpgsqlDbType.Uuid) { Value = (object?)dto.ProgramaId ?? DBNull.Value });
        cmd.Parameters.AddWithValue("fi",     dto.FechaInicio);
        cmd.Parameters.AddWithValue("ff",     (object?)dto.FechaFin ?? DBNull.Value);
        cmd.Parameters.AddWithValue("lugar",  (object?)dto.Lugar?.Trim() ?? DBNull.Value);

        var newId = (Guid)(await cmd.ExecuteScalarAsync(ct))!;

        if (dto.DiasAdicionales?.Count > 0)
            await InsertarDiasAsync(conn, newId, dto.DiasAdicionales, ct);

        return (await ObtenerAsync(newId, ct))!;
    }

    public async Task<ActividadDto?> ActualizarAsync(Guid id, ActualizarActividadDto dto, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE actividades SET
                titulo      = @titulo,
                descripcion = @desc,
                programa_id = @pid,
                fecha_inicio = @fi,
                fecha_fin   = @ff,
                lugar       = @lugar,
                estado      = @estado
            WHERE id = @id
            """;
        cmd.Parameters.AddWithValue("titulo", dto.Titulo.Trim());
        cmd.Parameters.AddWithValue("desc",   (object?)dto.Descripcion?.Trim() ?? DBNull.Value);
        cmd.Parameters.Add(new NpgsqlParameter("pid", NpgsqlTypes.NpgsqlDbType.Uuid) { Value = (object?)dto.ProgramaId ?? DBNull.Value });
        cmd.Parameters.AddWithValue("fi",     dto.FechaInicio);
        cmd.Parameters.AddWithValue("ff",     (object?)dto.FechaFin ?? DBNull.Value);
        cmd.Parameters.AddWithValue("lugar",  (object?)dto.Lugar?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("estado", dto.Estado);
        cmd.Parameters.AddWithValue("id",     id);
        var rows = await cmd.ExecuteNonQueryAsync(ct);
        if (rows == 0) return null;

        // Reemplazar días adicionales
        await using var del = conn.CreateCommand();
        del.CommandText = "DELETE FROM actividad_dias WHERE actividad_id = @id";
        del.Parameters.AddWithValue("id", id);
        await del.ExecuteNonQueryAsync(ct);

        if (dto.DiasAdicionales?.Count > 0)
            await InsertarDiasAsync(conn, id, dto.DiasAdicionales, ct);

        return await ObtenerAsync(id, ct);
    }

    public async Task<bool> EliminarAsync(Guid id, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM actividades WHERE id = @id";
        cmd.Parameters.AddWithValue("id", id);
        return await cmd.ExecuteNonQueryAsync(ct) > 0;
    }

    public async Task<IReadOnlyList<AsistenciaItemDto>> ObtenerAsistenciaAsync(Guid actividadId, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT DISTINCT b.id,
                   concat_ws(' ', b.primer_nombre, b.segundo_nombre, b.primer_apellido, b.segundo_apellido) AS nombre_completo,
                   (SELECT ar.url FROM archivos ar
                    JOIN cat_tipo_archivo cta ON cta.id = ar.tipo_archivo_id
                    WHERE ar.entidad_tipo = 'beneficiario' AND ar.entidad_id = b.id
                      AND cta.nombre = 'Foto del menor' AND ar.activo = true
                    LIMIT 1) AS foto_url,
                   COALESCE(aa.asistio, false) AS asistio
            FROM inscripciones i
            JOIN beneficiarios b ON b.id = i.beneficiario_id
            JOIN actividades   a ON a.id = @aid
            LEFT JOIN actividad_asistencia aa ON aa.actividad_id = @aid AND aa.beneficiario_id = b.id
            WHERE (a.programa_id IS NULL OR i.programa_id = a.programa_id)
              AND i.activo = true AND b.activo = true
            ORDER BY b.primer_nombre, b.primer_apellido
            """;
        cmd.Parameters.AddWithValue("aid", actividadId);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<AsistenciaItemDto>();
        while (await r.ReadAsync(ct))
            list.Add(new AsistenciaItemDto(
                r.GetGuid(0),
                r.GetString(1),
                r.IsDBNull(2) ? null : r.GetString(2),
                r.GetBoolean(3)));
        return list;
    }

    public async Task RegistrarAsistenciaAsync(Guid actividadId, RegistrarAsistenciaDto dto, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        foreach (var item in dto.Asistencias)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                INSERT INTO actividad_asistencia (actividad_id, beneficiario_id, asistio)
                VALUES (@aid, @bid, @asistio)
                ON CONFLICT (actividad_id, beneficiario_id) DO UPDATE SET asistio = EXCLUDED.asistio
                """;
            cmd.Parameters.AddWithValue("aid",     actividadId);
            cmd.Parameters.AddWithValue("bid",     item.BeneficiarioId);
            cmd.Parameters.AddWithValue("asistio", item.Asistio);
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }

    // ── Horarios ────────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<HorarioDto>> ListarHorariosAsync(Guid? programaId, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            SELECT ph.id, ph.programa_id, p.nombre AS programa_nombre,
                   s.nombre AS sede_nombre,
                   ph.dia_semana,
                   TO_CHAR(ph.hora_inicio,'HH24:MI') AS hora_inicio,
                   TO_CHAR(ph.hora_fin,   'HH24:MI') AS hora_fin,
                   ph.lugar, ph.activo,
                   TO_CHAR(ph.fecha_inicio_vigencia,'YYYY-MM-DD') AS fecha_inicio_vigencia,
                   TO_CHAR(ph.fecha_fin_vigencia,   'YYYY-MM-DD') AS fecha_fin_vigencia
            FROM programa_horarios ph
            JOIN programas p ON p.id = ph.programa_id
            JOIN sedes     s ON s.id = p.sede_id
            {(programaId.HasValue ? "WHERE ph.programa_id = @pid" : "")}
            ORDER BY p.nombre, ph.dia_semana, ph.hora_inicio
            """;
        if (programaId.HasValue) cmd.Parameters.AddWithValue("pid", programaId.Value);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<HorarioDto>();
        while (await r.ReadAsync(ct)) list.Add(MapHorario(r));
        return list;
    }

    public async Task<HorarioDto> CrearHorarioAsync(CrearHorarioDto dto, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO programa_horarios (programa_id, dia_semana, hora_inicio, hora_fin, lugar, fecha_inicio_vigencia, fecha_fin_vigencia)
            VALUES (@pid, @dia, @hi::time, @hf::time, @lugar, @fiv::date, @ffv::date)
            RETURNING id
            """;
        cmd.Parameters.AddWithValue("pid",   dto.ProgramaId);
        cmd.Parameters.AddWithValue("dia",   dto.DiaSemana);
        cmd.Parameters.AddWithValue("hi",    dto.HoraInicio);
        cmd.Parameters.AddWithValue("hf",    dto.HoraFin);
        cmd.Parameters.AddWithValue("lugar", (object?)dto.Lugar?.Trim() ?? DBNull.Value);
        cmd.Parameters.Add(new NpgsqlParameter("fiv", NpgsqlTypes.NpgsqlDbType.Date) { Value = (object?)dto.FechaInicioVigencia ?? DBNull.Value });
        cmd.Parameters.Add(new NpgsqlParameter("ffv", NpgsqlTypes.NpgsqlDbType.Date) { Value = (object?)dto.FechaFinVigencia    ?? DBNull.Value });
        var newId = (Guid)(await cmd.ExecuteScalarAsync(ct))!;
        return (await ListarHorariosAsync(null, ct)).First(h => h.Id == newId);
    }

    public async Task<HorarioDto?> ActualizarHorarioAsync(Guid id, ActualizarHorarioDto dto, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE programa_horarios SET
                programa_id            = @pid,
                dia_semana             = @dia,
                hora_inicio            = @hi::time,
                hora_fin               = @hf::time,
                lugar                  = @lugar,
                activo                 = @activo,
                fecha_inicio_vigencia  = @fiv::date,
                fecha_fin_vigencia     = @ffv::date
            WHERE id = @id
            """;
        cmd.Parameters.AddWithValue("pid",   dto.ProgramaId);
        cmd.Parameters.AddWithValue("dia",   dto.DiaSemana);
        cmd.Parameters.AddWithValue("hi",    dto.HoraInicio);
        cmd.Parameters.AddWithValue("hf",    dto.HoraFin);
        cmd.Parameters.AddWithValue("lugar", (object?)dto.Lugar?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("activo", dto.Activo);
        cmd.Parameters.Add(new NpgsqlParameter("fiv", NpgsqlTypes.NpgsqlDbType.Date) { Value = (object?)dto.FechaInicioVigencia ?? DBNull.Value });
        cmd.Parameters.Add(new NpgsqlParameter("ffv", NpgsqlTypes.NpgsqlDbType.Date) { Value = (object?)dto.FechaFinVigencia    ?? DBNull.Value });
        cmd.Parameters.AddWithValue("id",    id);
        var rows = await cmd.ExecuteNonQueryAsync(ct);
        if (rows == 0) return null;
        return (await ListarHorariosAsync(null, ct)).FirstOrDefault(h => h.Id == id);
    }

    public async Task<bool> EliminarHorarioAsync(Guid id, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM programa_horarios WHERE id = @id";
        cmd.Parameters.AddWithValue("id", id);
        return await cmd.ExecuteNonQueryAsync(ct) > 0;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private static async Task<Dictionary<Guid, List<ActividadDiaDto>>> CargarDiasAsync(
        NpgsqlConnection conn, Guid[] ids, CancellationToken ct)
    {
        var map = new Dictionary<Guid, List<ActividadDiaDto>>();
        if (ids.Length == 0) return map;
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT id, actividad_id,
                   TO_CHAR(fecha,'YYYY-MM-DD'),
                   TO_CHAR(hora_inicio,'HH24:MI'),
                   TO_CHAR(hora_fin,   'HH24:MI')
            FROM actividad_dias
            WHERE actividad_id = ANY(@ids)
            ORDER BY fecha, hora_inicio
            """;
        cmd.Parameters.AddWithValue("ids", ids);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            var actId = r.GetGuid(1);
            if (!map.ContainsKey(actId)) map[actId] = [];
            map[actId].Add(new ActividadDiaDto(r.GetGuid(0), r.GetString(2), r.GetString(3), r.GetString(4)));
        }
        return map;
    }

    private static async Task InsertarDiasAsync(
        NpgsqlConnection conn, Guid actividadId, List<CrearActividadDiaDto> dias, CancellationToken ct)
    {
        foreach (var dia in dias)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                INSERT INTO actividad_dias (actividad_id, fecha, hora_inicio, hora_fin)
                VALUES (@aid, @fecha::date, @hi::time, @hf::time)
                """;
            cmd.Parameters.AddWithValue("aid",   actividadId);
            cmd.Parameters.AddWithValue("fecha", dia.Fecha);
            cmd.Parameters.AddWithValue("hi",    dia.HoraInicio);
            cmd.Parameters.AddWithValue("hf",    dia.HoraFin);
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }

    static HorarioDto MapHorario(NpgsqlDataReader r) => new(
        r.GetGuid(0),
        r.GetGuid(1),
        r.GetString(2),
        r.GetString(3),
        r.GetInt16(4),
        r.GetString(5),
        r.GetString(6),
        r.IsDBNull(7)  ? null : r.GetString(7),
        r.GetBoolean(8),
        r.IsDBNull(9)  ? null : r.GetString(9),
        r.IsDBNull(10) ? null : r.GetString(10));
}
