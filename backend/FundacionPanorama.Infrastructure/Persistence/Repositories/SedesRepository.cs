// SQL del módulo Sedes y Programas (movido tal cual desde SedesController).
using System.Data.Common;
using System.Text.Json;
using FundacionPanorama.Application.Features.Sedes.DTOs;
using FundacionPanorama.Application.Features.Sedes.Interfaces;
using Npgsql;
using NpgsqlTypes;

namespace FundacionPanorama.Infrastructure.Persistence.Repositories;

public class SedesRepository(DbConnectionFactory factory) : ISedesRepository
{
    private async Task<NpgsqlConnection> AbrirAsync(CancellationToken ct)
    {
        var conn = factory.Create();
        await conn.OpenAsync(ct);
        return conn;
    }

    // ── Sedes ─────────────────────────────────────────────────────────────────

    public async Task<List<SedeDto>> ListarAsync(bool soloActivas, CancellationToken ct)
    {
        await using var conn = await AbrirAsync(ct);

        var dtos = new List<SedeDto>();
        var sedeIds = new List<Guid>();

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT id, nombre, direccion, ciudad, telefono, activo, fecha_creacion, fecha_modificacion FROM sedes" +
                              (soloActivas ? " WHERE activo = true" : "") +
                              " ORDER BY nombre";
            await using var r = await cmd.ExecuteReaderAsync(ct);
            while (await r.ReadAsync(ct))
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
            await using var r = await cmd.ExecuteReaderAsync(ct);
            while (await r.ReadAsync(ct))
            {
                var p = LeerPrograma(r);
                if (indexBySede.TryGetValue(p.SedeId, out var sede)) sede.Programas.Add(p);
            }
        }

