namespace FundacionPanorama.Application.Features.Organigrama;

public interface IOrganigramaRepository
{
    Task<IReadOnlyList<OrganigramaPersonaDto>> ListarAsync(CancellationToken ct = default);
    Task<OrganigramaPersonaDto?>               ObtenerAsync(Guid id, CancellationToken ct = default);
    Task<OrganigramaPersonaDto>                CrearAsync(CrearOrganigramaPersonaDto dto, CancellationToken ct = default);
    Task<OrganigramaPersonaDto?>               ActualizarAsync(Guid id, ActualizarOrganigramaPersonaDto dto, CancellationToken ct = default);
    Task<bool>                                 EliminarAsync(Guid id, CancellationToken ct = default);
}
