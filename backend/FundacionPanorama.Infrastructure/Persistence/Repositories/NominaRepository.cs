using FundacionPanorama.Application.Features.Nomina.DTOs;
using FundacionPanorama.Application.Features.Nomina.Interfaces;
using Npgsql;
using FundacionPanorama.Application.Features.Nomina;

namespace FundacionPanorama.Infrastructure.Persistence.Repositories;

public class NominaRepository(DbConnectionFactory factory) : INominaRepository
{
    private static readonly string[] MESES_LABELS =
        ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
         "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

    // ── Períodos ──────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<NominaPeriodoDto>> ListarPeriodosAsync(int? anio, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            SELECT p.id, p.mes, p.anio, p.fecha_pago, p.estado, p.observacion, p.creado_en,
                   COUNT(l.id) AS total_emp,
                   COALESCE(SUM(l.neto_pagar), 0) AS total_neto
            FROM nomina_periodos p
            LEFT JOIN nomina_liquidaciones l ON l.periodo_id = p.id
            {(anio.HasValue ? "WHERE p.anio = @anio" : "")}
            GROUP BY p.id
            ORDER BY p.anio DESC, p.mes DESC
            """;
        if (anio.HasValue) cmd.Parameters.AddWithValue("anio", anio.Value);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<NominaPeriodoDto>();
        while (await r.ReadAsync(ct))
            list.Add(LeerPeriodo(r));
        return list;
    }

    public async Task<NominaPeriodoDto?> ObtenerPeriodoAsync(int id, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT p.id, p.mes, p.anio, p.fecha_pago, p.estado, p.observacion, p.creado_en,
                   COUNT(l.id), COALESCE(SUM(l.neto_pagar), 0)
            FROM nomina_periodos p
            LEFT JOIN nomina_liquidaciones l ON l.periodo_id = p.id
            WHERE p.id = @id
            GROUP BY p.id
            """;
        cmd.Parameters.AddWithValue("id", id);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        return await r.ReadAsync(ct) ? LeerPeriodo(r) : null;
    }

    public async Task<NominaPeriodoDto> CrearPeriodoAsync(CrearPeriodoDto dto, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO nomina_periodos (mes, anio, fecha_pago, observacion)
            VALUES (@mes, @anio, @fechaPago, @obs)
            RETURNING id, mes, anio, fecha_pago, estado, observacion, creado_en
            """;
        cmd.Parameters.AddWithValue("mes",      dto.Mes);
        cmd.Parameters.AddWithValue("anio",     dto.Anio);
        cmd.Parameters.Add(new NpgsqlParameter("fechaPago", NpgsqlTypes.NpgsqlDbType.Date) { Value = dto.FechaPago.HasValue ? (object)dto.FechaPago.Value : DBNull.Value });
        cmd.Parameters.AddWithValue("obs",      dto.Observacion ?? (object)DBNull.Value);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        await r.ReadAsync(ct);
        return new NominaPeriodoDto(
            r.GetInt32(0), r.GetInt32(1), MESES_LABELS[r.GetInt32(1) - 1], r.GetInt32(2),
            r.IsDBNull(3) ? null : r.GetFieldValue<DateOnly>(3),
            r.GetString(4), r.IsDBNull(5) ? null : r.GetString(5), 0, 0m, r.GetDateTime(6));
    }

    public async Task<bool> CerrarPeriodoAsync(int id, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "UPDATE nomina_periodos SET estado = 'cerrado' WHERE id = @id AND estado = 'borrador'";
        cmd.Parameters.AddWithValue("id", id);
        return await cmd.ExecuteNonQueryAsync(ct) > 0;
    }

    public async Task<bool> EliminarPeriodoAsync(int id, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM nomina_periodos WHERE id = @id AND estado = 'borrador'";
        cmd.Parameters.AddWithValue("id", id);
        return await cmd.ExecuteNonQueryAsync(ct) > 0;
    }

    // ── Liquidaciones ─────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<NominaLiquidacionDto>> ListarLiquidacionesAsync(int periodoId, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            {SelectLiquidacion}
            WHERE l.periodo_id = @pid
            ORDER BY nombre
            """;
        cmd.Parameters.AddWithValue("pid", periodoId);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<NominaLiquidacionDto>();
        while (await r.ReadAsync(ct)) list.Add(LeerLiquidacion(r));
        return list;
    }

    public async Task<NominaLiquidacionDto?> ObtenerLiquidacionAsync(int id, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"{SelectLiquidacion} WHERE l.id = @id";
        cmd.Parameters.AddWithValue("id", id);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        return await r.ReadAsync(ct) ? LeerLiquidacion(r) : null;
    }

    public async Task<NominaLiquidacionDto?> ActualizarLiquidacionAsync(int id, LiquidarEmpleadoDto dto, CancellationToken ct)
    {
        var salario = dto.SalarioOverride ?? await ObtenerSalarioEmpleado(dto.EmpleadoId, ct);
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        // salario_base guarda el salario MENSUAL; los totales van proporcionales a los días,
        // con los parámetros (SMLMV, auxilio, tasas) vigentes al momento de editar
        var t = Calcular(await LeerParametrosAsync(conn, ct), salario, dto);

        await using var cmd = conn.CreateCommand();
        // Solo si el período sigue en borrador: un período cerrado ya se pagó
        cmd.CommandText = """
            UPDATE nomina_liquidaciones l SET
                dias_trabajados = @dias, salario_base = @sal, auxilio_transporte = @aux,
                horas_extras = @he, bonificaciones = @bon,
                deduccion_salud = @salud, deduccion_pension = @pension,
                retencion_fuente = @rte, otras_deducciones = @otras,
                total_devengado = @dev, total_deducciones = @ded, neto_pagar = @neto,
                observacion = @obs
            FROM nomina_periodos p
            WHERE l.id = @id AND l.periodo_id = p.id AND p.estado = 'borrador'
            """;
        cmd.Parameters.AddWithValue("id",   id);
        cmd.Parameters.AddWithValue("dias", dto.DiasTrabajados);
        cmd.Parameters.AddWithValue("sal",  salario);
        cmd.Parameters.AddWithValue("aux",  t.Auxilio);
        cmd.Parameters.AddWithValue("he",   dto.HorasExtras);
        cmd.Parameters.AddWithValue("bon",  dto.Bonificaciones);
        cmd.Parameters.AddWithValue("salud",   t.Salud);
        cmd.Parameters.AddWithValue("pension", t.Pension);
        cmd.Parameters.AddWithValue("rte",     dto.RetencionFuente);
        cmd.Parameters.AddWithValue("otras",   dto.OtrasDeducciones);
        cmd.Parameters.AddWithValue("dev",     t.Devengado);
        cmd.Parameters.AddWithValue("ded",     t.Deducciones);
        cmd.Parameters.AddWithValue("neto",    t.Neto);
        cmd.Parameters.AddWithValue("obs",     dto.Observacion ?? (object)DBNull.Value);
        if (await cmd.ExecuteNonQueryAsync(ct) == 0) return null;

        return await ObtenerLiquidacionAsync(id, ct);
    }

    public async Task<IReadOnlyList<NominaLiquidacionDto>> AutoLiquidarAsync(int periodoId, AutoLiquidarDto dto, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);

        // Obtener empleados activos con salario
        await using var cmdEmp = conn.CreateCommand();
        cmdEmp.CommandText = $"""
            SELECT id, nombres || ' ' || apellidos, cargo, numero_documento, COALESCE(salario, 0)
            FROM empleados
            WHERE {(dto.SoloActivos ? "activo = true AND" : "")} salario IS NOT NULL AND salario > 0
            """;
        await using var rEmp = await cmdEmp.ExecuteReaderAsync(ct);
        var empleados = new List<(Guid Id, decimal Salario)>();
        while (await rEmp.ReadAsync(ct))
            empleados.Add((rEmp.GetGuid(0), (decimal)rEmp[4]));
        await rEmp.DisposeAsync();

        // Parámetros vigentes al momento de liquidar (una sola lectura para todo el lote)
        var parametros = await LeerParametrosAsync(conn, ct);
        foreach (var (empId, salario) in empleados)
        {
            // Mes completo (30 días); el ajuste por días se hace al editar la liquidación.
            // Solo crea las que faltan: una liquidación existente (quizá ya editada con días y novedades)
            // no se toca, para no dejarla con totales que no corresponden a sus propios datos.
            var (_, aux, salud, pension, devengado, deducciones, neto) = CalculoNomina.Calcular(parametros, salario, CalculoNomina.DiasMes);

            await using var cmdIns = conn.CreateCommand();
            cmdIns.CommandText = """
                INSERT INTO nomina_liquidaciones
                    (periodo_id, empleado_id, dias_trabajados, salario_base, auxilio_transporte,
                     horas_extras, bonificaciones, deduccion_salud, deduccion_pension,
                     retencion_fuente, otras_deducciones, total_devengado, total_deducciones, neto_pagar)
                VALUES (@pid, @eid, 30, @sal, @aux, 0, 0, @salud, @pension, 0, 0, @dev, @ded, @neto)
                ON CONFLICT (periodo_id, empleado_id) DO NOTHING
                """;
            cmdIns.Parameters.AddWithValue("pid",     periodoId);
            cmdIns.Parameters.AddWithValue("eid",     empId);
            cmdIns.Parameters.AddWithValue("sal",     salario);
            cmdIns.Parameters.AddWithValue("aux",     aux);
            cmdIns.Parameters.AddWithValue("salud",   salud);
            cmdIns.Parameters.AddWithValue("pension", pension);
            cmdIns.Parameters.AddWithValue("dev",     devengado);
            cmdIns.Parameters.AddWithValue("ded",     deducciones);
            cmdIns.Parameters.AddWithValue("neto",    neto);
            await cmdIns.ExecuteNonQueryAsync(ct);
        }

        return await ListarLiquidacionesAsync(periodoId, ct);
    }

    public async Task<NominaLiquidacionDto> LiquidarEmpleadoAsync(int periodoId, LiquidarEmpleadoDto dto, CancellationToken ct)
    {
        var salario = dto.SalarioOverride ?? await ObtenerSalarioEmpleado(dto.EmpleadoId, ct);
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        var (_, aux, salud, pension, devengado, deducciones, neto) = Calcular(await LeerParametrosAsync(conn, ct), salario, dto);

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO nomina_liquidaciones
                (periodo_id, empleado_id, dias_trabajados, salario_base, auxilio_transporte,
                 horas_extras, bonificaciones, deduccion_salud, deduccion_pension,
                 retencion_fuente, otras_deducciones, total_devengado, total_deducciones, neto_pagar, observacion)
            VALUES (@pid, @eid, @dias, @sal, @aux, @he, @bon, @salud, @pension, @rte, @otras, @dev, @ded, @neto, @obs)
            ON CONFLICT (periodo_id, empleado_id) DO UPDATE SET
                dias_trabajados = EXCLUDED.dias_trabajados,
                salario_base = EXCLUDED.salario_base,
                auxilio_transporte = EXCLUDED.auxilio_transporte,
                horas_extras = EXCLUDED.horas_extras,
                bonificaciones = EXCLUDED.bonificaciones,
                deduccion_salud = EXCLUDED.deduccion_salud,
                deduccion_pension = EXCLUDED.deduccion_pension,
                retencion_fuente = EXCLUDED.retencion_fuente,
                otras_deducciones = EXCLUDED.otras_deducciones,
                total_devengado = EXCLUDED.total_devengado,
                total_deducciones = EXCLUDED.total_deducciones,
                neto_pagar = EXCLUDED.neto_pagar,
                observacion = EXCLUDED.observacion
            RETURNING id
            """;
        cmd.Parameters.AddWithValue("pid",  periodoId);
        cmd.Parameters.AddWithValue("eid",  dto.EmpleadoId);
        cmd.Parameters.AddWithValue("dias", dto.DiasTrabajados);
        cmd.Parameters.AddWithValue("sal",  salario);
        cmd.Parameters.AddWithValue("aux",  aux);
        cmd.Parameters.AddWithValue("he",   dto.HorasExtras);
        cmd.Parameters.AddWithValue("bon",  dto.Bonificaciones);
        cmd.Parameters.AddWithValue("salud",  salud);
        cmd.Parameters.AddWithValue("pension",pension);
        cmd.Parameters.AddWithValue("rte",    dto.RetencionFuente);
        cmd.Parameters.AddWithValue("otras",  dto.OtrasDeducciones);
        cmd.Parameters.AddWithValue("dev",    devengado);
        cmd.Parameters.AddWithValue("ded",    deducciones);
        cmd.Parameters.AddWithValue("neto",   neto);
        cmd.Parameters.AddWithValue("obs",    dto.Observacion ?? (object)DBNull.Value);
        var newId = (int)(await cmd.ExecuteScalarAsync(ct))!;

        return (await ListarLiquidacionesAsync(periodoId, ct)).First(l => l.Id == newId);
    }

    public async Task<bool> EliminarLiquidacionAsync(int id, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            DELETE FROM nomina_liquidaciones l
            USING nomina_periodos p
            WHERE l.id = @id AND l.periodo_id = p.id AND p.estado = 'borrador'
            """;
        cmd.Parameters.AddWithValue("id", id);
        return await cmd.ExecuteNonQueryAsync(ct) > 0;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private const string SelectLiquidacion = """
        SELECT l.id, l.periodo_id, l.empleado_id,
               e.nombres || ' ' || e.apellidos AS nombre,
               e.cargo, e.numero_documento,
               l.dias_trabajados, l.salario_base, l.auxilio_transporte,
               l.horas_extras, l.bonificaciones,
               l.deduccion_salud, l.deduccion_pension,
               l.retencion_fuente, l.otras_deducciones,
               l.total_devengado, l.total_deducciones, l.neto_pagar,
               l.observacion
        FROM nomina_liquidaciones l
        JOIN empleados e ON e.id = l.empleado_id
        """;

    /// <summary>Totales de una liquidación manual (al liquidar y al editar): proporcionales a los días.</summary>
    private static TotalesLiquidacion Calcular(ParametrosNomina parametros, decimal salarioMensual, LiquidarEmpleadoDto dto)
        => CalculoNomina.Calcular(parametros, salarioMensual, dto.DiasTrabajados,
            dto.HorasExtras, dto.Bonificaciones, dto.RetencionFuente, dto.OtrasDeducciones);

    public async Task<ParametrosNomina> ObtenerParametrosAsync(CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        return await LeerParametrosAsync(conn, ct);
    }

    /// <summary>SMLMV, auxilio y tasas guardados en la configuración; sin fila de configuración, los predeterminados.</summary>
    private static async Task<ParametrosNomina> LeerParametrosAsync(NpgsqlConnection conn, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT nomina_smlmv, nomina_auxilio_transporte, nomina_tasa_salud, nomina_tasa_pension
            FROM configuracion LIMIT 1
            """;
        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct)) return ParametrosNomina.Predeterminados;
        var d = ParametrosNomina.Predeterminados;
        return new(
            r.IsDBNull(0) ? d.Smlmv             : r.GetDecimal(0),
            r.IsDBNull(1) ? d.AuxilioTransporte : r.GetDecimal(1),
            r.IsDBNull(2) ? d.TasaSalud         : r.GetDecimal(2),
            r.IsDBNull(3) ? d.TasaPension       : r.GetDecimal(3));
    }

    private async Task<decimal> ObtenerSalarioEmpleado(Guid id, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT COALESCE(salario, 0) FROM empleados WHERE id = @id";
        cmd.Parameters.AddWithValue("id", id);
        var val = await cmd.ExecuteScalarAsync(ct);
        return val is null or DBNull ? 0m : (decimal)val;
    }

    private static NominaPeriodoDto LeerPeriodo(System.Data.Common.DbDataReader r) =>
        new(r.GetInt32(0), r.GetInt32(1), MESES_LABELS[r.GetInt32(1) - 1], r.GetInt32(2),
            r.IsDBNull(3) ? null : r.GetFieldValue<DateOnly>(3),
            r.GetString(4),
            r.IsDBNull(5) ? null : r.GetString(5),
            (int)(long)r[7], (decimal)r[8], r.GetDateTime(6));

    private static NominaLiquidacionDto LeerLiquidacion(System.Data.Common.DbDataReader r) =>
        new(r.GetInt32(0), r.GetInt32(1), r.GetGuid(2),
            r.GetString(3),
            r.IsDBNull(4) ? null : r.GetString(4),
            r.IsDBNull(5) ? null : r.GetString(5),
            r.GetInt32(6),
            (decimal)r[7], (decimal)r[8], (decimal)r[9], (decimal)r[10],
            (decimal)r[11], (decimal)r[12], (decimal)r[13], (decimal)r[14],
            (decimal)r[15], (decimal)r[16], (decimal)r[17],
            r.IsDBNull(18) ? null : r.GetString(18));
}
