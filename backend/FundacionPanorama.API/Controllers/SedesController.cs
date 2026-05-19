// CRUD de sedes, programas y campos dinámicos. Requiere JWT.
using System.Text.Json;
using FundacionPanorama.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using NpgsqlTypes;

namespace FundacionPanorama.API.Controllers;

public record SedeDto(Guid Id, string Nombre, string? Direccion, string? Ciudad, string? Telefono, bool Activo, DateTime FechaCreacion, DateTime FechaModificacion, List<ProgramaDto> Programas);
public record ProgramaDto(Guid Id, Guid SedeId, string NombreSede, string Nombre, string? Descripcion, int? CupoMaximo, bool Activo, bool TieneTercero, string? NombreTercero, DateTime FechaCreacion, DateTime FechaModificacion, bool RepAutorizado, DateTime? RepAutorizacionFecha, string? RepFirma, string? RepNombre, string? RepDocumento, string? RepCargo);
public record CrearSedeDto(string Nombre, string? Direccion, string? Ciudad, string? Telefono);
public record CrearProgramaDto(Guid SedeId, string Nombre, string? Descripcion, int? CupoMaximo, bool TieneTercero = false, string? NombreTercero = null);
public record CampoDto(Guid Id, Guid ProgramaId, string Etiqueta, string Tipo, bool Obligatorio, string[]? Opciones, int Orden, bool Activo, string? Seccion, int Columnas, DateTime FechaCreacion, DateTime FechaModificacion);
public record CrearCampoDto(string Etiqueta, string Tipo, bool Obligatorio, string[]? Opciones, int Orden, string? Seccion, int? Columnas);

