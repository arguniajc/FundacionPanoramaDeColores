using FundacionPanorama.Application.Features.Usuarios.DTOs;
using FundacionPanorama.Application.Features.Usuarios.Interfaces;

namespace FundacionPanorama.Infrastructure.Persistence.Repositories;

public class UsuariosRepository(DbConnectionFactory factory) : IUsuariosRepository
{
    public async Task<UsuarioDto?> ObtenerPorEmailAsync(string email, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT id,email,nombre,avatar_url,rol,activo,fecha_creacion FROM usuarios WHERE email=@email AND activo=true LIMIT 1";
        cmd.Parameters.AddWithValue("email", email);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        return await r.ReadAsync(ct) ? Map(r) : null;
    }

    public async Task<IReadOnlyList<UsuarioDto>> ListarAsync(CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT id,email,nombre,avatar_url,rol,activo,fecha_creacion FROM usuarios ORDER BY fecha_creacion";
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<UsuarioDto>();
        while (await r.ReadAsync(ct)) list.Add(Map(r));
        return list;
    }

    public async Task<UsuarioDto> CrearAsync(CrearUsuarioDto dto, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO usuarios (email, nombre, rol)
            VALUES (@email, @nombre, @rol)
            RETURNING id, email, nombre, avatar_url, rol, activo, fecha_creacion";
        cmd.Parameters.AddWithValue("email",  dto.Email.Trim());
        cmd.Parameters.AddWithValue("nombre", (object?)dto.Nombre?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("rol",    dto.Rol);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        await r.ReadAsync(ct);
        return Map(r);
    }

    public async Task<UsuarioDto?> ActualizarAsync(Guid id, ActualizarUsuarioDto dto, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            UPDATE usuarios
            SET nombre=@nombre, rol=@rol, activo=@activo, fecha_modificacion=NOW()
            WHERE id=@id
            RETURNING id, email, nombre, avatar_url, rol, activo, fecha_creacion";
        cmd.Parameters.AddWithValue("id",     id);
        cmd.Parameters.AddWithValue("nombre", (object?)dto.Nombre?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("rol",    dto.Rol);
        cmd.Parameters.AddWithValue("activo", dto.Activo);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        return await r.ReadAsync(ct) ? Map(r) : null;
    }

    public async Task<bool> EliminarAsync(Guid id, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "UPDATE usuarios SET activo=false, fecha_modificacion=NOW() WHERE id=@id";
        cmd.Parameters.AddWithValue("id", id);
        return await cmd.ExecuteNonQueryAsync(ct) > 0;
    }

    public async Task<UsuarioDto> UpsertAsync(string email, string nombre, string? avatarUrl, string rol, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO usuarios (email, nombre, avatar_url, rol)
            VALUES (@email, @nombre, @avatar, @rol)
            ON CONFLICT (email) DO UPDATE SET
                nombre             = EXCLUDED.nombre,
                avatar_url         = EXCLUDED.avatar_url,
                activo             = true,
                fecha_modificacion = NOW()
            RETURNING id, email, nombre, avatar_url, rol, activo, fecha_creacion";
        cmd.Parameters.AddWithValue("email",  email);
        cmd.Parameters.AddWithValue("nombre", (object?)nombre ?? DBNull.Value);
        cmd.Parameters.AddWithValue("avatar", (object?)avatarUrl ?? DBNull.Value);
        cmd.Parameters.AddWithValue("rol",    rol);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        await r.ReadAsync(ct);
        return Map(r);
    }

    private static UsuarioDto Map(Npgsql.NpgsqlDataReader r) => new(
        r.GetGuid(0),
        r.GetString(1),
        r.IsDBNull(2) ? null : r.GetString(2),
        r.IsDBNull(3) ? null : r.GetString(3),
        r.GetString(4),
        r.GetBoolean(5),
        r.GetDateTime(6));
}
