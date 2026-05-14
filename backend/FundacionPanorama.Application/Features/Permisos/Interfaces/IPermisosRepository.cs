using FundacionPanorama.Application.Features.Permisos.DTOs;

namespace FundacionPanorama.Application.Features.Permisos.Interfaces;

public interface IPermisosRepository
{
    Task<Dictionary<string, List<string>>> ObtenerPorRolAsync(string rol, CancellationToken ct = default);
    Task<bool> TienePermisoAsync(string rol, string modulo, string accion, CancellationToken ct = default);
    Task GuardarPermisosRolAsync(string rol, List<PermisoDto> permisos, CancellationToken ct = default);
    Task<List<PermisosRolDto>> ObtenerTodosLosRolesAsync(CancellationToken ct = default);
}
