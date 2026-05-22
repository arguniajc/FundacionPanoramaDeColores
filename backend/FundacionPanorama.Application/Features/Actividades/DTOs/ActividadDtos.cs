namespace FundacionPanorama.Application.Features.Actividades.DTOs;

public record ActividadResumenDto(
    Guid    Id,
    string  Titulo,
    Guid?   ProgramaId,
    string? ProgramaNombre,
    DateTime FechaInicio,
    DateTime? FechaFin,
    string? Lugar,
    string  Estado,
    int     TotalInscritos);

public record ActividadDto(
    Guid    Id,
    string  Titulo,
    string? Descripcion,
    Guid?   ProgramaId,
    string? ProgramaNombre,
    DateTime FechaInicio,
    DateTime? FechaFin,
    string? Lugar,
    string  Estado,
    int     TotalInscritos,
    int     TotalAsistieron,
    DateTime CreatedAt);

public record CrearActividadDto(
    string   Titulo,
    string?  Descripcion,
    Guid?    ProgramaId,
    DateTime FechaInicio,
    DateTime? FechaFin,
    string?  Lugar);

public record ActualizarActividadDto(
    string   Titulo,
    string?  Descripcion,
    Guid?    ProgramaId,
    DateTime FechaInicio,
    DateTime? FechaFin,
    string?  Lugar,
    string   Estado);

public record AsistenciaItemDto(
    Guid    BeneficiarioId,
    string  NombreCompleto,
    string? Foto,
    bool    Asistio);

public record RegistrarAsistenciaDto(List<AsistenciaRegistroDto> Asistencias);

public record AsistenciaRegistroDto(Guid BeneficiarioId, bool Asistio);

// ── Horarios de programas ─────────────────────────────────────────────────────

public record HorarioDto(
    Guid    Id,
    Guid    ProgramaId,
    string  ProgramaNombre,
    string  SedeNombre,
    int     DiaSemana,
    string  HoraInicio,
    string  HoraFin,
    string? Lugar,
    bool    Activo);

public record CrearHorarioDto(
    Guid    ProgramaId,
    int     DiaSemana,
    string  HoraInicio,
    string  HoraFin,
    string? Lugar);

public record ActualizarHorarioDto(
    Guid    ProgramaId,
    int     DiaSemana,
    string  HoraInicio,
    string  HoraFin,
    string? Lugar,
    bool    Activo);
