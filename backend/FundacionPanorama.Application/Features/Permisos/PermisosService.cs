using FundacionPanorama.Application.Features.Permisos.DTOs;
using FundacionPanorama.Application.Features.Permisos.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace FundacionPanorama.Application.Features.Permisos;

public class PermisosService(IPermisosRepository repo, IMemoryCache cache)
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    public async Task<Dictionary<string, List<string>>> ObtenerPorRolAsync(string rol, CancellationToken ct = default)
    {
        var cacheKey = $"permisos:{rol}";
        if (cache.TryGetValue(cacheKey, out Dictionary<string, List<string>>? cached) && cached is not null)
            return cached;

        var permisos = await repo.ObtenerPorRolAsync(rol, ct);
        cache.Set(cacheKey, permisos, CacheTtl);
        return permisos;
    }

    public async Task<bool> TienePermisoAsync(string rol, string modulo, string accion, CancellationToken ct = default)
    {
        if (rol == "administrador") return true;
        var permisos = await ObtenerPorRolAsync(rol, ct);
        return permisos.TryGetValue(modulo, out var acciones) && acciones.Contains(accion);
    }

    public Task<List<PermisosRolDto>> ObtenerTodosLosRolesAsync(CancellationToken ct = default)
        => repo.ObtenerTodosLosRolesAsync(ct);

    public async Task GuardarPermisosRolAsync(string rol, List<PermisoDto> permisos, CancellationToken ct = default)
    {
        await repo.GuardarPermisosRolAsync(rol, permisos, ct);
        cache.Remove($"permisos:{rol}");
    }
}
