using FundacionPanorama.Application.Features.Donantes.DTOs;
using FundacionPanorama.Application.Features.Donantes.Interfaces;

namespace FundacionPanorama.Application.Features.Donantes;

public class DonantesService(IDonantesRepository repo)
{
    public Task<IReadOnlyList<DonanteDto>> ListarAsync(string? buscar, bool soloActivos, int pagina, int porPagina, CancellationToken ct = default)
        => repo.ListarAsync(buscar, soloActivos, Math.Max(pagina, 1), Math.Clamp(porPagina, 1, 500), ct);

    public Task<DonanteDto?> ObtenerAsync(Guid id, CancellationToken ct = default)
        => repo.ObtenerAsync(id, ct);

    public Task<DonanteDto> CrearAsync(CrearDonanteDto dto, CancellationToken ct = default)
        => repo.CrearAsync(dto, ct);

    public Task<DonanteDto?> ActualizarAsync(Guid id, CrearDonanteDto dto, CancellationToken ct = default)
        => repo.ActualizarAsync(id, dto, ct);

    public Task<bool?> ToggleAsync(Guid id, CancellationToken ct = default)
        => repo.ToggleAsync(id, ct);

    public Task<bool> EliminarAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarAsync(id, ct);
}
