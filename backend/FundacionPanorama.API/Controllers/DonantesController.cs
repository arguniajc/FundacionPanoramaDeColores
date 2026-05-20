using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using FundacionPanorama.API.Data;

namespace FundacionPanorama.API.Controllers;

public record DonanteDto(
    Guid     Id,
    string   Nombre,
    string   Tipo,
    string?  Documento,
    string?  TipoDocumento,
    string?  Email,
    string?  Telefono,
    string?  Ciudad,
    string?  Pais,
    string?  Departamento,
    string?  Notas,
    bool     Activo,
    DateTime FechaCreacion,
    DateTime FechaModificacion,
    // stats enriquecidos
    int      TotalDonaciones,
    decimal  TotalDinero,
    int      TotalEspecie,
    DateTime? UltimaDonacion
);

public record CrearDonanteDto(
    [Required][StringLength(200)] string  Nombre,
    [StringLength(50)]            string  Tipo,
    [StringLength(30)]            string? Documento,
    [StringLength(30)]            string? TipoDocumento,
    [EmailAddress][StringLength(150)] string? Email,
    [Phone][StringLength(30)]     string? Telefono,
    [StringLength(100)]           string? Ciudad,
    [StringLength(100)]           string? Pais,
    [StringLength(100)]           string? Departamento,
    [StringLength(1000)]          string? Notas
);

[ApiController]
[Route("api/donantes")]
[Authorize]
public class DonantesController : ControllerBase
{
    private readonly AppDbContext _db;
    public DonantesController(AppDbContext db) => _db = db;

    private NpgsqlConnection AbrirConexion() => new(_db.Database.GetConnectionString());

    [HttpGet]
    public async Task<IActionResult> Listar(
        [FromQuery] string? buscar      = null,
        [FromQuery] bool    soloActivos = false,
        [FromQuery] int     pagina      = 1,
        [FromQuery] int     porPagina   = 500)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();

        porPagina = Math.Clamp(porPagina, 1, 500);
        pagina    = Math.Max(pagina, 1);

        var where = new List<string>();
        if (soloActivos) where.Add("d.activo = true");
        if (!string.IsNullOrWhiteSpace(buscar))
        {
            where.Add("(LOWER(d.nombre) LIKE @b OR LOWER(COALESCE(d.documento,'')) LIKE @b OR LOWER(COALESCE(d.email,'')) LIKE @b)");
            cmd.Parameters.AddWithValue("b", $"%{buscar.ToLower().Trim()}%");
        }

        var w = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";
        cmd.CommandText = $@"
            SELECT d.id, d.nombre, d.tipo, d.documento, d.tipo_documento, d.email, d.telefono,
                   d.ciudad, d.pais, d.departamento, d.notas,
                   d.activo, d.fecha_creacion, d.fecha_modificacion,
                   COUNT(dn.id)                                                    AS total_donaciones,
                   COALESCE(SUM(CASE WHEN dn.tipo='dinero'  THEN dn.monto  ELSE 0 END), 0) AS total_dinero,
                   COALESCE(SUM(CASE WHEN dn.tipo='especie' THEN 1         ELSE 0 END), 0) AS total_especie,
                   MAX(dn.fecha_donacion)                                          AS ultima_donacion
            FROM donantes d
            LEFT JOIN donaciones dn ON dn.donante_id = d.id AND dn.activo = true
            {w}
            GROUP BY d.id, d.nombre, d.tipo, d.documento, d.tipo_documento, d.email, d.telefono,
                     d.ciudad, d.pais, d.departamento, d.notas,
                     d.activo, d.fecha_creacion, d.fecha_modificacion
            ORDER BY d.nombre
            LIMIT @lim OFFSET @off";
        cmd.Parameters.AddWithValue("lim", porPagina);
        cmd.Parameters.AddWithValue("off", (pagina - 1) * porPagina);

