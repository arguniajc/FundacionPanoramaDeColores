using FundacionPanorama.API.Data;
using FundacionPanorama.API.Filters;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/auditoria")]
[Authorize]
public class AuditoriaController(AppDbContext db) : ControllerBase
{
    private NpgsqlConnection AbrirConexion() => new(db.Database.GetConnectionString());

    private static string BuildWhere(string? tipo, string? usuario, string? accion, string? desde, string? hasta)
    {
        var cond = new List<string>();
        if (!string.IsNullOrEmpty(tipo))    cond.Add("entidad_tipo = @tipo");
        if (!string.IsNullOrEmpty(usuario)) cond.Add("usuario_email ILIKE @usuario");
        if (!string.IsNullOrEmpty(accion))  cond.Add("accion = @accion");
        if (!string.IsNullOrEmpty(desde))   cond.Add("fecha::date >= @desde::date");
        if (!string.IsNullOrEmpty(hasta))   cond.Add("fecha::date <= @hasta::date");
        return cond.Count > 0 ? "WHERE " + string.Join(" AND ", cond) : "";
    }

    private static void AddParams(NpgsqlCommand cmd,
        string? tipo, string? usuario, string? accion, string? desde, string? hasta)
    {
        if (!string.IsNullOrEmpty(tipo))    cmd.Parameters.AddWithValue("tipo",    tipo);
        if (!string.IsNullOrEmpty(usuario)) cmd.Parameters.AddWithValue("usuario", $"%{usuario}%");
        if (!string.IsNullOrEmpty(accion))  cmd.Parameters.AddWithValue("accion",  accion);
        if (!string.IsNullOrEmpty(desde))   cmd.Parameters.AddWithValue("desde",   desde);
        if (!string.IsNullOrEmpty(hasta))   cmd.Parameters.AddWithValue("hasta",   hasta);
    }

    [HttpGet]
    [RequierePermiso("seguridad", "ver")]
    public async Task<IActionResult> Listar(
        [FromQuery] string? tipo    = null,
        [FromQuery] string? usuario = null,
        [FromQuery] string? accion  = null,
        [FromQuery] string? desde   = null,
        [FromQuery] string? hasta   = null,
        [FromQuery] int     pagina  = 1,
        [FromQuery] int     tamano  = 50,
        CancellationToken ct = default)
    {
        tamano = Math.Clamp(tamano, 1, 200);
        pagina = Math.Max(1, pagina);

        var whereClause = BuildWhere(tipo, usuario, accion, desde, hasta);

        await using var conn = AbrirConexion();
        await conn.OpenAsync(ct);

        await using var cmdCount = conn.CreateCommand();
        cmdCount.CommandText = $"SELECT COUNT(*) FROM audit_log {whereClause}";
        AddParams(cmdCount, tipo, usuario, accion, desde, hasta);
        var total = Convert.ToInt32(await cmdCount.ExecuteScalarAsync(ct));

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            SELECT id, entidad_tipo, entidad_id, entidad_nombre, accion, usuario_email, detalle, fecha
            FROM audit_log {whereClause}
            ORDER BY fecha DESC
            LIMIT @limit OFFSET @offset
            """;
        AddParams(cmd, tipo, usuario, accion, desde, hasta);
        cmd.Parameters.AddWithValue("limit",  tamano);
        cmd.Parameters.AddWithValue("offset", (pagina - 1) * tamano);

        var datos = new List<object>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            datos.Add(new {
                id            = reader[0].ToString(),
                entidadTipo   = reader.GetString(1),
                entidadId     = reader.IsDBNull(2) ? null : reader.GetString(2),
                entidadNombre = reader.IsDBNull(3) ? null : reader.GetString(3),
                accion        = reader.GetString(4),
                usuarioEmail  = reader.IsDBNull(5) ? null : reader.GetString(5),
                detalle       = reader.IsDBNull(6) ? null : reader.GetString(6),
                fecha         = ((DateTime)reader[7]).ToString("yyyy-MM-dd HH:mm"),
            });
        }

        return Ok(new { total, pagina, tamano, datos });
    }

    [HttpGet("tipos")]
    [RequierePermiso("seguridad", "ver")]
    public async Task<IActionResult> ListarTipos(CancellationToken ct)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT DISTINCT entidad_tipo FROM audit_log ORDER BY 1";
        var tipos = new List<string>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct)) tipos.Add(r.GetString(0));
        return Ok(tipos);
    }
}
