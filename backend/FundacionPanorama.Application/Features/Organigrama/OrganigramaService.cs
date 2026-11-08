using static FundacionPanorama.Application.Shared.Validar;

namespace FundacionPanorama.Application.Features.Organigrama;

/// <summary>
/// Organigrama. Se valida antes de tocar la BD: cargo (VARCHAR(200)), nombre externo
/// (VARCHAR(200)), empleado existente y que el jefe (ParentId) no cree un ciclo.
/// Un dato inválido lanza DatoInvalidoException (400 con el mensaje).
/// </summary>
public sealed class OrganigramaService(IOrganigramaRepository repo)
{
    const int MaxCargo  = 200;
    const int MaxNombre = 200;

    public Task<IReadOnlyList<OrganigramaPersonaDto>> ListarAsync(CancellationToken ct = default)
        => repo.ListarAsync(ct);

    public Task<OrganigramaPersonaDto?> ObtenerAsync(Guid id, CancellationToken ct = default)
        => repo.ObtenerAsync(id, ct);

    public async Task<OrganigramaPersonaDto> CrearAsync(CrearOrganigramaPersonaDto dto, CancellationToken ct = default)
    {
        Obligatorio(dto.Cargo, "El cargo es obligatorio. Ejemplo: Coordinadora de programas");
        Largo(dto.Cargo, MaxCargo, "El cargo");
        Largo(dto.NombreExterno, MaxNombre, "El nombre");
        await ValidarEmpleado(dto.EmpleadoId, ct);
        if (dto.ParentId is { } parentId)
            await ValidarJefe(null, parentId, ct);
        return await repo.CrearAsync(dto, ct);
    }

    public async Task<OrganigramaPersonaDto?> ActualizarAsync(Guid id, ActualizarOrganigramaPersonaDto dto, CancellationToken ct = default)
    {
        // Cargo vacío = no se cambia (así lo interpreta el repositorio)
        Largo(dto.Cargo, MaxCargo, "El cargo");
        Largo(dto.NombreExterno, MaxNombre, "El nombre");
        await ValidarEmpleado(dto.EmpleadoId, ct);
        if (dto.ParentId is { } parentId)
            await ValidarJefe(id, parentId, ct);
        return await repo.ActualizarAsync(id, dto, ct);
    }

    public Task<bool> EliminarAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarAsync(id, ct);

    /// <summary>Guid.Empty significa "quitar el empleado" (lo usa el repositorio).</summary>
    async Task ValidarEmpleado(Guid? empleadoId, CancellationToken ct)
    {
        if (empleadoId is not { } eid || eid == Guid.Empty) return;
        Exigir(await repo.ExisteEmpleadoAsync(eid, ct), "El empleado seleccionado no existe. Recarga la página y elígelo de nuevo.");
    }

    /// <summary>
    /// El jefe debe existir (activo) y no puede ser el mismo nodo ni uno de sus descendientes:
    /// eso dejaría una rama colgando en un ciclo que el organigrama no puede dibujar.
    /// </summary>
    async Task ValidarJefe(Guid? id, Guid parentId, CancellationToken ct)
    {
        Exigir(id != parentId, "Una persona no puede ser su propio jefe en el organigrama.");
        var nodos = await repo.ListarAsync(ct);
        var porId = nodos.ToDictionary(n => n.Id);
        Exigir(porId.ContainsKey(parentId), "El cargo superior seleccionado no existe. Recarga la página y elígelo de nuevo.");
        if (id is null) return;

        // Subir desde el nuevo jefe hasta la raíz: si aparece el propio nodo, sería un ciclo
        var visitados = new HashSet<Guid>();
        for (Guid? actual = parentId; actual is { } a && porId.TryGetValue(a, out var nodo); actual = nodo.ParentId)
        {
            Exigir(a != id, "No se puede poner a esta persona bajo alguien que depende de ella en el organigrama.");
            if (!visitados.Add(a)) break; // ciclo previo en los datos: no seguir
        }
    }
}
