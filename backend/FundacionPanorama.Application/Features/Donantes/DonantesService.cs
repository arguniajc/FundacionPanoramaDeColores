using FundacionPanorama.Application.Features.Donantes.DTOs;
using FundacionPanorama.Application.Features.Donantes.Interfaces;
using static FundacionPanorama.Application.Shared.Validar;

namespace FundacionPanorama.Application.Features.Donantes;

public class DonantesService(IDonantesRepository repo)
{
    /// <summary>Tipos del panel (DonanteDialog.jsx). Vacío = "persona" (lo pone el repositorio).</summary>
    public static readonly string[] Tipos = ["persona", "empresa"];

    static void ValidarDonante(CrearDonanteDto dto)
    {
        Obligatorio(dto.Nombre, "El nombre es obligatorio. Ejemplo: Ferretería El Tornillo");
        Largo(dto.Nombre, 200, "El nombre");
        Exigir(string.IsNullOrWhiteSpace(dto.Tipo) || Tipos.Contains(dto.Tipo), "El tipo de donante no es válido (persona o empresa).");
        Correo(dto.Email, 150, "El correo", "nombre@empresa.com");
    }

    public Task<IReadOnlyList<DonanteDto>> ListarAsync(string? buscar, bool soloActivos, int pagina, int porPagina, CancellationToken ct = default)
        => repo.ListarAsync(buscar, soloActivos, Math.Max(pagina, 1), Math.Clamp(porPagina, 1, 500), ct);

    public Task<DonanteDto?> ObtenerAsync(Guid id, CancellationToken ct = default)
        => repo.ObtenerAsync(id, ct);

    public Task<DonanteDto> CrearAsync(CrearDonanteDto dto, CancellationToken ct = default)
    {
        ValidarDonante(dto);
        return repo.CrearAsync(dto, ct);
    }

    public Task<DonanteDto?> ActualizarAsync(Guid id, CrearDonanteDto dto, CancellationToken ct = default)
    {
        ValidarDonante(dto);
        return repo.ActualizarAsync(id, dto, ct);
    }

    public Task<bool?> ToggleAsync(Guid id, CancellationToken ct = default)
        => repo.ToggleAsync(id, ct);

    public Task<bool> EliminarAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarAsync(id, ct);
}