[ApiController]
[Route("api/sedes")]
[Authorize]
public class SedesController : ControllerBase
{
    private readonly AppDbContext _db;
    public SedesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] bool soloActivas = false)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();

        var dtos = new List<SedeDto>();
        var sedeIds = new List<Guid>();

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT id, nombre, direccion, ciudad, telefono, activo, fecha_creacion, fecha_modificacion FROM sedes" +
                              (soloActivas ? " WHERE activo = true" : "") +
                              " ORDER BY nombre";
            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                var sid = r.GetGuid(0);
                sedeIds.Add(sid);
                dtos.Add(new SedeDto(
                    sid,
                    r.GetString(1),
                    r.IsDBNull(2) ? null : r.GetString(2),
                    r.IsDBNull(3) ? null : r.GetString(3),
                    r.IsDBNull(4) ? null : r.GetString(4),
                    r.GetBoolean(5), r.GetDateTime(6), r.GetDateTime(7),
                    new List<ProgramaDto>()
                ));
            }
        }

        if (sedeIds.Count > 0)
        {
            var indexBySede = dtos.ToDictionary(d => d.Id);
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = SqlSelectPrograma + " WHERE p.sede_id = ANY(@ids) ORDER BY p.nombre";
            cmd.Parameters.Add(new NpgsqlParameter("ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = sedeIds.ToArray() });
            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                var p = LeerPrograma(r);
                if (indexBySede.TryGetValue(p.SedeId, out var sede)) sede.Programas.Add(p);
            }
        }

        return Ok(dtos);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> ObtenerPorId(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        var sede = await CargarSedeAsync(conn, id);
        if (sede is null) return NotFound();
        return Ok(sede);
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearSedeDto dto)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO sedes (nombre, direccion, ciudad, telefono, activo)
            VALUES (@nombre, @dir, @ciudad, @tel, true)
            RETURNING id";
        cmd.Parameters.AddWithValue("nombre", dto.Nombre.Trim());
        cmd.Parameters.AddWithValue("dir",    (object?)dto.Direccion?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("ciudad", (object?)dto.Ciudad?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("tel",    (object?)dto.Telefono?.Trim() ?? DBNull.Value);
        var newId = (Guid)(await cmd.ExecuteScalarAsync())!;
        var sede = await CargarSedeAsync(conn, newId);
        return CreatedAtAction(nameof(ObtenerPorId), new { id = newId }, sede);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] CrearSedeDto dto)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                UPDATE sedes SET nombre=@nombre, direccion=@dir, ciudad=@ciudad, telefono=@tel, fecha_modificacion=NOW()
                WHERE id = @id";
            cmd.Parameters.AddWithValue("id",     id);
            cmd.Parameters.AddWithValue("nombre", dto.Nombre.Trim());
            cmd.Parameters.AddWithValue("dir",    (object?)dto.Direccion?.Trim() ?? DBNull.Value);
            cmd.Parameters.AddWithValue("ciudad", (object?)dto.Ciudad?.Trim() ?? DBNull.Value);
            cmd.Parameters.AddWithValue("tel",    (object?)dto.Telefono?.Trim() ?? DBNull.Value);
            var rows = await cmd.ExecuteNonQueryAsync();
            if (rows == 0) return NotFound();
        }
        return Ok(await CargarSedeAsync(conn, id));
    }

    [HttpPatch("{id:guid}/toggle")]
    public async Task<IActionResult> Toggle(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "UPDATE sedes SET activo = NOT activo, fecha_modificacion = NOW() WHERE id = @id";
            cmd.Parameters.AddWithValue("id", id);
            var rows = await cmd.ExecuteNonQueryAsync();
            if (rows == 0) return NotFound();
        }
        return Ok(await CargarSedeAsync(conn, id));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM sedes WHERE id = @id";
        cmd.Parameters.AddWithValue("id", id);
        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound();
        return NoContent();
    }

    // ── Programas ─────────────────────────────────────────────────────────────

    [HttpGet("programas/{id:guid}")]
    public async Task<IActionResult> ObtenerPrograma(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = SqlSelectPrograma + " WHERE p.id = @id";
        cmd.Parameters.AddWithValue("id", id);
        await using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return NotFound();
        return Ok(LeerPrograma(r));
    }

    [HttpGet("{sedeId:guid}/programas")]
    public async Task<IActionResult> ListarProgramas(Guid sedeId)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = SqlSelectPrograma + " WHERE p.sede_id = @sid ORDER BY p.nombre";
        cmd.Parameters.AddWithValue("sid", sedeId);
        var programas = new List<ProgramaDto>();
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync()) programas.Add(LeerPrograma(r));
        return Ok(programas);
    }

    [HttpPost("programas")]
    public async Task<IActionResult> CrearPrograma([FromBody] CrearProgramaDto dto)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();

        await using (var cmdCheck = conn.CreateCommand())
        {
            cmdCheck.CommandText = "SELECT EXISTS(SELECT 1 FROM sedes WHERE id = @id)";
            cmdCheck.Parameters.AddWithValue("id", dto.SedeId);
            var existe = (bool)(await cmdCheck.ExecuteScalarAsync())!;
            if (!existe) return BadRequest(new { mensaje = "Sede no encontrada." });
        }

        Guid newId;
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                INSERT INTO programas (sede_id, nombre, descripcion, cupo_maximo, activo, tiene_tercero, nombre_tercero)
                VALUES (@sedeId, @nombre, @desc, @cupo, true, @tieneTercero, @nombreTercero)
                RETURNING id";
            cmd.Parameters.AddWithValue("sedeId",       dto.SedeId);
            cmd.Parameters.AddWithValue("nombre",        dto.Nombre.Trim());
            cmd.Parameters.AddWithValue("desc",          (object?)dto.Descripcion?.Trim() ?? DBNull.Value);
            cmd.Parameters.AddWithValue("cupo",          (object?)dto.CupoMaximo ?? DBNull.Value);
            cmd.Parameters.AddWithValue("tieneTercero",  dto.TieneTercero);
            cmd.Parameters.AddWithValue("nombreTercero", (object?)dto.NombreTercero?.Trim() ?? DBNull.Value);
            newId = (Guid)(await cmd.ExecuteScalarAsync())!;
        }

        await using var cmdGet = conn.CreateCommand();
        cmdGet.CommandText = SqlSelectPrograma + " WHERE p.id = @id";
        cmdGet.Parameters.AddWithValue("id", newId);
        await using var r = await cmdGet.ExecuteReaderAsync();
        await r.ReadAsync();
        return Ok(LeerPrograma(r));
    }

    [HttpPut("programas/{id:guid}")]
    public async Task<IActionResult> ActualizarPrograma(Guid id, [FromBody] CrearProgramaDto dto)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                UPDATE programas
                SET sede_id=@sedeId, nombre=@nombre, descripcion=@desc, cupo_maximo=@cupo,
                    tiene_tercero=@tieneTercero, nombre_tercero=@nombreTercero, fecha_modificacion=NOW()
                WHERE id = @id";
            cmd.Parameters.AddWithValue("id",           id);
            cmd.Parameters.AddWithValue("sedeId",       dto.SedeId);
            cmd.Parameters.AddWithValue("nombre",        dto.Nombre.Trim());
            cmd.Parameters.AddWithValue("desc",          (object?)dto.Descripcion?.Trim() ?? DBNull.Value);
            cmd.Parameters.AddWithValue("cupo",          (object?)dto.CupoMaximo ?? DBNull.Value);
            cmd.Parameters.AddWithValue("tieneTercero",  dto.TieneTercero);
            cmd.Parameters.AddWithValue("nombreTercero", (object?)dto.NombreTercero?.Trim() ?? DBNull.Value);
            var rows = await cmd.ExecuteNonQueryAsync();
            if (rows == 0) return NotFound();
        }

        await using var cmdGet = conn.CreateCommand();
        cmdGet.CommandText = SqlSelectPrograma + " WHERE p.id = @id";
        cmdGet.Parameters.AddWithValue("id", id);
        await using var r = await cmdGet.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return NotFound();
        return Ok(LeerPrograma(r));
    }

    [HttpPatch("programas/{id:guid}/toggle")]
    public async Task<IActionResult> TogglePrograma(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "UPDATE programas SET activo = NOT activo, fecha_modificacion = NOW() WHERE id = @id";
            cmd.Parameters.AddWithValue("id", id);
            var rows = await cmd.ExecuteNonQueryAsync();
            if (rows == 0) return NotFound();
        }

        await using var cmdGet = conn.CreateCommand();
        cmdGet.CommandText = SqlSelectPrograma + " WHERE p.id = @id";
        cmdGet.Parameters.AddWithValue("id", id);
        await using var r = await cmdGet.ExecuteReaderAsync();
        await r.ReadAsync();
        return Ok(LeerPrograma(r));
    }

    [HttpDelete("programas/{id:guid}")]
    public async Task<IActionResult> EliminarPrograma(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM programas WHERE id = @id";
        cmd.Parameters.AddWithValue("id", id);
        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound();
        return NoContent();
    }

    [HttpPut("programas/{id:guid}/autorizar-rep")]
    public async Task<IActionResult> AutorizarRepLegal(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();

        string? repNombre = null, repDocumento = null, repCargo = null, repFirma = null;
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT nombre_rep_legal, documento_rep, cargo_rep, firma_rep FROM configuracion LIMIT 1";
            await using var r = await cmd.ExecuteReaderAsync();
            if (!await r.ReadAsync())
                return BadRequest(new { mensaje = "No hay configuración de representante legal guardada. Ve a Configuración y completa los datos." });
            repNombre    = r.IsDBNull(0) ? null : r.GetString(0);
            repDocumento = r.IsDBNull(1) ? null : r.GetString(1);
            repCargo     = r.IsDBNull(2) ? null : r.GetString(2);
            repFirma     = r.IsDBNull(3) ? null : r.GetString(3);
        }

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                UPDATE programas SET
                    rep_autorizado = true,
                    rep_autorizacion_fecha = NOW(),
                    rep_nombre = @repNombre,
                    rep_documento = @repDocumento,
                    rep_cargo = @repCargo,
                    rep_firma = @repFirma,
                    fecha_modificacion = NOW()
                WHERE id = @id";
            cmd.Parameters.AddWithValue("id",          id);
            cmd.Parameters.AddWithValue("repNombre",    (object?)repNombre    ?? DBNull.Value);
            cmd.Parameters.AddWithValue("repDocumento", (object?)repDocumento ?? DBNull.Value);
            cmd.Parameters.AddWithValue("repCargo",     (object?)repCargo     ?? DBNull.Value);
            cmd.Parameters.AddWithValue("repFirma",     (object?)repFirma     ?? DBNull.Value);
            var rows = await cmd.ExecuteNonQueryAsync();
            if (rows == 0) return NotFound();
        }

        await using var cmdGet = conn.CreateCommand();
        cmdGet.CommandText = SqlSelectPrograma + " WHERE p.id = @id";
        cmdGet.Parameters.AddWithValue("id", id);
        await using var r2 = await cmdGet.ExecuteReaderAsync();
        if (!await r2.ReadAsync()) return NotFound();
        return Ok(LeerPrograma(r2));
    }

    [HttpDelete("programas/{id:guid}/autorizar-rep")]
    public async Task<IActionResult> RevocarRepLegal(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                UPDATE programas SET
                    rep_autorizado = false,
                    rep_autorizacion_fecha = NULL,
                    rep_nombre = NULL,
                    rep_documento = NULL,
                    rep_cargo = NULL,
                    rep_firma = NULL,
                    fecha_modificacion = NOW()
                WHERE id = @id";
            cmd.Parameters.AddWithValue("id", id);
            var rows = await cmd.ExecuteNonQueryAsync();
            if (rows == 0) return NotFound();
        }

        await using var cmdGet = conn.CreateCommand();
        cmdGet.CommandText = SqlSelectPrograma + " WHERE p.id = @id";
        cmdGet.Parameters.AddWithValue("id", id);
        await using var r = await cmdGet.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return NotFound();
        return Ok(LeerPrograma(r));
    }

    // ── Campos dinámicos — Npgsql directo (sin EF Core DbSet) ─────────────────

    [HttpGet("programas/{programaId:guid}/campos")]
    public async Task<IActionResult> ListarCampos(Guid programaId)
    {
        var campos = new List<CampoDto>();
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT id, programa_id, etiqueta, tipo, obligatorio, opciones_json, orden, activo, seccion, columnas, fecha_creacion, fecha_modificacion FROM programas_campos WHERE programa_id = @pid AND activo = true ORDER BY orden";
        cmd.Parameters.AddWithValue("pid", programaId);
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync()) campos.Add(LeerCampo(r));
        return Ok(campos);
    }

    [HttpPost("programas/{programaId:guid}/campos")]
    public async Task<IActionResult> CrearCampo(Guid programaId, [FromBody] CrearCampoDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Seccion))
            return BadRequest(new { mensaje = "La sección del campo es obligatoria." });

        await using var conn = AbrirConexion();
        await conn.OpenAsync();

        await using (var cmdCheck = conn.CreateCommand())
        {
            cmdCheck.CommandText = "SELECT EXISTS(SELECT 1 FROM programas WHERE id = @id)";
            cmdCheck.Parameters.AddWithValue("id", programaId);
            var existe = (bool)(await cmdCheck.ExecuteScalarAsync())!;
            if (!existe) return NotFound(new { mensaje = "Programa no encontrado." });
        }

        var opJson = dto.Opciones is { Length: > 0 } ? JsonSerializer.Serialize(dto.Opciones) : null;
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"INSERT INTO programas_campos (programa_id, etiqueta, tipo, obligatorio, opciones_json, orden, activo, seccion, columnas)
                            VALUES (@pid, @etiqueta, @tipo, @oblig, @opciones, @orden, true, @seccion, @columnas)
                            RETURNING id, programa_id, etiqueta, tipo, obligatorio, opciones_json, orden, activo, seccion, columnas, fecha_creacion, fecha_modificacion";
        cmd.Parameters.AddWithValue("pid",      programaId);
        cmd.Parameters.AddWithValue("etiqueta", dto.Etiqueta.Trim());
        cmd.Parameters.AddWithValue("tipo",     dto.Tipo);
        cmd.Parameters.AddWithValue("oblig",    dto.Obligatorio);
        cmd.Parameters.AddWithValue("opciones", (object?)opJson ?? DBNull.Value);
        cmd.Parameters.AddWithValue("orden",    dto.Orden);
        cmd.Parameters.AddWithValue("seccion",  string.IsNullOrWhiteSpace(dto.Seccion) ? DBNull.Value : (object)dto.Seccion.Trim());
        cmd.Parameters.AddWithValue("columnas", dto.Columnas ?? 6);
        await using var r = await cmd.ExecuteReaderAsync();
        await r.ReadAsync();
        return Ok(LeerCampo(r));
    }

    [HttpPut("programas/{programaId:guid}/campos/{campoId:guid}")]
    public async Task<IActionResult> ActualizarCampo(Guid programaId, Guid campoId, [FromBody] CrearCampoDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Seccion))
            return BadRequest(new { mensaje = "La sección del campo es obligatoria." });
        var opJson = dto.Opciones is { Length: > 0 } ? JsonSerializer.Serialize(dto.Opciones) : null;
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"UPDATE programas_campos SET etiqueta=@etiqueta, tipo=@tipo, obligatorio=@oblig, opciones_json=@opciones, orden=@orden, seccion=@seccion, columnas=@columnas, fecha_modificacion=NOW()
                            WHERE id=@id AND programa_id=@pid
                            RETURNING id, programa_id, etiqueta, tipo, obligatorio, opciones_json, orden, activo, seccion, columnas, fecha_creacion, fecha_modificacion";
        cmd.Parameters.AddWithValue("id",       campoId);
        cmd.Parameters.AddWithValue("pid",      programaId);
        cmd.Parameters.AddWithValue("etiqueta", dto.Etiqueta.Trim());
        cmd.Parameters.AddWithValue("tipo",     dto.Tipo);
        cmd.Parameters.AddWithValue("oblig",    dto.Obligatorio);
        cmd.Parameters.AddWithValue("opciones", (object?)opJson ?? DBNull.Value);
        cmd.Parameters.AddWithValue("orden",    dto.Orden);
        cmd.Parameters.AddWithValue("seccion",  string.IsNullOrWhiteSpace(dto.Seccion) ? DBNull.Value : (object)dto.Seccion.Trim());
        cmd.Parameters.AddWithValue("columnas", dto.Columnas ?? 6);
        await using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return NotFound();
        return Ok(LeerCampo(r));
    }

    [HttpDelete("programas/{programaId:guid}/campos/{campoId:guid}")]
    public async Task<IActionResult> EliminarCampo(Guid programaId, Guid campoId)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM programas_campos WHERE id=@id AND programa_id=@pid";
        cmd.Parameters.AddWithValue("id",  campoId);
        cmd.Parameters.AddWithValue("pid", programaId);
        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound();
        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private const string SqlSelectPrograma = @"
        SELECT p.id, p.sede_id, s.nombre AS nombre_sede, p.nombre, p.descripcion, p.cupo_maximo,
               p.activo, p.tiene_tercero, p.nombre_tercero, p.fecha_creacion, p.fecha_modificacion,
               p.rep_autorizado, p.rep_autorizacion_fecha, p.rep_firma, p.rep_nombre, p.rep_documento, p.rep_cargo
        FROM programas p
        JOIN sedes s ON s.id = p.sede_id";

    private static ProgramaDto LeerPrograma(System.Data.Common.DbDataReader r) => new(
        r.GetGuid(0), r.GetGuid(1), r.GetString(2), r.GetString(3),
        r.IsDBNull(4)  ? null : r.GetString(4),
        r.IsDBNull(5)  ? null : (int?)r.GetInt32(5),
        r.GetBoolean(6), r.GetBoolean(7),
        r.IsDBNull(8)  ? null : r.GetString(8),
        r.GetDateTime(9), r.GetDateTime(10),
        r.GetBoolean(11),
        r.IsDBNull(12) ? null : (DateTime?)r.GetDateTime(12),
        r.IsDBNull(13) ? null : r.GetString(13),
        r.IsDBNull(14) ? null : r.GetString(14),
        r.IsDBNull(15) ? null : r.GetString(15),
        r.IsDBNull(16) ? null : r.GetString(16)
    );

    private async Task<SedeDto?> CargarSedeAsync(NpgsqlConnection conn, Guid id)
    {
        Guid sid; string snombre; string? sdir, sciud, stel; bool sactivo;
        DateTime sfcreacion, sfmod;

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT id, nombre, direccion, ciudad, telefono, activo, fecha_creacion, fecha_modificacion FROM sedes WHERE id = @id";
            cmd.Parameters.AddWithValue("id", id);
            await using var r = await cmd.ExecuteReaderAsync();
            if (!await r.ReadAsync()) return null;
            sid = r.GetGuid(0); snombre = r.GetString(1);
            sdir = r.IsDBNull(2) ? null : r.GetString(2);
            sciud = r.IsDBNull(3) ? null : r.GetString(3);
            stel = r.IsDBNull(4) ? null : r.GetString(4);
            sactivo = r.GetBoolean(5);
            sfcreacion = r.GetDateTime(6); sfmod = r.GetDateTime(7);
        }

        var programas = new List<ProgramaDto>();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = SqlSelectPrograma + " WHERE p.sede_id = @sid ORDER BY p.nombre";
            cmd.Parameters.AddWithValue("sid", id);
            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync()) programas.Add(LeerPrograma(r));
        }

        return new SedeDto(sid, snombre, sdir, sciud, stel, sactivo, sfcreacion, sfmod, programas);
    }

    private NpgsqlConnection AbrirConexion() =>
        new(_db.Database.GetConnectionString());

    private static CampoDto LeerCampo(System.Data.Common.DbDataReader r)
    {
        var opJson = r.IsDBNull(5) ? null : r.GetString(5);
        return new CampoDto(
            r.GetGuid(0),
            r.GetGuid(1),
            r.GetString(2),
            r.GetString(3),
            r.GetBoolean(4),
            opJson is not null ? JsonSerializer.Deserialize<string[]>(opJson) : null,
            r.GetInt32(6),
            r.GetBoolean(7),
            r.IsDBNull(8)  ? null : r.GetString(8),
            r.IsDBNull(9)  ? 6    : r.GetInt32(9),
            r.GetDateTime(10),
            r.GetDateTime(11)
        );
    }
}
