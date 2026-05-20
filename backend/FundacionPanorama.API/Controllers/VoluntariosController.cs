using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using FundacionPanorama.API.Data;

namespace FundacionPanorama.API.Controllers;

public record VoluntarioDto(
    Guid      Id,
    string    Nombre,
    string?   TipoDocumento,
    string?   Documento,
    string?   Email,
    string?   Telefono,
    string?   Ciudad,
    string?   Pais,
    string?   Departamento,
    DateTime? FechaNacimiento,
    DateTime? FechaInicio,
    string?   Profesion,
    string?   Notas,
    bool      Activo,
    DateTime  FechaCreacion,
    DateTime  FechaModificacion,
    int       TotalProgramas,
    decimal   HorasSemanales
);

public record CrearVoluntarioDto(
    [Required][StringLength(200)]     string    Nombre,
    [StringLength(50)]                string?   TipoDocumento,
    [StringLength(30)]                string?   Documento,
    [EmailAddress][StringLength(150)] string?   Email,
    [Phone][StringLength(30)]         string?   Telefono,
    [StringLength(100)]               string?   Ciudad,
    [StringLength(100)]               string?   Pais,
    [StringLength(100)]               string?   Departamento,
    DateTime?                                   FechaNacimiento,
    DateTime?                                   FechaInicio,
    [StringLength(150)]               string?   Profesion,
    [StringLength(1000)]              string?   Notas
);

public record AsignacionVolDto(
    Guid      Id,
    Guid      VoluntarioId,
    Guid?     ProgramaId,
    string    NombrePrograma,
    Guid?     SedeId,
    string    NombreSede,
    decimal   HorasSemanales,
    DateTime? FechaInicio,
    bool      Activo
);

public record CrearAsignacionVolDto(
    Guid?     ProgramaId,
    Guid?     SedeId,
    decimal   HorasSemanales,
    DateTime? FechaInicio
);

public record EditarAsignacionVolDto(
    Guid?     ProgramaId,
    Guid?     SedeId,
    decimal   HorasSemanales,
    DateTime? FechaInicio
);

public record StatsVoluntariosDto(
    int     TotalVoluntarios,
    int     NuevosEsteMes,
    int     ProgramasCubiertos,
    decimal TotalHorasSemanales
);

[ApiController]
[Route("api/voluntarios")]
[Authorize]
public class VoluntariosController : ControllerBase
{
    private readonly AppDbContext _db;
    public VoluntariosController(AppDbContext db) => _db = db;

    private NpgsqlConnection AbrirConexion() => new(_db.Database.GetConnectionString());

    [HttpGet]
    public async Task<IActionResult> Listar(
        [FromQuery] string? buscar      = null,
        [FromQuery] bool    soloActivos = true,
        [FromQuery] int     pagina      = 1,
        [FromQuery] int     porPagina   = 500)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();

        porPagina = Math.Clamp(porPagina, 1, 500);
        pagina    = Math.Max(pagina, 1);

        var where = new List<string>();
        if (soloActivos) where.Add("v.activo = true");
        if (!string.IsNullOrWhiteSpace(buscar))
        {
            where.Add("(LOWER(v.nombre) LIKE @b OR LOWER(COALESCE(v.documento,'')) LIKE @b OR LOWER(COALESCE(v.email,'')) LIKE @b OR LOWER(COALESCE(v.profesion,'')) LIKE @b)");
            cmd.Parameters.AddWithValue("b", $"%{buscar.ToLower().Trim()}%");
        }

        var w = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";
        cmd.CommandText = $@"
            SELECT v.id, v.nombre, v.tipo_documento, v.documento, v.email, v.telefono, v.ciudad,
                   v.pais, v.departamento,
                   v.fecha_nacimiento, v.fecha_inicio, v.profesion, v.notas, v.activo,
                   v.fecha_creacion, v.fecha_modificacion,
                   COUNT(DISTINCT vp.id) AS total_programas,
                   COALESCE(SUM(vp.horas_semanales), 0) AS horas_semanales
            FROM voluntarios v
            LEFT JOIN voluntario_programas vp ON vp.voluntario_id = v.id AND vp.activo = true
            {w}
            GROUP BY v.id, v.nombre, v.tipo_documento, v.documento, v.email, v.telefono, v.ciudad,
                     v.pais, v.departamento,
                     v.fecha_nacimiento, v.fecha_inicio, v.profesion, v.notas, v.activo,
                     v.fecha_creacion, v.fecha_modificacion
            ORDER BY v.nombre
            LIMIT @lim OFFSET @off";
        cmd.Parameters.AddWithValue("lim", porPagina);
        cmd.Parameters.AddWithValue("off", (pagina - 1) * porPagina);

