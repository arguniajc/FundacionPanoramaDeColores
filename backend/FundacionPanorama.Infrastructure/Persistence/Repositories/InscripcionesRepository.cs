using FundacionPanorama.Application.Features.Inscripciones.DTOs;
using FundacionPanorama.Application.Features.Inscripciones.Interfaces;
using FundacionPanorama.Application.Shared;
using Npgsql;
using NpgsqlTypes;

namespace FundacionPanorama.Infrastructure.Persistence.Repositories;

public class InscripcionesRepository(DbConnectionFactory factory) : IInscripcionesRepository
{
    public async Task<ListaPaginada<InscripcionDto>> ListarAsync(FiltroInscripciones f, int pagina, int porPagina, CancellationToken ct = default)
    {
        var where = new List<string> { "true" };
        var parms = new List<(string, object)>();
        if (f.ProgramaId.HasValue)     { where.Add("i.programa_id = @pid");     parms.Add(("pid", f.ProgramaId.Value)); }
        if (f.BeneficiarioId.HasValue) { where.Add("i.beneficiario_id = @bid"); parms.Add(("bid", f.BeneficiarioId.Value)); }
        if (!string.IsNullOrEmpty(f.Estado)) { where.Add("i.estado = @est");    parms.Add(("est", f.Estado)); }
        if (!string.IsNullOrEmpty(f.Buscar))
        {
            where.Add("""
                (concat_ws(' ', b.primer_nombre, b.segundo_nombre, b.primer_apellido, b.segundo_apellido) ILIKE @buscar
                 OR b.numero_documento ILIKE @buscar
                 OR p.nombre ILIKE @buscar)
                """);
            parms.Add(("buscar", SqlLike.Contiene(f.Buscar)));
        }

        // Los JOIN solo sirven a la búsqueda; los nombres se resuelven en Enriquecer
        var desde = $"""
            FROM inscripciones i
            LEFT JOIN beneficiarios b ON b.id = i.beneficiario_id
            LEFT JOIN programas     p ON p.id = i.programa_id
            WHERE {string.Join(" AND ", where)}
            """;

        await using var conn = factory.Create();
        await conn.OpenAsync(ct);

        int total;
        await using (var cmdCount = conn.CreateCommand())
        {
            cmdCount.CommandText = $"SELECT COUNT(*)::int {desde}";
            foreach (var (name, val) in parms) cmdCount.Parameters.AddWithValue(name, val);
            total = (int)(await cmdCount.ExecuteScalarAsync(ct))!;
        }

        var rows = new List<FilaInscripcion>();
        await using (var cmd = conn.CreateCommand())
        {
            // Orden estable: a igual fecha decide el id (la paginación no repite ni salta filas)
            cmd.CommandText = $"""
                SELECT i.id, i.beneficiario_id, i.programa_id, i.estado, i.fecha_inscripcion, i.datos::text,
                       i.observaciones, i.activo, i.fecha_creacion
                {desde}
                ORDER BY i.fecha_inscripcion DESC, i.id
                LIMIT @pp OFFSET @off
                """;
            foreach (var (name, val) in parms) cmd.Parameters.AddWithValue(name, val);
            cmd.Parameters.AddWithValue("pp",  porPagina);
            cmd.Parameters.AddWithValue("off", (pagina - 1) * porPagina);
            await using var r = await cmd.ExecuteReaderAsync(ct);
            while (await r.ReadAsync(ct)) rows.Add(LeerFila(r));
        }

        return new ListaPaginada<InscripcionDto>
        {
            Data = await Enriquecer(rows, ct), Total = total, Pagina = pagina, PorPagina = porPagina,
        };
    }

    public async Task<InscripcionDto?> ObtenerAsync(Guid id, CancellationToken ct = default)
    {
        var rows = await EjecutarSelectAsync(
            "SELECT id, beneficiario_id, programa_id, estado, fecha_inscripcion, datos::text, observaciones, activo, fecha_creacion " +
            "FROM inscripciones WHERE id = @id",
            [("id", id)], ct);
        if (rows.Count == 0) return null;
        return (await Enriquecer(rows, ct))[0];
    }

