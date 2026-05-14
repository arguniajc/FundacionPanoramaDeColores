using FundacionPanorama.Application.Features.TalentoHumano.DTOs;
using FundacionPanorama.Application.Features.TalentoHumano.Interfaces;
using Npgsql;

namespace FundacionPanorama.Infrastructure.Persistence.Repositories;

public class TalentoHumanoRepository(DbConnectionFactory factory) : ITalentoHumanoRepository
{
    // ── Listar empleados ──────────────────────────────────────────────────────

    public async Task<IReadOnlyList<EmpleadoResumenDto>> ListarAsync(bool? activo, Guid? sedeId, string? area, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();

        var where = new List<string>();
        if (activo.HasValue) where.Add("e.activo = @activo");
        if (sedeId.HasValue) where.Add("e.sede_id = @sedeId");
        if (!string.IsNullOrEmpty(area)) where.Add("e.area ILIKE @area");

        cmd.CommandText = $"""
            SELECT e.id, e.nombres, e.apellidos, e.tipo_documento, e.numero_documento,
                   e.cargo, e.area, e.sede_id, s.nombre AS sede_nombre,
                   e.tipo_contrato, e.fecha_ingreso, e.fecha_fin_contrato,
                   e.activo, e.foto_url, e.email, e.telefono,
                   (SELECT COUNT(*) FROM novedades_empleado n WHERE n.empleado_id = e.id AND n.estado = 'pendiente') AS novedades_pendientes
            FROM empleados e
            LEFT JOIN sedes s ON s.id = e.sede_id
            {(where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "")}
            ORDER BY e.apellidos, e.nombres
            """;

        if (activo.HasValue)               cmd.Parameters.AddWithValue("activo", activo.Value);
        if (sedeId.HasValue)               cmd.Parameters.AddWithValue("sedeId", sedeId.Value);
        if (!string.IsNullOrEmpty(area))   cmd.Parameters.AddWithValue("area", $"%{area}%");

        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<EmpleadoResumenDto>();
        while (await r.ReadAsync(ct)) list.Add(MapResumen(r));
        return list;
    }

    // ── Obtener empleado ──────────────────────────────────────────────────────

    public async Task<EmpleadoDto?> ObtenerAsync(Guid id, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT e.id, e.nombres, e.apellidos, e.tipo_documento, e.numero_documento,
                   e.email, e.telefono, e.celular, e.cargo, e.area,
                   e.sede_id, s.nombre AS sede_nombre,
                   e.tipo_contrato, e.fecha_ingreso, e.fecha_fin_contrato,
                   e.salario, e.eps, e.pension,
                   e.activo, e.foto_url, e.notas, e.fecha_creacion
            FROM empleados e
            LEFT JOIN sedes s ON s.id = e.sede_id
            WHERE e.id = @id
            """;
        cmd.Parameters.AddWithValue("id", id);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        return await r.ReadAsync(ct) ? MapDetalle(r) : null;
    }

    // ── Crear empleado ────────────────────────────────────────────────────────

    public async Task<EmpleadoDto> CrearAsync(CrearEmpleadoDto dto, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO empleados
                (nombres, apellidos, tipo_documento, numero_documento, email, telefono, celular,
                 cargo, area, sede_id, tipo_contrato, fecha_ingreso, fecha_fin_contrato,
                 salario, eps, pension, notas)
            VALUES
                (@nombres, @apellidos, @tipodoc, @numdoc, @email, @telefono, @celular,
                 @cargo, @area, @sedeId, @tipoContrato, @fechaIngreso, @fechaFin,
                 @salario, @eps, @pension, @notas)
            RETURNING id
            """;
        AddEmpleadoParams(cmd, dto.Nombres, dto.Apellidos, dto.TipoDocumento, dto.NumeroDocumento,
            dto.Email, dto.Telefono, dto.Celular, dto.Cargo, dto.Area, dto.SedeId,
            dto.TipoContrato, dto.FechaIngreso, dto.FechaFinContrato, dto.Salario, dto.Eps, dto.Pension, dto.Notas);
        var newId = (Guid)(await cmd.ExecuteScalarAsync(ct))!;
        return (await ObtenerAsync(newId, ct))!;
    }

