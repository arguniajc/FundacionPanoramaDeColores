using FundacionPanorama.Application.Features.Sedes.DTOs;

namespace FundacionPanorama.Application.Features.Sedes.Interfaces;

public interface ISedesRepository
{
    // Sedes
    Task<List<SedeDto>> ListarAsync(bool soloActivas, CancellationToken ct);
    /// <summary>Sede con sus programas; null si no existe.</summary>
    Task<SedeDto?>      ObtenerAsync(Guid id, CancellationToken ct);
    Task<Guid>          CrearAsync(CrearSedeDto dto, CancellationToken ct);
    /// <summary>Filas afectadas.</summary>
    Task<int>           ActualizarAsync(Guid id, CrearSedeDto dto, CancellationToken ct);
    Task<int>           ToggleAsync(Guid id, CancellationToken ct);
    Task<int>           EliminarAsync(Guid id, CancellationToken ct);

    // Programas
    Task<bool>              ExisteSedeAsync(Guid id, CancellationToken ct);
    Task<ProgramaDto?>      ObtenerProgramaAsync(Guid id, CancellationToken ct);
    Task<List<ProgramaDto>> ListarProgramasAsync(Guid sedeId, CancellationToken ct);
    Task<Guid>              CrearProgramaAsync(CrearProgramaDto dto, CancellationToken ct);
    Task<int>               ActualizarProgramaAsync(Guid id, CrearProgramaDto dto, CancellationToken ct);
    Task<int>               ToggleProgramaAsync(Guid id, CancellationToken ct);
    Task<int>               EliminarProgramaAsync(Guid id, CancellationToken ct);
    /// <summary>Null si no hay fila en configuracion.</summary>
    Task<RepLegalConfig?>   ObtenerRepLegalConfigAsync(CancellationToken ct);
    Task<int>               AutorizarRepAsync(Guid id, RepLegalConfig rep, CancellationToken ct);
    Task<int>               RevocarRepAsync(Guid id, CancellationToken ct);

    // Campos dinámicos
    Task<List<CampoDto>> ListarCamposAsync(Guid programaId, CancellationToken ct);
    Task<bool>           ExisteProgramaAsync(Guid id, CancellationToken ct);
    Task<CampoDto>       CrearCampoAsync(Guid programaId, CrearCampoDto dto, CancellationToken ct);
    /// <summary>Null si el campo no existe en ese programa.</summary>
    Task<CampoDto?>      ActualizarCampoAsync(Guid programaId, Guid campoId, CrearCampoDto dto, CancellationToken ct);
    Task<int>            EliminarCampoAsync(Guid programaId, Guid campoId, CancellationToken ct);
}
