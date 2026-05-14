namespace FundacionPanorama.Application.Features.Permisos.DTOs;

public record PermisoDto(string Modulo, string Accion, bool Permitido);

// { "beneficiarios": ["ver","crear","editar"], ... }
public record PermisosRolDto(string Rol, Dictionary<string, List<string>> Permisos);

public record ActualizarPermisosDto(List<PermisoDto> Permisos);
