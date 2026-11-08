using FundacionPanorama.Application.Features.Inscripciones.DTOs;
using FundacionPanorama.Application.Features.Inscripciones.Interfaces;
using Npgsql;
using NpgsqlTypes;

namespace FundacionPanorama.Infrastructure.Persistence.Repositories;

public class InscripcionesRepository(DbConnectionFactory factory) : IInscripcionesRepository
{
    public async Task<IReadOnlyList<InscripcionDto>> ListarAsync(Guid? programaId, Guid? beneficiarioId, string? estado, CancellationToken ct = default)
    {
        var where = new List<string> { "true" };
        var parms = new List<(string, object)>();
        if (programaId.HasValue)     { where.Add("programa_id = @pid");     parms.Add(("pid", programaId.Value)); }
        if (beneficiarioId.HasValue) { where.Add("beneficiario_id = @bid"); parms.Add(("bid", beneficiarioId.Value)); }
        if (!string.IsNullOrEmpty(estado)) { where.Add("estado = @est");    parms.Add(("est", estado)); }

        var sql = $"SELECT id, beneficiario_id, programa_id, estado, fecha_inscripcion, datos::text, observaciones, activo, fecha_creacion " +
                  $"FROM inscripciones WHERE {string.Join(" AND ", where)} ORDER BY fecha_inscripcion DESC";
        var rows = await EjecutarSelectAsync(sql, parms, ct);
        return await Enriquecer(rows, ct);
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

        // Validar existencia usando Npgsql directo
        await using (var chk = conn.CreateCommand())
        {
            chk.CommandText = "SELECT COUNT(1) FROM beneficiarios WHERE id = @id";
            chk.Parameters.AddWithValue("id", dto.BeneficiarioId);
            if (Convert.ToInt64(await chk.ExecuteScalarAsync(ct)) == 0)
                return new(null, ErrorCrearInscripcion.BeneficiarioNoEncontrado);
        }
        await using (var chk = conn.CreateCommand())
        {
            chk.CommandText = "SELECT COUNT(1) FROM programas WHERE id = @id";
            chk.Parameters.AddWithValue("id", dto.ProgramaId);
            if (Convert.ToInt64(await chk.ExecuteScalarAsync(ct)) == 0)
                return new(null, ErrorCrearInscripcion.ProgramaNoEncontrado);
        }
        await using (var chk = conn.CreateCommand())
        {
            chk.CommandText = "SELECT COUNT(1) FROM inscripciones WHERE beneficiario_id = @bid AND programa_id = @pid AND activo = true";
            chk.Parameters.AddWithValue("bid", dto.BeneficiarioId);
            chk.Parameters.AddWithValue("pid", dto.ProgramaId);
            if (Convert.ToInt64(await chk.ExecuteScalarAsync(ct)) > 0)
                return new(null, ErrorCrearInscripcion.YaInscritoActivo);
        }
        await using (var chk = conn.CreateCommand())
        {
            // Cupo máximo del programa (NULL = sin límite) frente a inscripciones activas
            chk.CommandText = """
                SELECT p.cupo_maximo,
                       (SELECT COUNT(*) FROM inscripciones i WHERE i.programa_id = p.id AND i.activo = true)
                FROM programas p WHERE p.id = @pid
                """;
            chk.Parameters.AddWithValue("pid", dto.ProgramaId);
            await using var rc = await chk.ExecuteReaderAsync(ct);
            if (await rc.ReadAsync(ct) && !rc.IsDBNull(0) && rc.GetInt64(1) >= rc.GetInt32(0))
                return new(null, ErrorCrearInscripcion.CupoLleno);
        }

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"INSERT INTO inscripciones (beneficiario_id, programa_id, estado, datos, observaciones, activo)
                            VALUES (@bid, @pid, 'activa', @datos, @obs, true)
                            RETURNING id, beneficiario_id, programa_id, estado, fecha_inscripcion, datos::text, observaciones, activo, fecha_creacion";
        cmd.Parameters.AddWithValue("bid", dto.BeneficiarioId);
        cmd.Parameters.AddWithValue("pid", dto.ProgramaId);
        cmd.Parameters.Add(new NpgsqlParameter("datos", NpgsqlDbType.Jsonb) { Value = dto.Datos });
        cmd.Parameters.AddWithValue("obs", (object?)dto.Observaciones?.Trim() ?? DBNull.Value);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        await r.ReadAsync(ct);
        var row = LeerFila(r);
        await r.CloseAsync();
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

    public async Task<InscripcionDto?> CambiarEstadoAsync(Guid id, string estado, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"UPDATE inscripciones SET estado=@est, activo=@activo WHERE id=@id
                            RETURNING id, beneficiario_id, programa_id, estado, fecha_inscripcion, datos::text, observaciones, activo, fecha_creacion";
        cmd.Parameters.AddWithValue("id",     id);
        cmd.Parameters.AddWithValue("est",    estado);
        cmd.Parameters.AddWithValue("activo", estado == "activa");
        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct)) return null;
        var row = LeerFila(r);
        await r.CloseAsync();
        return (await Enriquecer([row], ct))[0];
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
