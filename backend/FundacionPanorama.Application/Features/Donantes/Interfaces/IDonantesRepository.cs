using FundacionPanorama.Application.Features.Donantes.DTOs;

namespace FundacionPanorama.Application.Features.Donantes.Interfaces;

public interface IDonantesRepository
{
    Task<IReadOnlyList<DonanteDto>> ListarAsync(string? buscar, bool soloActivos, int pagina, int porPagina, CancellationToken ct = default);
    Task<DonanteDto?> ObtenerAsync(Guid id, CancellationToken ct = default);
    Task<DonanteDto>  CrearAsync(CrearDonanteDto dto, CancellationToken ct = default);
    Task<DonanteDto?> ActualizarAsync(Guid id, CrearDonanteDto dto, CancellationToken ct = default);

    /// <summary>
    /// Primer donante (activo o no) cuyo documento normalizado (ver DonantesService.NormalizarDocumento)
    /// es igual a <paramref name="documentoNormalizado"/>, sin contar <paramref name="excluirId"/>.
    /// </summary>
    Task<DonanteExistente?> BuscarDocumentoAsync(string documentoNormalizado, Guid? excluirId, CancellationToken ct = default);

    /// <summary>Invierte el estado activo. Devuelve el nuevo valor, o null si no existe.</summary>
    Task<bool?> ToggleAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Desactiva el donante si tiene donaciones (siempre true); si no, lo borra
    /// (false si no existía).
    /// </summary>
    Task<bool> EliminarAsync(Guid id, CancellationToken ct = default);
}