    public async Task<CrearInscripcionResultado> CrearAsync(CrearInscripcionDto dto, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        // Todo en una transacción con la fila del programa bloqueada: dos inscripciones simultáneas
        // al mismo programa se atienden una tras otra, así el conteo del cupo no queda desactualizado.
        await using var tx = await conn.BeginTransactionAsync(ct);

        await using (var chk = conn.CreateCommand())
        {
            chk.Transaction = tx;
            chk.CommandText = "SELECT COUNT(1) FROM beneficiarios WHERE id = @id";
            chk.Parameters.AddWithValue("id", dto.BeneficiarioId);
            if (Convert.ToInt64(await chk.ExecuteScalarAsync(ct)) == 0)
                return new(null, ErrorCrearInscripcion.BeneficiarioNoEncontrado);
        }

        var programa = await BloquearProgramaAsync(conn, tx, dto.ProgramaId, ct);
        if (!programa.Existe)
            return new(null, ErrorCrearInscripcion.ProgramaNoEncontrado);

        if (await ContarActivasDelBeneficiarioAsync(conn, tx, dto.BeneficiarioId, dto.ProgramaId, null, ct) > 0)
            return new(null, ErrorCrearInscripcion.YaInscritoActivo);

        if (await CupoLlenoAsync(conn, tx, dto.ProgramaId, programa.CupoMaximo, ct))
            return new(null, ErrorCrearInscripcion.CupoLleno);

        FilaInscripcion row;
        await using (var cmd = conn.CreateCommand())
        {
            cmd.Transaction = tx;
            cmd.CommandText = @"INSERT INTO inscripciones (beneficiario_id, programa_id, estado, datos, observaciones, activo)
                                VALUES (@bid, @pid, 'activa', @datos, @obs, true)
                                RETURNING id, beneficiario_id, programa_id, estado, fecha_inscripcion, datos::text, observaciones, activo, fecha_creacion";
            cmd.Parameters.AddWithValue("bid", dto.BeneficiarioId);
            cmd.Parameters.AddWithValue("pid", dto.ProgramaId);
            cmd.Parameters.Add(new NpgsqlParameter("datos", NpgsqlDbType.Jsonb) { Value = dto.Datos });
            cmd.Parameters.AddWithValue("obs", (object?)dto.Observaciones?.Trim() ?? DBNull.Value);
            await using var r = await cmd.ExecuteReaderAsync(ct);
            await r.ReadAsync(ct);
            row = LeerFila(r);
        }
        await tx.CommitAsync(ct);
        return new((await Enriquecer([row], ct))[0], ErrorCrearInscripcion.Ninguno);
    }

