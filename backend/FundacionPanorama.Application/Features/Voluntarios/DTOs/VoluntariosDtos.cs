using System.ComponentModel.DataAnnotations;

namespace FundacionPanorama.Application.Features.Voluntarios.DTOs;

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
