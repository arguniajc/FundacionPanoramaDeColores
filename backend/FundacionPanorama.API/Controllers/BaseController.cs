using Microsoft.AspNetCore.Mvc;
using Npgsql;
using NpgsqlTypes;

namespace FundacionPanorama.API.Controllers;

public abstract class BaseController : ControllerBase
{
    protected string? EmailUsuario =>
        User.FindFirst("email")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value
        ?? User.Identity?.Name;

    protected async Task RegistrarAuditAsync(
        NpgsqlConnection conn,
        NpgsqlTransaction? tx,
        string entidadTipo,
        string entidadId,
        string? entidadNombre,
        string accion,
        string? detalle = null)
    {
        try
        {
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
            cmd.Parameters.Add(new NpgsqlParameter("email",   NpgsqlDbType.Varchar) { Value = (object?)EmailUsuario  ?? DBNull.Value });
            cmd.Parameters.Add(new NpgsqlParameter("detalle", NpgsqlDbType.Text)    { Value = (object?)detalle        ?? DBNull.Value });
            await cmd.ExecuteNonQueryAsync();
        }
        catch { /* audit failures are non-fatal */ }
    }
}