    public async Task<InscripcionDto?> ActualizarAsync(Guid id, ActualizarInscripcionDto dto, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"UPDATE inscripciones SET datos=@datos, observaciones=@obs WHERE id=@id
                            RETURNING id, beneficiario_id, programa_id, estado, fecha_inscripcion, datos::text, observaciones, activo, fecha_creacion";
        cmd.Parameters.AddWithValue("id",  id);
        cmd.Parameters.Add(new NpgsqlParameter("datos", NpgsqlDbType.Jsonb) { Value = dto.Datos });
        cmd.Parameters.AddWithValue("obs", (object?)dto.Observaciones?.Trim() ?? DBNull.Value);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct)) return null;
        var row = LeerFila(r);
        await r.CloseAsync();
        return (await Enriquecer([row], ct))[0];
    }

    public async Task<CambiarEstadoInscripcionResultado> CambiarEstadoAsync(Guid id, string estado, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        // Datos actuales de la inscripción
        Guid programaId, beneficiarioId;
        bool activaAntes;
        await using (var sel = conn.CreateCommand())
        {
            sel.Transaction = tx;
            // FOR UPDATE: dos cambios simultáneos de la misma inscripción se atienden en orden
            sel.CommandText = "SELECT programa_id, beneficiario_id, activo FROM inscripciones WHERE id = @id FOR UPDATE";
            sel.Parameters.AddWithValue("id", id);
            await using var rs = await sel.ExecuteReaderAsync(ct);
            if (!await rs.ReadAsync(ct)) return new(null, ErrorCambiarEstadoInscripcion.NoEncontrada);
            (programaId, beneficiarioId, activaAntes) = (rs.GetGuid(0), rs.GetGuid(1), rs.GetBoolean(2));
        }

        // Reactivar ocupa un cupo: misma regla y mismo bloqueo que al crear
        if (estado == "activa" && !activaAntes)
        {
            var programa = await BloquearProgramaAsync(conn, tx, programaId, ct);
            if (await ContarActivasDelBeneficiarioAsync(conn, tx, beneficiarioId, programaId, id, ct) > 0)
                return new(null, ErrorCambiarEstadoInscripcion.YaInscritoActivo);
            if (programa.Existe && await CupoLlenoAsync(conn, tx, programaId, programa.CupoMaximo, ct))
                return new(null, ErrorCambiarEstadoInscripcion.CupoLleno);
        }

        FilaInscripcion row;
        await using (var cmd = conn.CreateCommand())
        {
            cmd.Transaction = tx;
            cmd.CommandText = @"UPDATE inscripciones SET estado=@est, activo=@activo WHERE id=@id
                                RETURNING id, beneficiario_id, programa_id, estado, fecha_inscripcion, datos::text, observaciones, activo, fecha_creacion";
            cmd.Parameters.AddWithValue("id",     id);
            cmd.Parameters.AddWithValue("est",    estado);
            cmd.Parameters.AddWithValue("activo", estado == "activa");
            await using var r = await cmd.ExecuteReaderAsync(ct);
            if (!await r.ReadAsync(ct)) return new(null, ErrorCambiarEstadoInscripcion.NoEncontrada);
            row = LeerFila(r);
        }
        await tx.CommitAsync(ct);
        return new((await Enriquecer([row], ct))[0], ErrorCambiarEstadoInscripcion.Ninguno);
    }

    public async Task<bool> EliminarAsync(Guid id, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM inscripciones WHERE id=@id";
        cmd.Parameters.AddWithValue("id", id);
        var rows = await cmd.ExecuteNonQueryAsync(ct);
        return rows > 0;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Bloquea la fila del programa hasta el fin de la transacción (SELECT ... FOR UPDATE) y devuelve su
    /// cupo (NULL = sin límite); Existe=false si el programa no existe. Quien crea o reactiva una inscripción del
    /// mismo programa espera aquí, y como en READ COMMITTED cada sentencia ve lo ya confirmado, el conteo
    /// posterior incluye las inscripciones de la transacción anterior.
    /// </summary>
    private static async Task<(bool Existe, int? CupoMaximo)> BloquearProgramaAsync(
        NpgsqlConnection conn, NpgsqlTransaction tx, Guid programaId, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = "SELECT cupo_maximo FROM programas WHERE id = @pid FOR UPDATE";
        cmd.Parameters.AddWithValue("pid", programaId);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct)) return (false, null);
        return (true, r.IsDBNull(0) ? null : r.GetInt32(0));
    }

    /// <summary>Inscripciones activas del beneficiario en el programa (sin contar <paramref name="excluirId"/>).</summary>
    private static async Task<long> ContarActivasDelBeneficiarioAsync(
        NpgsqlConnection conn, NpgsqlTransaction tx, Guid beneficiarioId, Guid programaId, Guid? excluirId, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = """
            SELECT COUNT(1) FROM inscripciones
            WHERE beneficiario_id = @bid AND programa_id = @pid AND activo = true
              AND (@excluir::uuid IS NULL OR id <> @excluir::uuid)
            """;
        cmd.Parameters.AddWithValue("bid", beneficiarioId);
        cmd.Parameters.AddWithValue("pid", programaId);
        cmd.Parameters.Add(new NpgsqlParameter("excluir", NpgsqlDbType.Uuid) { Value = (object?)excluirId ?? DBNull.Value });
        return Convert.ToInt64(await cmd.ExecuteScalarAsync(ct));
    }

    /// <summary>
    /// Condición SQL de "inscripción que ocupa cupo" (activa). Es la regla del control de cupo y la
    /// reutiliza SedesRepository para mostrar los inscritos activos de cada programa: no duplicarla.
    /// </summary>
    internal const string CondicionOcupaCupo = "activo = true";

    /// <summary>true si el programa tiene cupo y ya hay esa cantidad de inscripciones activas.</summary>
    private static async Task<bool> CupoLlenoAsync(
        NpgsqlConnection conn, NpgsqlTransaction tx, Guid programaId, int? cupoMaximo, CancellationToken ct)
    {
        if (cupoMaximo is null) return false;
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = $"SELECT COUNT(*) FROM inscripciones WHERE programa_id = @pid AND {CondicionOcupaCupo}";
        cmd.Parameters.AddWithValue("pid", programaId);
        return Convert.ToInt64(await cmd.ExecuteScalarAsync(ct)) >= cupoMaximo.Value;
    }

    private record FilaInscripcion(Guid Id, Guid BeneficiarioId, Guid ProgramaId, string Estado,
        DateTime FechaInscripcion, string Datos, string? Observaciones, bool Activo, DateTime FechaCreacion);

    private static FilaInscripcion LeerFila(System.Data.Common.DbDataReader r) => new(
        r.GetGuid(0), r.GetGuid(1), r.GetGuid(2), r.GetString(3),
        r.GetDateTime(4), r.GetString(5), r.IsDBNull(6) ? null : r.GetString(6),
        r.GetBoolean(7), r.GetDateTime(8)
    );

    private async Task<List<FilaInscripcion>> EjecutarSelectAsync(string sql, IEnumerable<(string, object)> parametros, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        foreach (var (name, val) in parametros) cmd.Parameters.AddWithValue(name, val);
        var result = new List<FilaInscripcion>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct)) result.Add(LeerFila(r));
        return result;
    }

    // Enriquecer: resuelve nombres de beneficiario, programa y sede via Npgsql directo
    private async Task<List<InscripcionDto>> Enriquecer(IEnumerable<FilaInscripcion> filas, CancellationToken ct)
    {
        var lista = filas.ToList();
        if (lista.Count == 0) return [];

        var bIds    = lista.Select(i => i.BeneficiarioId).Distinct().ToArray();
        var pIds    = lista.Select(i => i.ProgramaId).Distinct().ToArray();

        await using var conn = factory.Create();
        await conn.OpenAsync(ct);

        // Beneficiarios
        var benefs = new Dictionary<Guid, (string Nombre, string? Documento)>();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT id, concat_ws(' ', primer_nombre, segundo_nombre, primer_apellido, segundo_apellido), numero_documento FROM beneficiarios WHERE id = ANY(@ids)";
            cmd.Parameters.AddWithValue("ids", bIds);
            await using var r = await cmd.ExecuteReaderAsync(ct);
            while (await r.ReadAsync(ct))
                benefs[r.GetGuid(0)] = (r.GetString(1), r.IsDBNull(2) ? null : r.GetString(2));
        }

        // Programas
        var progs = new Dictionary<Guid, (string Nombre, Guid? SedeId)>();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT id, nombre, sede_id FROM programas WHERE id = ANY(@ids)";
            cmd.Parameters.AddWithValue("ids", pIds);
            await using var r = await cmd.ExecuteReaderAsync(ct);
            while (await r.ReadAsync(ct))
                progs[r.GetGuid(0)] = (r.GetString(1), r.IsDBNull(2) ? null : r.GetGuid(2));
        }

        // Sedes
        var sedeIds = progs.Values.Select(p => p.SedeId).Where(s => s.HasValue).Select(s => s!.Value).Distinct().ToArray();
        var sedes   = new Dictionary<Guid, string>();
        if (sedeIds.Length > 0)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT id, nombre FROM sedes WHERE id = ANY(@ids)";
            cmd.Parameters.AddWithValue("ids", sedeIds);
            await using var r = await cmd.ExecuteReaderAsync(ct);
            while (await r.ReadAsync(ct))
                sedes[r.GetGuid(0)] = r.GetString(1);
        }

        return lista.Select(i =>
        {
            benefs.TryGetValue(i.BeneficiarioId, out var b);
            progs.TryGetValue(i.ProgramaId,      out var p);
            var sedeNombre = p.SedeId.HasValue && sedes.TryGetValue(p.SedeId.Value, out var sn) ? sn : "";
            return new InscripcionDto(
                i.Id, i.BeneficiarioId, b.Nombre ?? "", b.Documento,
                i.ProgramaId, p.Nombre ?? "", sedeNombre,
                i.Estado, i.FechaInscripcion, i.Datos, i.Observaciones, i.Activo, i.FechaCreacion);
        }).ToList();
    }
}