        var list = new List<DonanteDto>();
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync()) list.Add(LeerDonante(r));
        return Ok(list);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> ObtenerPorId(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT d.id, d.nombre, d.tipo, d.documento, d.tipo_documento, d.email, d.telefono,
                   d.ciudad, d.pais, d.departamento, d.notas,
                   d.activo, d.fecha_creacion, d.fecha_modificacion,
                   COUNT(dn.id),
                   COALESCE(SUM(CASE WHEN dn.tipo='dinero'  THEN dn.monto  ELSE 0 END), 0),
                   COALESCE(SUM(CASE WHEN dn.tipo='especie' THEN 1         ELSE 0 END), 0),
                   MAX(dn.fecha_donacion)
            FROM donantes d
            LEFT JOIN donaciones dn ON dn.donante_id = d.id AND dn.activo = true
            WHERE d.id = @id
            GROUP BY d.id, d.nombre, d.tipo, d.documento, d.tipo_documento, d.email, d.telefono,
                     d.ciudad, d.pais, d.departamento, d.notas,
                     d.activo, d.fecha_creacion, d.fecha_modificacion";
        cmd.Parameters.AddWithValue("id", id);
        await using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return NotFound();
        return Ok(LeerDonante(r));
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearDonanteDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { mensaje = "El nombre es obligatorio." });

        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO donantes (nombre,tipo,documento,tipo_documento,email,telefono,ciudad,pais,departamento,notas)
            VALUES (@nom,@tipo,@doc,@tipdoc,@email,@tel,@ciu,@pais,@dep,@notas)
            RETURNING id,nombre,tipo,documento,tipo_documento,email,telefono,ciudad,pais,departamento,notas,
                      activo,fecha_creacion,fecha_modificacion,
                      0,0,0,NULL";
        cmd.Parameters.AddWithValue("nom",    dto.Nombre.Trim());
        cmd.Parameters.AddWithValue("tipo",   string.IsNullOrWhiteSpace(dto.Tipo) ? "persona" : dto.Tipo);
        cmd.Parameters.AddWithValue("doc",    (object?)dto.Documento?.Trim()      ?? DBNull.Value);
        cmd.Parameters.AddWithValue("tipdoc", (object?)dto.TipoDocumento?.Trim()  ?? DBNull.Value);
        cmd.Parameters.AddWithValue("email",  (object?)dto.Email?.Trim()          ?? DBNull.Value);
        cmd.Parameters.AddWithValue("tel",    (object?)dto.Telefono?.Trim()       ?? DBNull.Value);
        cmd.Parameters.AddWithValue("ciu",    (object?)dto.Ciudad?.Trim()         ?? DBNull.Value);
        cmd.Parameters.AddWithValue("pais",   (object?)dto.Pais?.Trim()           ?? DBNull.Value);
        cmd.Parameters.AddWithValue("dep",    (object?)dto.Departamento?.Trim()   ?? DBNull.Value);
        cmd.Parameters.AddWithValue("notas",  (object?)dto.Notas?.Trim()          ?? DBNull.Value);
        await using var r = await cmd.ExecuteReaderAsync();
        await r.ReadAsync();
        return Ok(LeerDonante(r));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] CrearDonanteDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { mensaje = "El nombre es obligatorio." });

        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            UPDATE donantes
            SET nombre=@nom, tipo=@tipo, documento=@doc, tipo_documento=@tipdoc,
                email=@email, telefono=@tel, ciudad=@ciu, pais=@pais, departamento=@dep,
                notas=@notas, fecha_modificacion=NOW()
            WHERE id=@id
            RETURNING id,nombre,tipo,documento,tipo_documento,email,telefono,ciudad,pais,departamento,notas,
                      activo,fecha_creacion,fecha_modificacion,
                      0,0,0,NULL";
        cmd.Parameters.AddWithValue("id",     id);
        cmd.Parameters.AddWithValue("nom",    dto.Nombre.Trim());
        cmd.Parameters.AddWithValue("tipo",   string.IsNullOrWhiteSpace(dto.Tipo) ? "persona" : dto.Tipo);
        cmd.Parameters.AddWithValue("doc",    (object?)dto.Documento?.Trim()      ?? DBNull.Value);
        cmd.Parameters.AddWithValue("tipdoc", (object?)dto.TipoDocumento?.Trim()  ?? DBNull.Value);
        cmd.Parameters.AddWithValue("email",  (object?)dto.Email?.Trim()          ?? DBNull.Value);
        cmd.Parameters.AddWithValue("tel",    (object?)dto.Telefono?.Trim()       ?? DBNull.Value);
        cmd.Parameters.AddWithValue("ciu",    (object?)dto.Ciudad?.Trim()         ?? DBNull.Value);
        cmd.Parameters.AddWithValue("pais",   (object?)dto.Pais?.Trim()           ?? DBNull.Value);
        cmd.Parameters.AddWithValue("dep",    (object?)dto.Departamento?.Trim()   ?? DBNull.Value);
        cmd.Parameters.AddWithValue("notas",  (object?)dto.Notas?.Trim()          ?? DBNull.Value);
        await using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return NotFound();
        return Ok(LeerDonante(r));
    }

    [HttpPatch("{id:guid}/toggle")]
    public async Task<IActionResult> Toggle(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"UPDATE donantes SET activo = NOT activo, fecha_modificacion=NOW()
            WHERE id=@id RETURNING activo";
        cmd.Parameters.AddWithValue("id", id);
        var val = await cmd.ExecuteScalarAsync();
        if (val is null) return NotFound();
        return Ok(new { activo = (bool)val });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        // Soft delete if has donations
        await using (var chk = conn.CreateCommand())
        {
            chk.CommandText = "SELECT COUNT(1) FROM donaciones WHERE donante_id=@id";
            chk.Parameters.AddWithValue("id", id);
            if (Convert.ToInt64(await chk.ExecuteScalarAsync()) > 0)
            {
                await using var upd = conn.CreateCommand();
                upd.CommandText = "UPDATE donantes SET activo=false, fecha_modificacion=NOW() WHERE id=@id";
                upd.Parameters.AddWithValue("id", id);
                await upd.ExecuteNonQueryAsync();
                return NoContent();
            }
        }
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM donantes WHERE id=@id";
        cmd.Parameters.AddWithValue("id", id);
        if (await cmd.ExecuteNonQueryAsync() == 0) return NotFound();
        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static DonanteDto LeerDonante(System.Data.Common.DbDataReader r) => new(
        r.GetGuid(0),                                           // Id
        r.GetString(1),                                         // Nombre
        r.GetString(2),                                         // Tipo
        r.IsDBNull(3)  ? null : r.GetString(3),                // Documento
        r.IsDBNull(4)  ? null : r.GetString(4),                // TipoDocumento
        r.IsDBNull(5)  ? null : r.GetString(5),                // Email
        r.IsDBNull(6)  ? null : r.GetString(6),                // Telefono
        r.IsDBNull(7)  ? null : r.GetString(7),                // Ciudad
        r.IsDBNull(8)  ? null : r.GetString(8),                // Pais
        r.IsDBNull(9)  ? null : r.GetString(9),                // Departamento
        r.IsDBNull(10) ? null : r.GetString(10),               // Notas
        r.GetBoolean(11),                                       // Activo
        r.GetDateTime(12),                                      // FechaCreacion
        r.GetDateTime(13),                                      // FechaModificacion
        r.IsDBNull(14) ? 0    : Convert.ToInt32(r.GetInt64(14)),
        r.IsDBNull(15) ? 0m   : Convert.ToDecimal(r.GetValue(15)),
        r.IsDBNull(16) ? 0    : Convert.ToInt32(r.GetInt64(16)),
        r.IsDBNull(17) ? null : (DateTime?)r.GetDateTime(17)
    );
}
