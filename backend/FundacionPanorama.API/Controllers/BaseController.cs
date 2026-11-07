using FundacionPanorama.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace FundacionPanorama.API.Controllers;

public abstract class BaseController : ControllerBase
{
    protected string? EmailUsuario =>
        User.FindFirst("email")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value
        ?? User.Identity?.Name;

    // Auditoría no fatal (ver AuditoriaSql: usa savepoint si hay transacción)
    protected Task RegistrarAuditAsync(
        NpgsqlConnection conn,
        NpgsqlTransaction? tx,
        string entidadTipo,
        string entidadId,
        string? entidadNombre,
        string accion,
        string? detalle = null)
        => AuditoriaSql.RegistrarAsync(conn, tx, entidadTipo, entidadId, entidadNombre, accion, EmailUsuario, detalle);

    // Auditoría después de una operación ya terminada: abre su propia conexión
    protected async Task AuditarAsync(string entidadTipo, string entidadId, string? entidadNombre, string accion, string? detalle = null)
    {
        await using var conn = HttpContext.RequestServices.GetRequiredService<DbConnectionFactory>().Create();
        try { await conn.OpenAsync(); } catch { return; /* auditoría no fatal */ }
        await AuditoriaSql.RegistrarAsync(conn, null, entidadTipo, entidadId, entidadNombre, accion, EmailUsuario, detalle);
    }
}
