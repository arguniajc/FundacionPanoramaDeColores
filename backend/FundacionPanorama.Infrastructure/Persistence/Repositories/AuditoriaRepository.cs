using FundacionPanorama.Application.Features.Auditoria.DTOs;
using FundacionPanorama.Application.Features.Auditoria.Interfaces;
using Npgsql;

namespace FundacionPanorama.Infrastructure.Persistence.Repositories;

/// <summary>Consulta de audit_log (la escritura vive en <see cref="AuditoriaSql"/>).</summary>
public class AuditoriaRepository(DbConnectionFactory factory) : IAuditoriaRepository
{
    public async Task<int> ContarAsync(FiltroAuditoria filtro, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmdCount = conn.CreateCommand();
        cmdCount.CommandText = $"SELECT COUNT(*) FROM audit_log {BuildWhere(filtro)}";
        AddParams(cmdCount, filtro);
        return Convert.ToInt32(await cmdCount.ExecuteScalarAsync(ct));
    }

    public async Task<IReadOnlyList<AuditoriaRegistroDto>> ListarAsync(FiltroAuditoria filtro, int pagina, int tamano, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            SELECT id, entidad_tipo, entidad_id, entidad_nombre, accion, usuario_email, detalle, fecha
            FROM audit_log {BuildWhere(filtro)}
            ORDER BY fecha DESC
            LIMIT @limit OFFSET @offset
            """;
        AddParams(cmd, filtro);
        cmd.Parameters.AddWithValue("limit",  tamano);
        cmd.Parameters.AddWithValue("offset", (pagina - 1) * tamano);

        var datos = new List<AuditoriaRegistroDto>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            datos.Add(new AuditoriaRegistroDto(
                Id:            reader[0].ToString()!,
                EntidadTipo:   reader.GetString(1),
                EntidadId:     reader.IsDBNull(2) ? null : reader.GetString(2),
                EntidadNombre: reader.IsDBNull(3) ? null : reader.GetString(3),
                Accion:        reader.GetString(4),
                UsuarioEmail:  reader.IsDBNull(5) ? null : reader.GetString(5),
                Detalle:       reader.IsDBNull(6) ? null : reader.GetString(6),
                Fecha:         ((DateTime)reader[7]).ToString("yyyy-MM-dd HH:mm")));
        }
        return datos;
    }

    public async Task<IReadOnlyList<string>> ListarTiposAsync(CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT DISTINCT entidad_tipo FROM audit_log ORDER BY 1";
        var tipos = new List<string>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct)) tipos.Add(r.GetString(0));
        return tipos;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string BuildWhere(FiltroAuditoria f)
    {
        var cond = new List<string>();
        if (!string.IsNullOrEmpty(f.Tipo))    cond.Add("entidad_tipo = @tipo");
        if (!string.IsNullOrEmpty(f.Usuario)) cond.Add("usuario_email ILIKE @usuario");
        if (!string.IsNullOrEmpty(f.Accion))  cond.Add("accion = @accion");
        if (!string.IsNullOrEmpty(f.Desde))   cond.Add("fecha::date >= @desde::date");
        if (!string.IsNullOrEmpty(f.Hasta))   cond.Add("fecha::date <= @hasta::date");
        return cond.Count > 0 ? "WHERE " + string.Join(" AND ", cond) : "";
    }

    private static void AddParams(NpgsqlCommand cmd, FiltroAuditoria f)
    {
        if (!string.IsNullOrEmpty(f.Tipo))    cmd.Parameters.AddWithValue("tipo",    f.Tipo);
        if (!string.IsNullOrEmpty(f.Usuario)) cmd.Parameters.AddWithValue("usuario", $"%{f.Usuario}%");
        if (!string.IsNullOrEmpty(f.Accion))  cmd.Parameters.AddWithValue("accion",  f.Accion);
        if (!string.IsNullOrEmpty(f.Desde))   cmd.Parameters.AddWithValue("desde",   f.Desde);
        if (!string.IsNullOrEmpty(f.Hasta))   cmd.Parameters.AddWithValue("hasta",   f.Hasta);
    }
}
