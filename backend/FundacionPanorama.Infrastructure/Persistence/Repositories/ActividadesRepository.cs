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
        if (mes.HasValue)       where.Add("EXTRACT(MONTH FROM a.fecha_inicio) = @mes");
        if (anio.HasValue)      where.Add("EXTRACT(YEAR  FROM a.fecha_inicio) = @anio");
        if (programaId.HasValue) where.Add("a.programa_id = @pid");

        cmd.CommandText = $"""
            SELECT a.id, a.titulo, a.programa_id, p.nombre AS programa_nombre,
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
        var list = new List<ActividadResumenDto>();
        while (await r.ReadAsync(ct)) list.Add(MapResumen(r));
        return list;
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
        return await r.ReadAsync(ct) ? MapDetalle(r) : null;
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
        cmd.Parameters.AddWithValue("pid",    (object?)dto.ProgramaId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("fi",     dto.FechaInicio);
        cmd.Parameters.AddWithValue("ff",     (object?)dto.FechaFin ?? DBNull.Value);
        cmd.Parameters.AddWithValue("lugar",  (object?)dto.Lugar?.Trim() ?? DBNull.Value);

        var newId = (Guid)(await cmd.ExecuteScalarAsync(ct))!;
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
        cmd.Parameters.AddWithValue("pid",    (object?)dto.ProgramaId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("fi",     dto.FechaInicio);
        cmd.Parameters.AddWithValue("ff",     (object?)dto.FechaFin ?? DBNull.Value);
        cmd.Parameters.AddWithValue("lugar",  (object?)dto.Lugar?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("estado", dto.Estado);
        cmd.Parameters.AddWithValue("id",     id);
        var rows = await cmd.ExecuteNonQueryAsync(ct);
        return rows == 0 ? null : await ObtenerAsync(id, ct);
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
        // Trae todos los inscritos del programa + los que ya tienen registro de asistencia
        cmd.CommandText = """
            SELECT DISTINCT b.id, b.nombres || ' ' || b.apellidos AS nombre_completo,
                   b.foto_url,
                   COALESCE(aa.asistio, false) AS asistio
            FROM inscripciones i
            JOIN beneficiarios b ON b.id = i.beneficiario_id
            JOIN actividades   a ON a.id = @aid
            LEFT JOIN actividad_asistencia aa ON aa.actividad_id = @aid AND aa.beneficiario_id = b.id
            WHERE (a.programa_id IS NULL OR i.programa_id = a.programa_id)
              AND i.activo = true AND b.activo = true
            ORDER BY b.nombres
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
                   ph.lugar, ph.activo
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
            INSERT INTO programa_horarios (programa_id, dia_semana, hora_inicio, hora_fin, lugar)
            VALUES (@pid, @dia, @hi::time, @hf::time, @lugar)
            RETURNING id
            """;
        cmd.Parameters.AddWithValue("pid",   dto.ProgramaId);
        cmd.Parameters.AddWithValue("dia",   dto.DiaSemana);
        cmd.Parameters.AddWithValue("hi",    dto.HoraInicio);
        cmd.Parameters.AddWithValue("hf",    dto.HoraFin);
        cmd.Parameters.AddWithValue("lugar", (object?)dto.Lugar?.Trim() ?? DBNull.Value);
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
                programa_id = @pid,
                dia_semana  = @dia,
                hora_inicio = @hi::time,
                hora_fin    = @hf::time,
                lugar       = @lugar,
                activo      = @activo
            WHERE id = @id
            """;
        cmd.Parameters.AddWithValue("pid",   dto.ProgramaId);
        cmd.Parameters.AddWithValue("dia",   dto.DiaSemana);
        cmd.Parameters.AddWithValue("hi",    dto.HoraInicio);
        cmd.Parameters.AddWithValue("hf",    dto.HoraFin);
        cmd.Parameters.AddWithValue("lugar", (object?)dto.Lugar?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("activo", dto.Activo);
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

    // ── Mappers ──────────────────────────────────────────────────────────────────

    static ActividadResumenDto MapResumen(NpgsqlDataReader r) => new(
        r.GetGuid(0),
        r.GetString(1),
        r.IsDBNull(2) ? null : r.GetGuid(2),
        r.IsDBNull(3) ? null : r.GetString(3),
        r.GetDateTime(4),
        r.IsDBNull(5) ? null : r.GetDateTime(5),
        r.IsDBNull(6) ? null : r.GetString(6),
        r.GetString(7),
        (int)(long)r[8]);

    static HorarioDto MapHorario(NpgsqlDataReader r) => new(
        r.GetGuid(0),
        r.GetGuid(1),
        r.GetString(2),
        r.GetString(3),
        r.GetInt16(4),
        r.GetString(5),
        r.GetString(6),
        r.IsDBNull(7) ? null : r.GetString(7),
        r.GetBoolean(8));

    static ActividadDto MapDetalle(NpgsqlDataReader r) => new(
        r.GetGuid(0),
        r.GetString(1),
        r.IsDBNull(2) ? null : r.GetString(2),
        r.IsDBNull(3) ? null : r.GetGuid(3),
        r.IsDBNull(4) ? null : r.GetString(4),
        r.GetDateTime(5),
        r.IsDBNull(6) ? null : r.GetDateTime(6),
        r.IsDBNull(7) ? null : r.GetString(7),
        r.GetString(8),
        (int)(long)r[9],
        (int)(long)r[10],
        r.GetDateTime(11));
}