        return dtos;
    }

    public async Task<SedeDto?> ObtenerAsync(Guid id, CancellationToken ct)
    {
        await using var conn = await AbrirAsync(ct);

        Guid sid; string snombre; string? sdir, sciud, stel; bool sactivo;
        DateTime sfcreacion, sfmod;

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT id, nombre, direccion, ciudad, telefono, activo, fecha_creacion, fecha_modificacion FROM sedes WHERE id = @id";
            cmd.Parameters.AddWithValue("id", id);
            await using var r = await cmd.ExecuteReaderAsync(ct);
            if (!await r.ReadAsync(ct)) return null;
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
            await using var r = await cmd.ExecuteReaderAsync(ct);
            while (await r.ReadAsync(ct)) programas.Add(LeerPrograma(r));
        }

        return new SedeDto(sid, snombre, sdir, sciud, stel, sactivo, sfcreacion, sfmod, programas);
    }

    public async Task<Guid> CrearAsync(CrearSedeDto dto, CancellationToken ct)
    {
        await using var conn = await AbrirAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO sedes (nombre, direccion, ciudad, telefono, activo)
            VALUES (@nombre, @dir, @ciudad, @tel, true)
            RETURNING id";
        cmd.Parameters.AddWithValue("nombre", dto.Nombre.Trim());
        cmd.Parameters.AddWithValue("dir",    (object?)dto.Direccion?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("ciudad", (object?)dto.Ciudad?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("tel",    (object?)dto.Telefono?.Trim() ?? DBNull.Value);
        return (Guid)(await cmd.ExecuteScalarAsync(ct))!;
    }

    public async Task<int> ActualizarAsync(Guid id, CrearSedeDto dto, CancellationToken ct)
    {
        await using var conn = await AbrirAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
                UPDATE sedes SET nombre=@nombre, direccion=@dir, ciudad=@ciudad, telefono=@tel, fecha_modificacion=NOW()
                WHERE id = @id";
        cmd.Parameters.AddWithValue("id",     id);
        cmd.Parameters.AddWithValue("nombre", dto.Nombre.Trim());
        cmd.Parameters.AddWithValue("dir",    (object?)dto.Direccion?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("ciudad", (object?)dto.Ciudad?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("tel",    (object?)dto.Telefono?.Trim() ?? DBNull.Value);
        return await cmd.ExecuteNonQueryAsync(ct);
    }

    public Task<int> ToggleAsync(Guid id, CancellationToken ct)
        => EjecutarPorIdAsync("UPDATE sedes SET activo = NOT activo, fecha_modificacion = NOW() WHERE id = @id", id, ct);

    public Task<int> EliminarAsync(Guid id, CancellationToken ct)
        => EjecutarPorIdAsync("DELETE FROM sedes WHERE id = @id", id, ct);

    // ── Programas ─────────────────────────────────────────────────────────────

    public Task<bool> ExisteSedeAsync(Guid id, CancellationToken ct)
        => ExistePorIdAsync("SELECT EXISTS(SELECT 1 FROM sedes WHERE id = @id)", id, ct);

    public async Task<ProgramaDto?> ObtenerProgramaAsync(Guid id, CancellationToken ct)
    {
        await using var conn = await AbrirAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = SqlSelectPrograma + " WHERE p.id = @id";
        cmd.Parameters.AddWithValue("id", id);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct)) return null;
        return LeerPrograma(r);
    }

    public async Task<List<ProgramaDto>> ListarProgramasAsync(Guid sedeId, CancellationToken ct)
    {
        await using var conn = await AbrirAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = SqlSelectPrograma + " WHERE p.sede_id = @sid ORDER BY p.nombre";
        cmd.Parameters.AddWithValue("sid", sedeId);
        var programas = new List<ProgramaDto>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct)) programas.Add(LeerPrograma(r));
        return programas;
    }

    public async Task<Guid> CrearProgramaAsync(CrearProgramaDto dto, CancellationToken ct)
    {
        await using var conn = await AbrirAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
                INSERT INTO programas (sede_id, nombre, descripcion, cupo_maximo, activo, tiene_tercero, nombre_tercero,
                    tercero_rep_nombre, tercero_rep_tipo_doc, tercero_rep_documento, tercero_rep_cargo, tercero_rep_firma)
                VALUES (@sedeId, @nombre, @desc, @cupo, true, @tieneTercero, @nombreTercero,
                    @trepNombre, @trepTipoDoc, @trepDoc, @trepCargo, @trepFirma)
                RETURNING id";
        AgregarParametrosPrograma(cmd, dto);
        return (Guid)(await cmd.ExecuteScalarAsync(ct))!;
    }

    public async Task<int> ActualizarProgramaAsync(Guid id, CrearProgramaDto dto, CancellationToken ct)
    {
        await using var conn = await AbrirAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
                UPDATE programas
                SET sede_id=@sedeId, nombre=@nombre, descripcion=@desc, cupo_maximo=@cupo,
                    tiene_tercero=@tieneTercero, nombre_tercero=@nombreTercero,
                    tercero_rep_nombre=@trepNombre, tercero_rep_tipo_doc=@trepTipoDoc,
                    tercero_rep_documento=@trepDoc, tercero_rep_cargo=@trepCargo,
                    tercero_rep_firma=@trepFirma, fecha_modificacion=NOW()
                WHERE id = @id";
        cmd.Parameters.AddWithValue("id", id);
        AgregarParametrosPrograma(cmd, dto);
        return await cmd.ExecuteNonQueryAsync(ct);
    }

    private static void AgregarParametrosPrograma(NpgsqlCommand cmd, CrearProgramaDto dto)
    {
        cmd.Parameters.AddWithValue("sedeId",        dto.SedeId);
        cmd.Parameters.AddWithValue("nombre",        dto.Nombre.Trim());
        cmd.Parameters.AddWithValue("desc",          (object?)dto.Descripcion?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("cupo",          (object?)dto.CupoMaximo ?? DBNull.Value);
        cmd.Parameters.AddWithValue("tieneTercero",  dto.TieneTercero);
        cmd.Parameters.AddWithValue("nombreTercero", (object?)dto.NombreTercero?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("trepNombre",    (object?)dto.TerceroRepNombre?.Trim()    ?? DBNull.Value);
        cmd.Parameters.AddWithValue("trepTipoDoc",   (object?)dto.TerceroRepTipoDoc           ?? DBNull.Value);
        cmd.Parameters.AddWithValue("trepDoc",       (object?)dto.TerceroRepDocumento?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("trepCargo",     (object?)dto.TerceroRepCargo?.Trim()     ?? DBNull.Value);
        cmd.Parameters.AddWithValue("trepFirma",     (object?)dto.TerceroRepFirma             ?? DBNull.Value);
    }

    public Task<int> ToggleProgramaAsync(Guid id, CancellationToken ct)
        => EjecutarPorIdAsync("UPDATE programas SET activo = NOT activo, fecha_modificacion = NOW() WHERE id = @id", id, ct);

    public Task<int> EliminarProgramaAsync(Guid id, CancellationToken ct)
        => EjecutarPorIdAsync("DELETE FROM programas WHERE id = @id", id, ct);

    public async Task<RepLegalConfig?> ObtenerRepLegalConfigAsync(CancellationToken ct)
    {
        await using var conn = await AbrirAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT nombre_rep_legal, documento_rep, cargo_rep, firma_rep FROM configuracion LIMIT 1";
        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct)) return null;
        return new RepLegalConfig(
            r.IsDBNull(0) ? null : r.GetString(0),
            r.IsDBNull(1) ? null : r.GetString(1),
            r.IsDBNull(2) ? null : r.GetString(2),
            r.IsDBNull(3) ? null : r.GetString(3));
    }

    public async Task<int> AutorizarRepAsync(Guid id, RepLegalConfig rep, CancellationToken ct)
    {
        await using var conn = await AbrirAsync(ct);
        await using var cmd = conn.CreateCommand();
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
        cmd.Parameters.AddWithValue("id",           id);
        cmd.Parameters.AddWithValue("repNombre",    (object?)rep.Nombre    ?? DBNull.Value);
        cmd.Parameters.AddWithValue("repDocumento", (object?)rep.Documento ?? DBNull.Value);
        cmd.Parameters.AddWithValue("repCargo",     (object?)rep.Cargo     ?? DBNull.Value);
        cmd.Parameters.AddWithValue("repFirma",     (object?)rep.Firma     ?? DBNull.Value);
        return await cmd.ExecuteNonQueryAsync(ct);
    }

    public Task<int> RevocarRepAsync(Guid id, CancellationToken ct)
        => EjecutarPorIdAsync(@"
                UPDATE programas SET
                    rep_autorizado = false,
                    rep_autorizacion_fecha = NULL,
                    rep_nombre = NULL,
                    rep_documento = NULL,
                    rep_cargo = NULL,
                    rep_firma = NULL,
                    fecha_modificacion = NOW()
                WHERE id = @id", id, ct);

    // ── Campos dinámicos ──────────────────────────────────────────────────────

    public async Task<List<CampoDto>> ListarCamposAsync(Guid programaId, CancellationToken ct)
    {
        var campos = new List<CampoDto>();
        await using var conn = await AbrirAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT id, programa_id, etiqueta, tipo, obligatorio, opciones_json, orden, activo, seccion, columnas, fecha_creacion, fecha_modificacion FROM programas_campos WHERE programa_id = @pid AND activo = true ORDER BY orden";
        cmd.Parameters.AddWithValue("pid", programaId);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct)) campos.Add(LeerCampo(r));
        return campos;
    }

    public Task<bool> ExisteProgramaAsync(Guid id, CancellationToken ct)
        => ExistePorIdAsync("SELECT EXISTS(SELECT 1 FROM programas WHERE id = @id)", id, ct);

    public async Task<CampoDto> CrearCampoAsync(Guid programaId, CrearCampoDto dto, CancellationToken ct)
    {
        await using var conn = await AbrirAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"INSERT INTO programas_campos (programa_id, etiqueta, tipo, obligatorio, opciones_json, orden, activo, seccion, columnas)
                            VALUES (@pid, @etiqueta, @tipo, @oblig, @opciones, @orden, true, @seccion, @columnas)
                            RETURNING id, programa_id, etiqueta, tipo, obligatorio, opciones_json, orden, activo, seccion, columnas, fecha_creacion, fecha_modificacion";
        AgregarParametrosCampo(cmd, programaId, dto);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        await r.ReadAsync(ct);
        return LeerCampo(r);
    }

    public async Task<CampoDto?> ActualizarCampoAsync(Guid programaId, Guid campoId, CrearCampoDto dto, CancellationToken ct)
    {
        await using var conn = await AbrirAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"UPDATE programas_campos SET etiqueta=@etiqueta, tipo=@tipo, obligatorio=@oblig, opciones_json=@opciones, orden=@orden, seccion=@seccion, columnas=@columnas, fecha_modificacion=NOW()
                            WHERE id=@id AND programa_id=@pid
                            RETURNING id, programa_id, etiqueta, tipo, obligatorio, opciones_json, orden, activo, seccion, columnas, fecha_creacion, fecha_modificacion";
        cmd.Parameters.AddWithValue("id", campoId);
        AgregarParametrosCampo(cmd, programaId, dto);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct)) return null;
        return LeerCampo(r);
    }

    private static void AgregarParametrosCampo(NpgsqlCommand cmd, Guid programaId, CrearCampoDto dto)
    {
        var opJson = dto.Opciones is { Length: > 0 } ? JsonSerializer.Serialize(dto.Opciones) : null;
        cmd.Parameters.AddWithValue("pid",      programaId);
        cmd.Parameters.AddWithValue("etiqueta", dto.Etiqueta.Trim());
        cmd.Parameters.AddWithValue("tipo",     dto.Tipo);
        cmd.Parameters.AddWithValue("oblig",    dto.Obligatorio);
        cmd.Parameters.AddWithValue("opciones", (object?)opJson ?? DBNull.Value);
        cmd.Parameters.AddWithValue("orden",    dto.Orden);
        cmd.Parameters.AddWithValue("seccion",  string.IsNullOrWhiteSpace(dto.Seccion) ? DBNull.Value : (object)dto.Seccion.Trim());
        cmd.Parameters.AddWithValue("columnas", dto.Columnas ?? 6);
    }

    public async Task<int> EliminarCampoAsync(Guid programaId, Guid campoId, CancellationToken ct)
    {
        await using var conn = await AbrirAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM programas_campos WHERE id=@id AND programa_id=@pid";
        cmd.Parameters.AddWithValue("id",  campoId);
        cmd.Parameters.AddWithValue("pid", programaId);
        return await cmd.ExecuteNonQueryAsync(ct);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<int> EjecutarPorIdAsync(string sql, Guid id, CancellationToken ct)
    {
        await using var conn = await AbrirAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.Parameters.AddWithValue("id", id);
        return await cmd.ExecuteNonQueryAsync(ct);
    }

    private async Task<bool> ExistePorIdAsync(string sql, Guid id, CancellationToken ct)
    {
        await using var conn = await AbrirAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.Parameters.AddWithValue("id", id);
        return (bool)(await cmd.ExecuteScalarAsync(ct))!;
    }

    private const string SqlSelectPrograma = @"
        SELECT p.id, p.sede_id, s.nombre AS nombre_sede, p.nombre, p.descripcion, p.cupo_maximo,
               p.activo, p.tiene_tercero, p.nombre_tercero, p.fecha_creacion, p.fecha_modificacion,
               p.rep_autorizado, p.rep_autorizacion_fecha, p.rep_firma, p.rep_nombre, p.rep_documento, p.rep_cargo,
               p.tercero_rep_nombre, p.tercero_rep_tipo_doc, p.tercero_rep_documento, p.tercero_rep_cargo, p.tercero_rep_firma
        FROM programas p
        JOIN sedes s ON s.id = p.sede_id";

    private static ProgramaDto LeerPrograma(DbDataReader r) => new(
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
        r.IsDBNull(16) ? null : r.GetString(16),
        r.IsDBNull(17) ? null : r.GetString(17),
        r.IsDBNull(18) ? null : r.GetString(18),
        r.IsDBNull(19) ? null : r.GetString(19),
        r.IsDBNull(20) ? null : r.GetString(20),
        r.IsDBNull(21) ? null : r.GetString(21)
    );

    private static CampoDto LeerCampo(DbDataReader r)
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