        var list = new List<VoluntarioDto>();
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync()) list.Add(LeerVoluntario(r));
        return Ok(list);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> Stats()
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT
                COUNT(*) FILTER (WHERE activo = true),
                COUNT(*) FILTER (WHERE activo = true AND fecha_creacion >= date_trunc('month', NOW())),
                (SELECT COUNT(DISTINCT programa_id) FROM voluntario_programas WHERE activo = true AND programa_id IS NOT NULL),
                (SELECT COALESCE(SUM(horas_semanales), 0) FROM voluntario_programas WHERE activo = true)
            FROM voluntarios";
        await using var r = await cmd.ExecuteReaderAsync();
        await r.ReadAsync();
        return Ok(new StatsVoluntariosDto(
            Convert.ToInt32(r.GetValue(0)),
            Convert.ToInt32(r.GetValue(1)),
            Convert.ToInt32(r.GetValue(2)),
            Convert.ToDecimal(r.GetValue(3))
        ));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> ObtenerPorId(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT v.id, v.nombre, v.tipo_documento, v.documento, v.email, v.telefono, v.ciudad,
                   v.fecha_nacimiento, v.fecha_inicio, v.profesion, v.notas, v.activo,
                   v.fecha_creacion, v.fecha_modificacion,
                   COUNT(DISTINCT vp.id) AS total_programas,
                   COALESCE(SUM(vp.horas_semanales), 0) AS horas_semanales
            FROM voluntarios v
            LEFT JOIN voluntario_programas vp ON vp.voluntario_id = v.id AND vp.activo = true
            WHERE v.id = @id
            GROUP BY v.id, v.nombre, v.tipo_documento, v.documento, v.email, v.telefono, v.ciudad,
                     v.fecha_nacimiento, v.fecha_inicio, v.profesion, v.notas, v.activo,
                     v.fecha_creacion, v.fecha_modificacion";
        cmd.Parameters.AddWithValue("id", id);
        await using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return NotFound();
        return Ok(LeerVoluntario(r));
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearVoluntarioDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { mensaje = "El nombre es obligatorio." });

        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO voluntarios
                (nombre,tipo_documento,documento,email,telefono,ciudad,pais,departamento,fecha_nacimiento,fecha_inicio,profesion,notas)
            VALUES (@nom,@tdoc,@doc,@email,@tel,@ciu,@pais,@dep,@fnac,@fi,@prof,@notas)
            RETURNING id,nombre,tipo_documento,documento,email,telefono,ciudad,pais,departamento,
                      fecha_nacimiento,fecha_inicio,profesion,notas,activo,
                      fecha_creacion,fecha_modificacion,0,0";
        AgregarParamsVoluntario(cmd, dto);
        await using var r = await cmd.ExecuteReaderAsync();
        await r.ReadAsync();
        return Ok(LeerVoluntario(r));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] CrearVoluntarioDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { mensaje = "El nombre es obligatorio." });

        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            UPDATE voluntarios
            SET nombre=@nom, tipo_documento=@tdoc, documento=@doc, email=@email,
                telefono=@tel, ciudad=@ciu, pais=@pais, departamento=@dep,
                fecha_nacimiento=@fnac, fecha_inicio=@fi,
                profesion=@prof, notas=@notas, fecha_modificacion=NOW()
            WHERE id=@id
            RETURNING id,nombre,tipo_documento,documento,email,telefono,ciudad,pais,departamento,
                      fecha_nacimiento,fecha_inicio,profesion,notas,activo,
                      fecha_creacion,fecha_modificacion,0,0";
        cmd.Parameters.AddWithValue("id", id);
        AgregarParamsVoluntario(cmd, dto);
        await using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return NotFound();
        return Ok(LeerVoluntario(r));
    }

    [HttpPatch("{id:guid}/toggle")]
    public async Task<IActionResult> Toggle(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "UPDATE voluntarios SET activo=NOT activo, fecha_modificacion=NOW() WHERE id=@id RETURNING activo";
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
        await using var chk = conn.CreateCommand();
        chk.CommandText = "SELECT COUNT(1) FROM voluntario_programas WHERE voluntario_id=@id";
        chk.Parameters.AddWithValue("id", id);
        if (Convert.ToInt64(await chk.ExecuteScalarAsync()) > 0)
        {
            // Soft delete: desactivar voluntario Y sus asignaciones
            await using var upd1 = conn.CreateCommand();
            upd1.CommandText = "UPDATE voluntarios SET activo=false, fecha_modificacion=NOW() WHERE id=@id";
            upd1.Parameters.AddWithValue("id", id);
            await upd1.ExecuteNonQueryAsync();

            await using var upd2 = conn.CreateCommand();
            upd2.CommandText = "UPDATE voluntario_programas SET activo=false WHERE voluntario_id=@id";
            upd2.Parameters.AddWithValue("id", id);
            await upd2.ExecuteNonQueryAsync();

            return NoContent();
        }
        await using var del = conn.CreateCommand();
        del.CommandText = "DELETE FROM voluntarios WHERE id=@id";
        del.Parameters.AddWithValue("id", id);
        if (await del.ExecuteNonQueryAsync() == 0) return NotFound();
        return NoContent();
    }

    // ── Asignaciones a programas ──────────────────────────────────────────────

    [HttpGet("{id:guid}/asignaciones")]
    public async Task<IActionResult> ListarAsignaciones(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT vp.id, vp.voluntario_id,
                   vp.programa_id, COALESCE(p.nombre,'') AS nombre_programa,
                   vp.sede_id,    COALESCE(s.nombre,'') AS nombre_sede,
                   vp.horas_semanales, vp.fecha_inicio, vp.activo
            FROM voluntario_programas vp
            LEFT JOIN programas p ON p.id = vp.programa_id
            LEFT JOIN sedes     s ON s.id = vp.sede_id
            WHERE vp.voluntario_id = @id
            ORDER BY vp.fecha_creacion DESC";
        cmd.Parameters.AddWithValue("id", id);
        var list = new List<AsignacionVolDto>();
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync()) list.Add(LeerAsignacion(r));
        return Ok(list);
    }

    [HttpPost("{id:guid}/asignaciones")]
    public async Task<IActionResult> AgregarAsignacion(Guid id, [FromBody] CrearAsignacionVolDto dto)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        Guid newId;
        await using (var ins = conn.CreateCommand())
        {
            ins.CommandText = @"
                INSERT INTO voluntario_programas (voluntario_id,programa_id,sede_id,horas_semanales,fecha_inicio)
                VALUES (@vid,@pid,@sid,@hs,@fi) RETURNING id";
            ins.Parameters.AddWithValue("vid", id);
            ins.Parameters.AddWithValue("pid", (object?)dto.ProgramaId   ?? DBNull.Value);
            ins.Parameters.AddWithValue("sid", (object?)dto.SedeId       ?? DBNull.Value);
            ins.Parameters.AddWithValue("hs",  dto.HorasSemanales);
            ins.Parameters.AddWithValue("fi",  (object?)dto.FechaInicio?.Date ?? DBNull.Value);
            newId = (Guid)(await ins.ExecuteScalarAsync())!;
        }
        await using var sel = conn.CreateCommand();
        sel.CommandText = @"
            SELECT vp.id, vp.voluntario_id,
                   vp.programa_id, COALESCE(p.nombre,'') AS nombre_programa,
                   vp.sede_id,    COALESCE(s.nombre,'') AS nombre_sede,
                   vp.horas_semanales, vp.fecha_inicio, vp.activo
            FROM voluntario_programas vp
            LEFT JOIN programas p ON p.id = vp.programa_id
            LEFT JOIN sedes     s ON s.id = vp.sede_id
            WHERE vp.id = @id";
        sel.Parameters.AddWithValue("id", newId);
        await using var r = await sel.ExecuteReaderAsync();
        await r.ReadAsync();
        return Ok(LeerAsignacion(r));
    }

    [HttpPut("asignaciones/{asigId:guid}")]
    public async Task<IActionResult> EditarAsignacion(Guid asigId, [FromBody] EditarAsignacionVolDto dto)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var upd = conn.CreateCommand();
        upd.CommandText = @"
            UPDATE voluntario_programas
            SET programa_id=@pid, sede_id=@sid, horas_semanales=@hs, fecha_inicio=@fi
            WHERE id=@id";
        upd.Parameters.AddWithValue("id",  asigId);
        upd.Parameters.AddWithValue("pid", (object?)dto.ProgramaId        ?? DBNull.Value);
        upd.Parameters.AddWithValue("sid", (object?)dto.SedeId            ?? DBNull.Value);
        upd.Parameters.AddWithValue("hs",  dto.HorasSemanales);
        upd.Parameters.AddWithValue("fi",  (object?)dto.FechaInicio?.Date ?? DBNull.Value);
        if (await upd.ExecuteNonQueryAsync() == 0) return NotFound();

        await using var sel = conn.CreateCommand();
        sel.CommandText = @"
            SELECT vp.id, vp.voluntario_id,
                   vp.programa_id, COALESCE(p.nombre,'') AS nombre_programa,
                   vp.sede_id,    COALESCE(s.nombre,'') AS nombre_sede,
                   vp.horas_semanales, vp.fecha_inicio, vp.activo
            FROM voluntario_programas vp
            LEFT JOIN programas p ON p.id = vp.programa_id
            LEFT JOIN sedes     s ON s.id = vp.sede_id
            WHERE vp.id = @id";
        sel.Parameters.AddWithValue("id", asigId);
        await using var r = await sel.ExecuteReaderAsync();
        await r.ReadAsync();
        return Ok(LeerAsignacion(r));
    }

    [HttpDelete("asignaciones/{asigId:guid}")]
    public async Task<IActionResult> EliminarAsignacion(Guid asigId)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM voluntario_programas WHERE id=@id";
        cmd.Parameters.AddWithValue("id", asigId);
        if (await cmd.ExecuteNonQueryAsync() == 0) return NotFound();
        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static void AgregarParamsVoluntario(NpgsqlCommand cmd, CrearVoluntarioDto dto)
    {
        cmd.Parameters.AddWithValue("nom",   dto.Nombre.Trim());
        cmd.Parameters.AddWithValue("tdoc",  (object?)dto.TipoDocumento               ?? DBNull.Value);
        cmd.Parameters.AddWithValue("doc",   (object?)dto.Documento?.Trim()            ?? DBNull.Value);
        cmd.Parameters.AddWithValue("email", (object?)dto.Email?.Trim()                ?? DBNull.Value);
        cmd.Parameters.AddWithValue("tel",   (object?)dto.Telefono?.Trim()             ?? DBNull.Value);
        cmd.Parameters.AddWithValue("ciu",   (object?)dto.Ciudad?.Trim()               ?? DBNull.Value);
        cmd.Parameters.AddWithValue("pais",  (object?)dto.Pais?.Trim()                 ?? DBNull.Value);
        cmd.Parameters.AddWithValue("dep",   (object?)dto.Departamento?.Trim()         ?? DBNull.Value);
        cmd.Parameters.AddWithValue("fnac",  (object?)dto.FechaNacimiento?.Date        ?? DBNull.Value);
        cmd.Parameters.AddWithValue("fi",    (object?)dto.FechaInicio?.Date            ?? DBNull.Value);
        cmd.Parameters.AddWithValue("prof",  (object?)dto.Profesion?.Trim()            ?? DBNull.Value);
        cmd.Parameters.AddWithValue("notas", (object?)dto.Notas?.Trim()               ?? DBNull.Value);
    }

    private static VoluntarioDto LeerVoluntario(System.Data.Common.DbDataReader r) => new(
        r.GetGuid(0),                                           // Id
        r.GetString(1),                                         // Nombre
        r.IsDBNull(2)  ? null : r.GetString(2),                // TipoDocumento
        r.IsDBNull(3)  ? null : r.GetString(3),                // Documento
        r.IsDBNull(4)  ? null : r.GetString(4),                // Email
        r.IsDBNull(5)  ? null : r.GetString(5),                // Telefono
        r.IsDBNull(6)  ? null : r.GetString(6),                // Ciudad
        r.IsDBNull(7)  ? null : r.GetString(7),                // Pais
        r.IsDBNull(8)  ? null : r.GetString(8),                // Departamento
        r.IsDBNull(9)  ? null : (DateTime?)r.GetDateTime(9),   // FechaNacimiento
        r.IsDBNull(10) ? null : (DateTime?)r.GetDateTime(10),  // FechaInicio
        r.IsDBNull(11) ? null : r.GetString(11),               // Profesion
        r.IsDBNull(12) ? null : r.GetString(12),               // Notas
        r.GetBoolean(13),                                       // Activo
        r.GetDateTime(14),                                      // FechaCreacion
        r.GetDateTime(15),                                      // FechaModificacion
        r.IsDBNull(16) ? 0    : Convert.ToInt32(r.GetValue(16)),
        r.IsDBNull(17) ? 0m   : Convert.ToDecimal(r.GetValue(17))
    );

    private static AsignacionVolDto LeerAsignacion(System.Data.Common.DbDataReader r) => new(
        r.GetGuid(0),
        r.GetGuid(1),
        r.IsDBNull(2) ? null : r.GetGuid(2),
        r.GetString(3),
        r.IsDBNull(4) ? null : r.GetGuid(4),
        r.GetString(5),
        Convert.ToDecimal(r.GetValue(6)),
        r.IsDBNull(7) ? null : (DateTime?)r.GetDateTime(7),
        r.GetBoolean(8)
    );
}
