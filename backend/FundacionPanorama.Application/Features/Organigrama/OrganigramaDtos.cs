namespace FundacionPanorama.Application.Features.Organigrama;

public record OrganigramaPersonaDto(
    Guid    Id,
    string  Cargo,
    int     Orden,
    Guid?   EmpleadoId,
    string? EmpleadoNombre,
    string? EmpleadoCargo,
    string? NombreExterno,
    string? FotoUrl
);

public record CrearOrganigramaPersonaDto(
    string  Cargo,
    int     Orden,
    Guid?   EmpleadoId,
    string? NombreExterno,
    string? FotoUrl
);

public record ActualizarOrganigramaPersonaDto(
    int?    Orden,
    Guid?   EmpleadoId,
    string? NombreExterno,
    string? FotoUrl
);
