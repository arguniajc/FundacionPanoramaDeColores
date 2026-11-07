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
}
