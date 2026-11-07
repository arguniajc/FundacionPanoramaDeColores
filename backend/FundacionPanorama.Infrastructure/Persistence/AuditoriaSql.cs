using Npgsql;
using NpgsqlTypes;

namespace FundacionPanorama.Infrastructure.Persistence;

/// <summary>
/// Inserta un registro en audit_log dentro de la conexión/transacción del llamador.
/// La auditoría es auxiliar: si falla, no debe afectar la operación principal.
/// Dentro de una transacción se usa un SAVEPOINT: en PostgreSQL un error sin savepoint
/// deja la transacción abortada y el COMMIT posterior la deshace entera, aunque la API
/// responda éxito (el cambio "guardado" se perdía en silencio).
/// </summary>
public static class AuditoriaSql
{
    public static async Task RegistrarAsync(
        NpgsqlConnection conn,
        NpgsqlTransaction? tx,
        string entidadTipo,
        string entidadId,
        string? entidadNombre,
        string accion,
        string? usuarioEmail,
        string? detalle = null)
    {
        const string punto = "auditoria";
        try
        {
            if (tx != null) await tx.SaveAsync(punto);

            await using var cmd = conn.CreateCommand();
            if (tx != null) cmd.Transaction = tx;
            cmd.CommandText = """
                INSERT INTO audit_log (entidad_tipo, entidad_id, entidad_nombre, accion, usuario_email, detalle)
                VALUES (@tipo, @eid, @nombre, @accion, @email, @detalle)
                """;
            cmd.Parameters.AddWithValue("tipo",   entidadTipo);
            cmd.Parameters.AddWithValue("eid",    entidadId);
            cmd.Parameters.Add(new NpgsqlParameter("nombre",  NpgsqlDbType.Varchar) { Value = (object?)entidadNombre ?? DBNull.Value });
            cmd.Parameters.AddWithValue("accion", accion);
            cmd.Parameters.Add(new NpgsqlParameter("email",   NpgsqlDbType.Varchar) { Value = (object?)usuarioEmail  ?? DBNull.Value });
            cmd.Parameters.Add(new NpgsqlParameter("detalle", NpgsqlDbType.Text)    { Value = (object?)detalle       ?? DBNull.Value });
            await cmd.ExecuteNonQueryAsync();

            if (tx != null) await tx.ReleaseAsync(punto);
        }
        catch
        {
            // Se descarta solo la auditoría; la transacción sigue utilizable
            if (tx != null)
            {
                try { await tx.RollbackAsync(punto); } catch { /* la transacción ya no es recuperable */ }
            }
        }
    }
}
