using FundacionPanorama.Application.Features.Contabilidad.DTOs;
using FundacionPanorama.Application.Features.Contabilidad.Interfaces;
using Npgsql;

namespace FundacionPanorama.Infrastructure.Persistence.Repositories;

public class ContabilidadRepository(DbConnectionFactory factory) : IContabilidadRepository
{
    // ── Categorías ────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<CategoriaContableDto>> ListarCategoriasAsync(string? tipo, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            SELECT id, tipo, codigo_puc, nombre, descripcion, icono
            FROM cat_contable
            {(!string.IsNullOrEmpty(tipo) ? "WHERE tipo = @tipo" : "")}
            ORDER BY tipo, codigo_puc
            """;
        if (!string.IsNullOrEmpty(tipo)) cmd.Parameters.AddWithValue("tipo", tipo);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<CategoriaContableDto>();
        while (await r.ReadAsync(ct))
            list.Add(new CategoriaContableDto(
                r.GetInt32(0), r.GetString(1), r.GetString(2), r.GetString(3),
                r.IsDBNull(4) ? null : r.GetString(4),
                r.IsDBNull(5) ? null : r.GetString(5)));
        return list;
    }

    // ── Cuentas ───────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<CuentaCajaDto>> ListarCuentasAsync(CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT id, nombre, tipo, banco, numero_cuenta, saldo_inicial, saldo_actual, activo
            FROM cuentas_caja
            ORDER BY nombre
            """;
        return await EjecutarListaCuentas(cmd, ct);
    }

    public async Task<CuentaCajaDto> CrearCuentaAsync(CrearCuentaCajaDto dto, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO cuentas_caja (nombre, tipo, banco, numero_cuenta, saldo_inicial, saldo_actual)
            VALUES (@nombre, @tipo, @banco, @numCuenta, @saldoInicial, @saldoInicial)
            RETURNING id
            """;
        cmd.Parameters.AddWithValue("nombre",       dto.Nombre);
        cmd.Parameters.AddWithValue("tipo",         dto.Tipo);
        cmd.Parameters.AddWithValue("banco",        (object?)dto.Banco        ?? DBNull.Value);
        cmd.Parameters.AddWithValue("numCuenta",    (object?)dto.NumeroCuenta ?? DBNull.Value);
        cmd.Parameters.AddWithValue("saldoInicial", dto.SaldoInicial);
        var newId = (Guid)(await cmd.ExecuteScalarAsync(ct))!;
        return (await ObtenerCuentaAsync(conn, newId, ct))!;
    }

    public async Task<CuentaCajaDto?> ActualizarCuentaAsync(Guid id, CrearCuentaCajaDto dto, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE cuentas_caja
            SET nombre = @nombre, tipo = @tipo, banco = @banco, numero_cuenta = @numCuenta
            WHERE id = @id
            """;
        cmd.Parameters.AddWithValue("nombre",    dto.Nombre);
        cmd.Parameters.AddWithValue("tipo",      dto.Tipo);
        cmd.Parameters.AddWithValue("banco",     (object?)dto.Banco        ?? DBNull.Value);
        cmd.Parameters.AddWithValue("numCuenta", (object?)dto.NumeroCuenta ?? DBNull.Value);
        cmd.Parameters.AddWithValue("id",        id);
        var rows = await cmd.ExecuteNonQueryAsync(ct);
        return rows == 0 ? null : await ObtenerCuentaAsync(conn, id, ct);
    }

    public async Task<bool> EliminarCuentaAsync(Guid id, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM cuentas_caja WHERE id = @id";
        cmd.Parameters.AddWithValue("id", id);
        return await cmd.ExecuteNonQueryAsync(ct) > 0;
    }

    // ── Movimientos ───────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<MovimientoDto>> ListarMovimientosAsync(
        string? tipo, Guid? cuentaId, Guid? programaId, int? mes, int? anio, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();

        var where = new List<string>();
        if (!string.IsNullOrEmpty(tipo)) where.Add("m.tipo = @tipo");
        if (cuentaId.HasValue)           where.Add("m.cuenta_id = @cuentaId");
        if (programaId.HasValue)         where.Add("m.programa_id = @programaId");
        if (mes.HasValue)                where.Add("EXTRACT(MONTH FROM m.fecha) = @mes");
        if (anio.HasValue)               where.Add("EXTRACT(YEAR  FROM m.fecha) = @anio");

        cmd.CommandText = $"""
            SELECT m.id, m.tipo, m.fecha, m.concepto, m.monto,
                   m.cuenta_id,   c.nombre   AS cuenta_nombre,
                   m.categoria_id, cat.nombre AS cat_nombre, cat.codigo_puc,
                   m.programa_id,  p.nombre   AS prog_nombre,
                   m.tercero_nombre, m.tercero_documento,
                   m.numero_soporte, m.descripcion, m.fecha_creacion
            FROM movimientos_contables m
            JOIN  cuentas_caja c    ON c.id   = m.cuenta_id
            JOIN  cat_contable cat  ON cat.id = m.categoria_id
            LEFT JOIN programas p  ON p.id   = m.programa_id
            {(where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "")}
            ORDER BY m.fecha DESC, m.fecha_creacion DESC
            LIMIT 500
            """;

        if (!string.IsNullOrEmpty(tipo)) cmd.Parameters.AddWithValue("tipo",       tipo);
        if (cuentaId.HasValue)           cmd.Parameters.AddWithValue("cuentaId",   cuentaId.Value);
        if (programaId.HasValue)         cmd.Parameters.AddWithValue("programaId", programaId.Value);
        if (mes.HasValue)                cmd.Parameters.AddWithValue("mes",        mes.Value);
        if (anio.HasValue)               cmd.Parameters.AddWithValue("anio",       anio.Value);

        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<MovimientoDto>();
        while (await r.ReadAsync(ct)) list.Add(MapMovimiento(r));
        return list;
    }

    public async Task<MovimientoDto?> ObtenerMovimientoAsync(Guid id, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        return await ObtenerMovimientoInternoAsync(conn, id, ct);
    }

    public async Task<MovimientoDto> CrearMovimientoAsync(CrearMovimientoDto dto, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = """
            INSERT INTO movimientos_contables
                (tipo, fecha, concepto, monto, cuenta_id, categoria_id, programa_id,
                 tercero_nombre, tercero_documento, numero_soporte, descripcion)
            VALUES
                (@tipo, @fecha, @concepto, @monto, @cuentaId, @catId, @progId,
                 @tercNombre, @tercDoc, @numSoporte, @desc)
            RETURNING id
            """;
        AddMovimientoParams(cmd, dto.Tipo, dto.Fecha, dto.Concepto, dto.Monto, dto.CuentaId, dto.CategoriaId,
            dto.ProgramaId, dto.TerceroNombre, dto.TerceroDocumento, dto.NumeroSoporte, dto.Descripcion);
        var newId = (Guid)(await cmd.ExecuteScalarAsync(ct))!;

        await ActualizarSaldoAsync(conn, tx, dto.CuentaId, dto.Tipo, dto.Monto, ct);
        await tx.CommitAsync(ct);

        return (await ObtenerMovimientoInternoAsync(conn, newId, ct))!;
    }

    public async Task<MovimientoDto?> ActualizarMovimientoAsync(Guid id, ActualizarMovimientoDto dto, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);

        var original = await ObtenerMovimientoInternoAsync(conn, id, ct);
        if (original is null) return null;

        await using var tx = await conn.BeginTransactionAsync(ct);

        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = """
            UPDATE movimientos_contables SET
                tipo = @tipo, fecha = @fecha, concepto = @concepto, monto = @monto,
                cuenta_id = @cuentaId, categoria_id = @catId, programa_id = @progId,
                tercero_nombre = @tercNombre, tercero_documento = @tercDoc,
                numero_soporte = @numSoporte, descripcion = @desc
            WHERE id = @id
            """;
        AddMovimientoParams(cmd, dto.Tipo, dto.Fecha, dto.Concepto, dto.Monto, dto.CuentaId, dto.CategoriaId,
            dto.ProgramaId, dto.TerceroNombre, dto.TerceroDocumento, dto.NumeroSoporte, dto.Descripcion);
        cmd.Parameters.AddWithValue("id", id);
        await cmd.ExecuteNonQueryAsync(ct);

        // Revertir efecto del movimiento original
        var tipoInverso = original.Tipo == "ingreso" ? "egreso" : "ingreso";
        await ActualizarSaldoAsync(conn, tx, original.CuentaId, tipoInverso, original.Monto, ct);
        // Aplicar el nuevo efecto
        await ActualizarSaldoAsync(conn, tx, dto.CuentaId, dto.Tipo, dto.Monto, ct);

        await tx.CommitAsync(ct);
        return await ObtenerMovimientoInternoAsync(conn, id, ct);
    }

    public async Task<bool> EliminarMovimientoAsync(Guid id, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);

        var mov = await ObtenerMovimientoInternoAsync(conn, id, ct);
        if (mov is null) return false;

        await using var tx = await conn.BeginTransactionAsync(ct);

        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = "DELETE FROM movimientos_contables WHERE id = @id";
        cmd.Parameters.AddWithValue("id", id);
        await cmd.ExecuteNonQueryAsync(ct);

        var tipoInverso = mov.Tipo == "ingreso" ? "egreso" : "ingreso";
        await ActualizarSaldoAsync(conn, tx, mov.CuentaId, tipoInverso, mov.Monto, ct);

        await tx.CommitAsync(ct);
        return true;
    }

    // ── Presupuesto ───────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<PresupuestoDto>> ListarPresupuestosAsync(int anio, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT pb.id, pb.anio, pb.programa_id, p.nombre AS prog_nombre,
                   pb.categoria_id, cat.nombre AS cat_nombre, cat.codigo_puc,
                   pb.monto_presupuestado,
                   COALESCE(SUM(m.monto), 0) AS ejecutado
            FROM presupuesto_contable pb
            JOIN  cat_contable cat ON cat.id = pb.categoria_id
            LEFT JOIN programas p  ON p.id  = pb.programa_id
            LEFT JOIN movimientos_contables m
                ON  m.categoria_id = pb.categoria_id
                AND (pb.programa_id IS NULL OR m.programa_id = pb.programa_id)
                AND EXTRACT(YEAR FROM m.fecha) = pb.anio
            WHERE pb.anio = @anio
            GROUP BY pb.id, pb.anio, pb.programa_id, p.nombre,
                     pb.categoria_id, cat.nombre, cat.codigo_puc, pb.monto_presupuestado
            ORDER BY cat.tipo, cat.codigo_puc
            """;
        cmd.Parameters.AddWithValue("anio", anio);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<PresupuestoDto>();
        while (await r.ReadAsync(ct))
        {
            var presupuestado = (decimal)r[7];
            var ejecutado     = (decimal)r[8];
            list.Add(new PresupuestoDto(
                r.GetGuid(0), r.GetInt32(1),
                r.IsDBNull(2) ? null : r.GetGuid(2),
                r.IsDBNull(3) ? null : r.GetString(3),
                r.GetInt32(4), r.GetString(5), r.GetString(6),
                presupuestado, ejecutado, presupuestado - ejecutado));
        }
        return list;
    }

    public async Task<PresupuestoDto> CrearPresupuestoAsync(CrearPresupuestoDto dto, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO presupuesto_contable (anio, programa_id, categoria_id, monto_presupuestado)
            VALUES (@anio, @progId, @catId, @monto)
            RETURNING id
            """;
        cmd.Parameters.AddWithValue("anio",   dto.Anio);
        cmd.Parameters.AddWithValue("progId", (object?)dto.ProgramaId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("catId",  dto.CategoriaId);
        cmd.Parameters.AddWithValue("monto",  dto.MontoPresupuestado);
        var newId = (Guid)(await cmd.ExecuteScalarAsync(ct))!;
        return (await ListarPresupuestosAsync(dto.Anio, ct)).First(p => p.Id == newId);
    }

    public async Task<PresupuestoDto?> ActualizarPresupuestoAsync(Guid id, CrearPresupuestoDto dto, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE presupuesto_contable
            SET anio = @anio, programa_id = @progId, categoria_id = @catId, monto_presupuestado = @monto
            WHERE id = @id
            """;
        cmd.Parameters.AddWithValue("anio",   dto.Anio);
        cmd.Parameters.AddWithValue("progId", (object?)dto.ProgramaId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("catId",  dto.CategoriaId);
        cmd.Parameters.AddWithValue("monto",  dto.MontoPresupuestado);
        cmd.Parameters.AddWithValue("id",     id);
        var rows = await cmd.ExecuteNonQueryAsync(ct);
        if (rows == 0) return null;
        return (await ListarPresupuestosAsync(dto.Anio, ct)).FirstOrDefault(p => p.Id == id);
    }

    public async Task<bool> EliminarPresupuestoAsync(Guid id, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM presupuesto_contable WHERE id = @id";
        cmd.Parameters.AddWithValue("id", id);
        return await cmd.ExecuteNonQueryAsync(ct) > 0;
    }

    // ── Stats ─────────────────────────────────────────────────────────────────

    public async Task<ContabilidadStatsDto> StatsAsync(CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);

        await using var cmd1 = conn.CreateCommand();
        cmd1.CommandText = "SELECT COALESCE(SUM(saldo_actual), 0) FROM cuentas_caja WHERE activo = true";
        var saldoTotal = (decimal)(await cmd1.ExecuteScalarAsync(ct))!;

        await using var cmd2 = conn.CreateCommand();
        cmd2.CommandText = """
            SELECT
                COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN tipo = 'egreso'  THEN monto ELSE 0 END), 0)
            FROM movimientos_contables
            WHERE EXTRACT(YEAR  FROM fecha) = EXTRACT(YEAR  FROM CURRENT_DATE)
              AND EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE)
            """;
        await using var r2 = await cmd2.ExecuteReaderAsync(ct);
        await r2.ReadAsync(ct);
        var ingresosMes = (decimal)r2[0];
        var egresosMes  = (decimal)r2[1];
        await r2.CloseAsync();

        await using var cmd3 = conn.CreateCommand();
        cmd3.CommandText = """
            SELECT
                COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN tipo = 'egreso'  THEN monto ELSE 0 END), 0)
            FROM movimientos_contables
            WHERE EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)
            """;
        await using var r3 = await cmd3.ExecuteReaderAsync(ct);
        await r3.ReadAsync(ct);
        var ingresosAnio = (decimal)r3[0];
        var egresosAnio  = (decimal)r3[1];
        await r3.CloseAsync();

        await using var cmd4 = conn.CreateCommand();
        cmd4.CommandText = """
            SELECT TO_CHAR(fecha, 'Mon YYYY'),
                   COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0),
                   COALESCE(SUM(CASE WHEN tipo = 'egreso'  THEN monto ELSE 0 END), 0)
            FROM movimientos_contables
            WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
            GROUP BY TO_CHAR(fecha, 'Mon YYYY'), DATE_TRUNC('month', fecha)
            ORDER BY DATE_TRUNC('month', fecha)
            """;
        await using var r4 = await cmd4.ExecuteReaderAsync(ct);
        var serie = new List<SerieMesContDto>();
        while (await r4.ReadAsync(ct))
            serie.Add(new SerieMesContDto(r4.GetString(0), (decimal)r4[1], (decimal)r4[2]));

        return new ContabilidadStatsDto(
            saldoTotal, ingresosMes, egresosMes, ingresosMes - egresosMes,
            ingresosAnio, egresosAnio, serie);
    }

    // ── Reporte ───────────────────────────────────────────────────────────────

    public async Task<ReporteContadorDto> ReporteAsync(int mes, int anio, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);

        await using var cmd1 = conn.CreateCommand();
        cmd1.CommandText = """
            SELECT
                COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN tipo = 'egreso'  THEN monto ELSE 0 END), 0)
            FROM movimientos_contables
            WHERE EXTRACT(MONTH FROM fecha) = @mes
              AND EXTRACT(YEAR  FROM fecha) = @anio
            """;
        cmd1.Parameters.AddWithValue("mes",  mes);
        cmd1.Parameters.AddWithValue("anio", anio);
        await using var r1 = await cmd1.ExecuteReaderAsync(ct);
        await r1.ReadAsync(ct);
        var totalIngresos = (decimal)r1[0];
        var totalEgresos  = (decimal)r1[1];
        await r1.CloseAsync();

        await using var cmd2 = conn.CreateCommand();
        cmd2.CommandText = """
            SELECT cat.codigo_puc, cat.nombre, cat.tipo,
                   COALESCE(SUM(m.monto), 0)
            FROM movimientos_contables m
            JOIN cat_contable cat ON cat.id = m.categoria_id
            WHERE EXTRACT(MONTH FROM m.fecha) = @mes
              AND EXTRACT(YEAR  FROM m.fecha) = @anio
            GROUP BY cat.codigo_puc, cat.nombre, cat.tipo
            ORDER BY cat.tipo, cat.codigo_puc
            """;
        cmd2.Parameters.AddWithValue("mes",  mes);
        cmd2.Parameters.AddWithValue("anio", anio);
        await using var r2 = await cmd2.ExecuteReaderAsync(ct);
        var porCuenta = new List<ResumenCuentaDto>();
        while (await r2.ReadAsync(ct))
            porCuenta.Add(new ResumenCuentaDto(r2.GetString(0), r2.GetString(1), r2.GetString(2), (decimal)r2[3]));
        await r2.CloseAsync();

        await using var cmd3 = conn.CreateCommand();
        cmd3.CommandText = """
            SELECT COALESCE(p.nombre, 'Sin programa'),
                   COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE 0 END), 0),
                   COALESCE(SUM(CASE WHEN m.tipo = 'egreso'  THEN m.monto ELSE 0 END), 0)
            FROM movimientos_contables m
            LEFT JOIN programas p ON p.id = m.programa_id
            WHERE EXTRACT(MONTH FROM m.fecha) = @mes
              AND EXTRACT(YEAR  FROM m.fecha) = @anio
            GROUP BY COALESCE(p.nombre, 'Sin programa')
            ORDER BY 1
            """;
        cmd3.Parameters.AddWithValue("mes",  mes);
        cmd3.Parameters.AddWithValue("anio", anio);
        await using var r3 = await cmd3.ExecuteReaderAsync(ct);
        var porPrograma = new List<ResumenProgramaDto>();
        while (await r3.ReadAsync(ct))
        {
            var ing = (decimal)r3[1];
            var egr = (decimal)r3[2];
            porPrograma.Add(new ResumenProgramaDto(r3.GetString(0), ing, egr, ing - egr));
        }
        await r3.CloseAsync();

        var movimientos = await ListarMovimientosAsync(null, null, null, mes, anio, ct);
        var periodo = $"{new DateTime(anio, mes, 1):MMMM yyyy}";
        return new ReporteContadorDto(periodo, totalIngresos, totalEgresos, totalIngresos - totalEgresos,
            porCuenta, porPrograma, movimientos);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    static async Task<CuentaCajaDto?> ObtenerCuentaAsync(NpgsqlConnection conn, Guid id, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT id, nombre, tipo, banco, numero_cuenta, saldo_inicial, saldo_actual, activo
            FROM cuentas_caja WHERE id = @id
            """;
        cmd.Parameters.AddWithValue("id", id);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        return await r.ReadAsync(ct) ? MapCuenta(r) : null;
    }

    static async Task<IReadOnlyList<CuentaCajaDto>> EjecutarListaCuentas(NpgsqlCommand cmd, CancellationToken ct)
    {
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<CuentaCajaDto>();
        while (await r.ReadAsync(ct)) list.Add(MapCuenta(r));
        return list;
    }

    static async Task ActualizarSaldoAsync(
        NpgsqlConnection conn, NpgsqlTransaction tx, Guid cuentaId, string tipo, decimal monto, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        var signo = tipo == "ingreso" ? "+" : "-";
        cmd.CommandText = $"UPDATE cuentas_caja SET saldo_actual = saldo_actual {signo} @monto WHERE id = @id";
        cmd.Parameters.AddWithValue("monto", monto);
        cmd.Parameters.AddWithValue("id",    cuentaId);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    async Task<MovimientoDto?> ObtenerMovimientoInternoAsync(NpgsqlConnection conn, Guid id, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT m.id, m.tipo, m.fecha, m.concepto, m.monto,
                   m.cuenta_id,    c.nombre   AS cuenta_nombre,
                   m.categoria_id, cat.nombre AS cat_nombre, cat.codigo_puc,
                   m.programa_id,  p.nombre   AS prog_nombre,
                   m.tercero_nombre, m.tercero_documento,
                   m.numero_soporte, m.descripcion, m.fecha_creacion
            FROM movimientos_contables m
            JOIN  cuentas_caja c    ON c.id   = m.cuenta_id
            JOIN  cat_contable cat  ON cat.id = m.categoria_id
            LEFT JOIN programas p  ON p.id   = m.programa_id
            WHERE m.id = @id
            """;
        cmd.Parameters.AddWithValue("id", id);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        return await r.ReadAsync(ct) ? MapMovimiento(r) : null;
    }

    static void AddMovimientoParams(NpgsqlCommand cmd,
        string tipo, DateOnly fecha, string concepto, decimal monto,
        Guid cuentaId, int catId, Guid? programaId,
        string? tercNombre, string? tercDoc, string? numSoporte, string? desc)
    {
        cmd.Parameters.AddWithValue("tipo",       tipo);
        cmd.Parameters.AddWithValue("fecha",      fecha);
        cmd.Parameters.AddWithValue("concepto",   concepto);
        cmd.Parameters.AddWithValue("monto",      monto);
        cmd.Parameters.AddWithValue("cuentaId",   cuentaId);
        cmd.Parameters.AddWithValue("catId",      catId);
        cmd.Parameters.AddWithValue("progId",     (object?)programaId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("tercNombre", (object?)tercNombre ?? DBNull.Value);
        cmd.Parameters.AddWithValue("tercDoc",    (object?)tercDoc    ?? DBNull.Value);
        cmd.Parameters.AddWithValue("numSoporte", (object?)numSoporte ?? DBNull.Value);
        cmd.Parameters.AddWithValue("desc",       (object?)desc       ?? DBNull.Value);
    }

    static CuentaCajaDto MapCuenta(NpgsqlDataReader r) => new(
        r.GetGuid(0), r.GetString(1), r.GetString(2),
        r.IsDBNull(3) ? null : r.GetString(3),
        r.IsDBNull(4) ? null : r.GetString(4),
        (decimal)r[5], (decimal)r[6], r.GetBoolean(7));

    static MovimientoDto MapMovimiento(NpgsqlDataReader r) => new(
        r.GetGuid(0), r.GetString(1), r.GetFieldValue<DateOnly>(2), r.GetString(3), (decimal)r[4],
        r.GetGuid(5), r.GetString(6),
        r.GetInt32(7), r.GetString(8), r.GetString(9),
        r.IsDBNull(10) ? null : r.GetGuid(10),
        r.IsDBNull(11) ? null : r.GetString(11),
        r.IsDBNull(12) ? null : r.GetString(12),
        r.IsDBNull(13) ? null : r.GetString(13),
        r.IsDBNull(14) ? null : r.GetString(14),
        r.IsDBNull(15) ? null : r.GetString(15),
        r.GetDateTime(16));
}
