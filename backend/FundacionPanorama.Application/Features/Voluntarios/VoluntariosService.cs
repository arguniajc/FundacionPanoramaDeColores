using FundacionPanorama.Application.Features.Voluntarios.DTOs;
using FundacionPanorama.Application.Features.Voluntarios.Interfaces;
using FundacionPanorama.Application.Shared;
using static FundacionPanorama.Application.Shared.Validar;

namespace FundacionPanorama.Application.Features.Voluntarios;

public class VoluntariosService(IVoluntariosRepository repo)
{
    /// <summary>horas_semanales NUMERIC(6,2): entre 0 y las horas de una semana.</summary>
    const decimal MaxHorasSemanales = 168;

    static void ValidarHoras(decimal horas)
        => Exigir(horas is >= 0 and <= MaxHorasSemanales, $"Las horas semanales deben estar entre 0 y {MaxHorasSemanales}. Ejemplo: 8");

    public Task<IReadOnlyList<VoluntarioDto>> ListarAsync(string? buscar, bool soloActivos, int pagina, int porPagina, CancellationToken ct = default)
        => repo.ListarAsync(buscar, soloActivos, Math.Max(pagina, 1), Math.Clamp(porPagina, 1, 500), ct);

    public Task<StatsVoluntariosDto> StatsAsync(CancellationToken ct = default)
        => repo.StatsAsync(ct);

    public Task<VoluntarioDto?> ObtenerAsync(Guid id, CancellationToken ct = default)
        => repo.ObtenerAsync(id, ct);

    public Task<VoluntarioDto> CrearAsync(CrearVoluntarioDto dto, CancellationToken ct = default)
        => repo.CrearAsync(dto, ct);

    public Task<VoluntarioDto?> ActualizarAsync(Guid id, CrearVoluntarioDto dto, CancellationToken ct = default)
        => repo.ActualizarAsync(id, dto, ct);

    public Task<bool?> ToggleAsync(Guid id, CancellationToken ct = default)
        => repo.ToggleAsync(id, ct);

    public Task<bool> EliminarAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarAsync(id, ct);

    public Task<IReadOnlyList<AsignacionVolDto>> ListarAsignacionesAsync(Guid voluntarioId, CancellationToken ct = default)
        => repo.ListarAsignacionesAsync(voluntarioId, ct);

    public Task<AsignacionVolDto> AgregarAsignacionAsync(Guid voluntarioId, CrearAsignacionVolDto dto, CancellationToken ct = default)
    {
        ValidarHoras(dto.HorasSemanales);
        return repo.AgregarAsignacionAsync(voluntarioId, dto, ct);
    }

    public Task<AsignacionVolDto?> EditarAsignacionAsync(Guid asigId, EditarAsignacionVolDto dto, CancellationToken ct = default)
    {
        ValidarHoras(dto.HorasSemanales);
        return repo.EditarAsignacionAsync(asigId, dto, ct);
    }

    public Task<bool> EliminarAsignacionAsync(Guid asigId, CancellationToken ct = default)
        => repo.EliminarAsignacionAsync(asigId, ct);

    /// <summary>
    /// ¿Hay otro registro con ese número de documento? Compara sin puntos, espacios, guiones
    /// ni mayúsculas ("1.144.123.456" = "1144123456"). Al editar se pasa el id propio en
    /// <paramref name="excluirId"/>. Número vacío → null (sin consultar la BD).
    /// </summary>
    public Task<PersonaConDocumento?> BuscarDocumentoAsync(string? numero, Guid? excluirId, CancellationToken ct = default)
    {
        var normalizado = DocumentoIdentidad.Normalizar(numero);
        return normalizado.Length == 0
            ? Task.FromResult<PersonaConDocumento?>(null)
            : repo.BuscarDocumentoAsync(normalizado, excluirId, ct);
    }
}