    // ── Actualizar empleado ───────────────────────────────────────────────────

    public async Task<EmpleadoDto?> ActualizarAsync(Guid id, ActualizarEmpleadoDto dto, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE empleados SET
                nombres = @nombres, apellidos = @apellidos,
                tipo_documento = @tipodoc, numero_documento = @numdoc,
                email = @email, telefono = @telefono, celular = @celular,
                cargo = @cargo, area = @area, sede_id = @sedeId,
                tipo_contrato = @tipoContrato, fecha_ingreso = @fechaIngreso,
                fecha_fin_contrato = @fechaFin, salario = @salario,
                eps = @eps, pension = @pension, activo = @activo, notas = @notas,
                fecha_modificacion = NOW()
            WHERE id = @id
            """;
        AddEmpleadoParams(cmd, dto.Nombres, dto.Apellidos, dto.TipoDocumento, dto.NumeroDocumento,
            dto.Email, dto.Telefono, dto.Celular, dto.Cargo, dto.Area, dto.SedeId,
            dto.TipoContrato, dto.FechaIngreso, dto.FechaFinContrato, dto.Salario, dto.Eps, dto.Pension, dto.Notas);
        cmd.Parameters.AddWithValue("activo", dto.Activo);
        cmd.Parameters.AddWithValue("id", id);
        var rows = await cmd.ExecuteNonQueryAsync(ct);
        return rows == 0 ? null : await ObtenerAsync(id, ct);
    }

    // ── Eliminar empleado ─────────────────────────────────────────────────────

    public async Task<bool> EliminarAsync(Guid id, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM empleados WHERE id = @id";
        cmd.Parameters.AddWithValue("id", id);
        return await cmd.ExecuteNonQueryAsync(ct) > 0;
    }

    // ── Novedades ─────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<NovedadDto>> ListarNovedadesAsync(Guid empleadoId, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT n.id, n.empleado_id,
                   e.nombres || ' ' || e.apellidos AS empleado_nombre,
                   n.tipo, n.fecha_inicio, n.fecha_fin, n.dias, n.descripcion, n.estado, n.fecha_creacion
            FROM novedades_empleado n
            JOIN empleados e ON e.id = n.empleado_id
            WHERE n.empleado_id = @eid
            ORDER BY n.fecha_inicio DESC
            """;
        cmd.Parameters.AddWithValue("eid", empleadoId);
        return await EjecutarListaNovedades(cmd, ct);
    }

    public async Task<IReadOnlyList<NovedadDto>> ListarTodasNovedadesAsync(string? estado, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            SELECT n.id, n.empleado_id,
                   e.nombres || ' ' || e.apellidos AS empleado_nombre,
                   n.tipo, n.fecha_inicio, n.fecha_fin, n.dias, n.descripcion, n.estado, n.fecha_creacion
            FROM novedades_empleado n
            JOIN empleados e ON e.id = n.empleado_id
            {(!string.IsNullOrEmpty(estado) ? "WHERE n.estado = @estado" : "")}
            ORDER BY n.fecha_inicio DESC
            LIMIT 100
            """;
        if (!string.IsNullOrEmpty(estado)) cmd.Parameters.AddWithValue("estado", estado);
        return await EjecutarListaNovedades(cmd, ct);
    }

    public async Task<NovedadDto> CrearNovedadAsync(Guid empleadoId, CrearNovedadDto dto, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO novedades_empleado (empleado_id, tipo, fecha_inicio, fecha_fin, dias, descripcion)
            VALUES (@eid, @tipo, @fi, @ff, @dias, @desc)
            RETURNING id
            """;
        cmd.Parameters.AddWithValue("eid",  empleadoId);
        cmd.Parameters.AddWithValue("tipo", dto.Tipo);
        cmd.Parameters.AddWithValue("fi",   dto.FechaInicio);
        cmd.Parameters.AddWithValue("ff",   (object?)dto.FechaFin ?? DBNull.Value);
        cmd.Parameters.AddWithValue("dias", (object?)dto.Dias    ?? DBNull.Value);
        cmd.Parameters.AddWithValue("desc", (object?)dto.Descripcion ?? DBNull.Value);
        var newId = (Guid)(await cmd.ExecuteScalarAsync(ct))!;
        return (await ObtenerNovedadAsync(conn, newId, ct))!;
    }

