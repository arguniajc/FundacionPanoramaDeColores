using FundacionPanorama.Application.Features.Inscripciones.DTOs;
using FundacionPanorama.Application.Shared;

namespace FundacionPanorama.Application.Features.Inscripciones.Interfaces;

public interface IInscripcionesRepository
{
    /// <summary>Página de inscripciones (más recientes primero) y total con los mismos filtros.</summary>
    Task<ListaPaginada<InscripcionDto>> ListarAsync(FiltroInscripciones filtro, int pagina, int porPagina, CancellationToken ct = default);
    Task<InscripcionDto?> ObtenerAsync(Guid id, CancellationToken ct = default);

    /// <summary>Valida existencia/duplicado/cupo e inserta; los errores de validación vienen en el resultado.</summary>
    Task<CrearInscripcionResultado> CrearAsync(CrearInscripcionDto dto, CancellationToken ct = default);

    Task<InscripcionDto?> ActualizarAsync(Guid id, ActualizarInscripcionDto dto, CancellationToken ct = default);

    /// <summary>
    /// Cambia el estado. Si la inscripción pasa a 'activa' desde un estado inactivo revisa duplicado y
    /// cupo del programa con la fila del programa bloqueada (misma regla que al crear).
    /// </summary>
    Task<CambiarEstadoInscripcionResultado> CambiarEstadoAsync(Guid id, string estado, CancellationToken ct = default);
    Task<bool> EliminarAsync(Guid id, CancellationToken ct = default);
}
