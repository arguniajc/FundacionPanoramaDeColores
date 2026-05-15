namespace FundacionPanorama.Application.Features.Organigrama;

public sealed class OrganigramaService(IOrganigramaRepository repo)
{
    public Task<IReadOnlyList<OrganigramaPersonaDto>> ListarAsync(CancellationToken ct = default)
        => repo.ListarAsync(ct);

    public Task<OrganigramaPersonaDto?> ObtenerAsync(Guid id, CancellationToken ct = default)
        => repo.ObtenerAsync(id, ct);

    public Task<OrganigramaPersonaDto> CrearAsync(CrearOrganigramaPersonaDto dto, CancellationToken ct = default)
        => repo.CrearAsync(dto, ct);

    public Task<OrganigramaPersonaDto?> ActualizarAsync(Guid id, ActualizarOrganigramaPersonaDto dto, CancellationToken ct = default)
        => repo.ActualizarAsync(id, dto, ct);

    public Task<bool> EliminarAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarAsync(id, ct);
}