    public async Task<NovedadDto?> ActualizarNovedadAsync(Guid id, ActualizarNovedadDto dto, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE novedades_empleado SET
                tipo = @tipo, fecha_inicio = @fi, fecha_fin = @ff,
                dias = @dias, descripcion = @desc, estado = @estado
            WHERE id = @id
            """;
        cmd.Parameters.AddWithValue("tipo",   dto.Tipo);
        cmd.Parameters.AddWithValue("fi",     dto.FechaInicio);
        cmd.Parameters.AddWithValue("ff",     (object?)dto.FechaFin ?? DBNull.Value);
        cmd.Parameters.AddWithValue("dias",   (object?)dto.Dias    ?? DBNull.Value);
        cmd.Parameters.AddWithValue("desc",   (object?)dto.Descripcion ?? DBNull.Value);
        cmd.Parameters.AddWithValue("estado", dto.Estado);
        cmd.Parameters.AddWithValue("id",     id);
        var rows = await cmd.ExecuteNonQueryAsync(ct);
        return rows == 0 ? null : await ObtenerNovedadAsync(conn, id, ct);
    }

    public async Task<bool> EliminarNovedadAsync(Guid id, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM novedades_empleado WHERE id = @id";
        cmd.Parameters.AddWithValue("id", id);
        return await cmd.ExecuteNonQueryAsync(ct) > 0;
    }

    // ── Stats ─────────────────────────────────────────────────────────────────

    public async Task<TalentoHumanoStatsDto> StatsAsync(CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT
              COUNT(*),
              SUM(CASE WHEN activo THEN 1 ELSE 0 END),
              SUM(CASE WHEN activo AND fecha_fin_contrato IS NOT NULL
                            AND fecha_fin_contrato BETWEEN CURRENT_DATE AND CURRENT_DATE + 30 THEN 1 ELSE 0 END),
              (SELECT COUNT(*) FROM novedades_empleado WHERE estado = 'pendiente')
            FROM empleados
            """;
        await using var r = await cmd.ExecuteReaderAsync(ct);
        await r.ReadAsync(ct);
        return new TalentoHumanoStatsDto(
            (int)(long)r[0], (int)(long)r[1], (int)(long)r[2], (int)(long)r[3]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    static async Task<NovedadDto?> ObtenerNovedadAsync(NpgsqlConnection conn, Guid id, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT n.id, n.empleado_id, e.nombres || ' ' || e.apellidos,
                   n.tipo, n.fecha_inicio, n.fecha_fin, n.dias, n.descripcion, n.estado, n.fecha_creacion
            FROM novedades_empleado n JOIN empleados e ON e.id = n.empleado_id
            WHERE n.id = @id
            """;
        cmd.Parameters.AddWithValue("id", id);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        return await r.ReadAsync(ct) ? MapNovedad(r) : null;
    }

    static async Task<IReadOnlyList<NovedadDto>> EjecutarListaNovedades(NpgsqlCommand cmd, CancellationToken ct)
    {
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<NovedadDto>();
        while (await r.ReadAsync(ct)) list.Add(MapNovedad(r));
        return list;
    }

    static void AddEmpleadoParams(NpgsqlCommand cmd,
        string nombres, string apellidos, string? tipodoc, string? numdoc,
        string? email, string? telefono, string? celular, string? cargo, string? area,
        Guid? sedeId, string? tipoContrato, DateOnly? fechaIngreso, DateOnly? fechaFin,
        decimal? salario, string? eps, string? pension, string? notas)
    {
        cmd.Parameters.AddWithValue("nombres",       nombres.Trim());
        cmd.Parameters.AddWithValue("apellidos",     apellidos.Trim());
        cmd.Parameters.AddWithValue("tipodoc",       (object?)tipodoc ?? DBNull.Value);
        cmd.Parameters.AddWithValue("numdoc",        (object?)numdoc  ?? DBNull.Value);
        cmd.Parameters.AddWithValue("email",         (object?)email   ?? DBNull.Value);
        cmd.Parameters.AddWithValue("telefono",      (object?)telefono ?? DBNull.Value);
        cmd.Parameters.AddWithValue("celular",       (object?)celular  ?? DBNull.Value);
        cmd.Parameters.AddWithValue("cargo",         (object?)cargo    ?? DBNull.Value);
        cmd.Parameters.AddWithValue("area",          (object?)area     ?? DBNull.Value);
        cmd.Parameters.AddWithValue("sedeId",        (object?)sedeId   ?? DBNull.Value);
        cmd.Parameters.AddWithValue("tipoContrato",  (object?)tipoContrato ?? DBNull.Value);
        cmd.Parameters.AddWithValue("fechaIngreso",  (object?)fechaIngreso ?? DBNull.Value);
        cmd.Parameters.AddWithValue("fechaFin",      (object?)fechaFin ?? DBNull.Value);
        cmd.Parameters.AddWithValue("salario",       (object?)salario  ?? DBNull.Value);
        cmd.Parameters.AddWithValue("eps",           (object?)eps      ?? DBNull.Value);
        cmd.Parameters.AddWithValue("pension",       (object?)pension  ?? DBNull.Value);
        cmd.Parameters.AddWithValue("notas",         (object?)notas    ?? DBNull.Value);
    }

    static EmpleadoResumenDto MapResumen(NpgsqlDataReader r) => new(
        r.GetGuid(0), r.GetString(1), r.GetString(2),
        r.IsDBNull(3) ? null : r.GetString(3),
        r.IsDBNull(4) ? null : r.GetString(4),
        r.IsDBNull(5) ? null : r.GetString(5),
        r.IsDBNull(6) ? null : r.GetString(6),
        r.IsDBNull(7) ? null : r.GetGuid(7),
        r.IsDBNull(8) ? null : r.GetString(8),
        r.IsDBNull(9) ? null : r.GetString(9),
        r.IsDBNull(10) ? null : r.GetFieldValue<DateOnly>(10),
        r.IsDBNull(11) ? null : r.GetFieldValue<DateOnly>(11),
        r.GetBoolean(12),
        r.IsDBNull(13) ? null : r.GetString(13),
        r.IsDBNull(14) ? null : r.GetString(14),
        r.IsDBNull(15) ? null : r.GetString(15),
        (int)(long)r[16]);

    static EmpleadoDto MapDetalle(NpgsqlDataReader r) => new(
        r.GetGuid(0), r.GetString(1), r.GetString(2),
        r.IsDBNull(3)  ? null : r.GetString(3),
        r.IsDBNull(4)  ? null : r.GetString(4),
        r.IsDBNull(5)  ? null : r.GetString(5),
        r.IsDBNull(6)  ? null : r.GetString(6),
        r.IsDBNull(7)  ? null : r.GetString(7),
        r.IsDBNull(8)  ? null : r.GetString(8),
        r.IsDBNull(9)  ? null : r.GetString(9),
        r.IsDBNull(10) ? null : r.GetGuid(10),
        r.IsDBNull(11) ? null : r.GetString(11),
        r.IsDBNull(12) ? null : r.GetString(12),
        r.IsDBNull(13) ? null : r.GetFieldValue<DateOnly>(13),
        r.IsDBNull(14) ? null : r.GetFieldValue<DateOnly>(14),
        r.IsDBNull(15) ? null : (decimal)r[15],
        r.IsDBNull(16) ? null : r.GetString(16),
        r.IsDBNull(17) ? null : r.GetString(17),
        r.GetBoolean(18),
        r.IsDBNull(19) ? null : r.GetString(19),
        r.IsDBNull(20) ? null : r.GetString(20),
        r.GetDateTime(21));

    static NovedadDto MapNovedad(NpgsqlDataReader r) => new(
        r.GetGuid(0), r.GetGuid(1), r.GetString(2),
        r.GetString(3),
        r.GetFieldValue<DateOnly>(4),
        r.IsDBNull(5) ? null : r.GetFieldValue<DateOnly>(5),
        r.IsDBNull(6) ? null : r.GetInt32(6),
        r.IsDBNull(7) ? null : r.GetString(7),
        r.GetString(8),
        r.GetDateTime(9));
}
