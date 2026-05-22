using FundacionPanorama.Application.Features.Actividades.DTOs;

namespace FundacionPanorama.Application.Features.Actividades.Interfaces;

public interface IActividadesRepository
{
    Task<IReadOnlyList<ActividadResumenDto>> ListarAsync(int? mes, int? anio, Guid? programaId, CancellationToken ct);
    Task<ActividadDto?> ObtenerAsync(Guid id, CancellationToken ct);
    Task<ActividadDto>  CrearAsync(CrearActividadDto dto, CancellationToken ct);
    Task<ActividadDto?> ActualizarAsync(Guid id, ActualizarActividadDto dto, CancellationToken ct);
    Task<bool>          EliminarAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<AsistenciaItemDto>> ObtenerAsistenciaAsync(Guid actividadId, CancellationToken ct);
    Task RegistrarAsistenciaAsync(Guid actividadId, RegistrarAsistenciaDto dto, CancellationToken ct);

    // Horarios de programas
    Task<IReadOnlyList<HorarioDto>> ListarHorariosAsync(Guid? programaId, CancellationToken ct);
    Task<HorarioDto>  CrearHorarioAsync(CrearHorarioDto dto, CancellationToken ct);
    Task<HorarioDto?> ActualizarHorarioAsync(Guid id, ActualizarHorarioDto dto, CancellationToken ct);
    Task<bool>        EliminarHorarioAsync(Guid id, CancellationToken ct);
}
