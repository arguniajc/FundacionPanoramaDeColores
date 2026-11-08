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

// Límites = columnas de voluntarios. Donde el esquema base (BD nueva) y las migraciones
// difieren se usa el menor: nombre VARCHAR(150), email 150, telefono 20.
public record CrearVoluntarioDto(
    [Required(ErrorMessage = "El nombre es obligatorio. Ejemplo: Laura Gómez")]
    [StringLength(150, ErrorMessage = "El nombre no puede superar 150 caracteres.")]           string    Nombre,
    [StringLength(20,  ErrorMessage = "El tipo de documento no puede superar 20 caracteres.")] string?   TipoDocumento,
    [StringLength(50,  ErrorMessage = "El documento no puede superar 50 caracteres.")]         string?   Documento,
    [EmailAddress(ErrorMessage = "El correo no es válido. Ejemplo: nombre@fundacion.org")]
    [StringLength(150, ErrorMessage = "El correo no puede superar 150 caracteres.")]           string?   Email,
    [Phone(ErrorMessage = "El teléfono no es válido. Ejemplo: 3001234567")]
    [StringLength(20,  ErrorMessage = "El teléfono no puede superar 20 caracteres.")]          string?   Telefono,
    [StringLength(100, ErrorMessage = "La ciudad no puede superar 100 caracteres.")]           string?   Ciudad,
    [StringLength(100, ErrorMessage = "El país no puede superar 100 caracteres.")]             string?   Pais,
    [StringLength(100, ErrorMessage = "El departamento no puede superar 100 caracteres.")]     string?   Departamento,
    DateTime?                                                                                    FechaNacimiento,
    DateTime?                                                                                    FechaInicio,
    [StringLength(100, ErrorMessage = "La profesión no puede superar 100 caracteres.")]        string?   Profesion,
    [StringLength(1000, ErrorMessage = "Las notas no pueden superar 1000 caracteres.")]        string?   Notas
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
