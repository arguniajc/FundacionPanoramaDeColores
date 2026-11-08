using FundacionPanorama.Application.Features.TalentoHumano.DTOs;

namespace FundacionPanorama.Application.Features.TalentoHumano.Interfaces;

public interface ITalentoHumanoRepository
{
    /// <summary>Página de empleados (por apellidos y nombres) y total con los mismos filtros.</summary>
    Task<FundacionPanorama.Application.Shared.ListaPaginada<EmpleadoResumenDto>> ListarAsync(
        FiltroEmpleados filtro, int pagina, int porPagina, CancellationToken ct);
    Task<EmpleadoDto?>                     ObtenerAsync(Guid id, CancellationToken ct);
    Task<EmpleadoDto>                      CrearAsync(CrearEmpleadoDto dto, CancellationToken ct);
    Task<EmpleadoDto?>                     ActualizarAsync(Guid id, ActualizarEmpleadoDto dto, CancellationToken ct);
    Task<bool>                             EliminarAsync(Guid id, CancellationToken ct);

    Task<IReadOnlyList<NovedadDto>>        ListarNovedadesAsync(Guid empleadoId, CancellationToken ct);
    Task<IReadOnlyList<NovedadDto>>        ListarTodasNovedadesAsync(string? estado, CancellationToken ct);
    Task<NovedadDto>                       CrearNovedadAsync(Guid empleadoId, CrearNovedadDto dto, CancellationToken ct);
    Task<NovedadDto?>                      ActualizarNovedadAsync(Guid id, ActualizarNovedadDto dto, CancellationToken ct);
    Task<bool>                             EliminarNovedadAsync(Guid id, CancellationToken ct);

    Task<TalentoHumanoStatsDto>            StatsAsync(CancellationToken ct);

    /// <summary>
    /// Empleado que ya tiene ese número de documento (normalizado: sin puntos, espacios ni guiones),
    /// o null. <paramref name="excluirId"/> deja fuera el propio registro al editar.
    /// </summary>
    Task<FundacionPanorama.Application.Shared.PersonaConDocumento?> BuscarDocumentoAsync(string numeroNormalizado, Guid? excluirId, CancellationToken ct);
}
