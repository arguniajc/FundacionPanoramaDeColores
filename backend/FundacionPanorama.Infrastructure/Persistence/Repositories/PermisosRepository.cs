using FundacionPanorama.Application.Features.Permisos.DTOs;
using FundacionPanorama.Application.Features.Permisos.Interfaces;

namespace FundacionPanorama.Infrastructure.Persistence.Repositories;

public class PermisosRepository(DbConnectionFactory factory) : IPermisosRepository
{
    public async Task<Dictionary<string, List<string>>> ObtenerPorRolAsync(string rol, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT modulo, accion FROM roles_permisos WHERE rol=@rol AND permitido=true";
        cmd.Parameters.AddWithValue("rol", rol);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var result = new Dictionary<string, List<string>>();
        while (await r.ReadAsync(ct))
        {
            var modulo = r.GetString(0);
            var accion = r.GetString(1);
            if (!result.ContainsKey(modulo)) result[modulo] = [];
            result[modulo].Add(accion);
        }
        return result;
    }

    public async Task<bool> TienePermisoAsync(string rol, string modulo, string accion, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT 1 FROM roles_permisos WHERE rol=@rol AND modulo=@modulo AND accion=@accion AND permitido=true LIMIT 1";
        cmd.Parameters.AddWithValue("rol",    rol);
        cmd.Parameters.AddWithValue("modulo", modulo);
        cmd.Parameters.AddWithValue("accion", accion);
        return await cmd.ExecuteScalarAsync(ct) is not null;
    }

    public async Task GuardarPermisosRolAsync(string rol, List<PermisoDto> permisos, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        foreach (var p in permisos)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO roles_permisos (rol, modulo, accion, permitido)
                VALUES (@rol, @modulo, @accion, @permitido)
                ON CONFLICT (rol, modulo, accion) DO UPDATE SET permitido = EXCLUDED.permitido";
            cmd.Parameters.AddWithValue("rol",      rol);
            cmd.Parameters.AddWithValue("modulo",   p.Modulo);
            cmd.Parameters.AddWithValue("accion",   p.Accion);
            cmd.Parameters.AddWithValue("permitido", p.Permitido);
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }

    public async Task<List<PermisosRolDto>> ObtenerTodosLosRolesAsync(CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT rol, modulo, accion FROM roles_permisos WHERE permitido=true ORDER BY rol, modulo, accion";
        await using var r = await cmd.ExecuteReaderAsync(ct);

        var map = new Dictionary<string, Dictionary<string, List<string>>>();
        while (await r.ReadAsync(ct))
        {
            var rol    = r.GetString(0);
            var modulo = r.GetString(1);
            var accion = r.GetString(2);
            if (!map.ContainsKey(rol))    map[rol]         = [];
            if (!map[rol].ContainsKey(modulo)) map[rol][modulo] = [];
            map[rol][modulo].Add(accion);
        }
        return map.Select(kv => new PermisosRolDto(kv.Key, kv.Value)).ToList();
    }
}
