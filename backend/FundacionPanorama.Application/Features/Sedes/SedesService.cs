// Reglas del módulo Sedes y Programas: sedes, programas (con autorización del
// representante legal) y campos dinámicos del formulario de inscripción.
using FundacionPanorama.Application.Features.Sedes.DTOs;
using FundacionPanorama.Application.Features.Sedes.Interfaces;

namespace FundacionPanorama.Application.Features.Sedes;

public class SedesService(ISedesRepository repo)
{
    // ── Sedes ─────────────────────────────────────────────────────────────────

    public Task<List<SedeDto>> ListarAsync(bool soloActivas, CancellationToken ct = default)
        => repo.ListarAsync(soloActivas, ct);

    public Task<SedeDto?> ObtenerAsync(Guid id, CancellationToken ct = default)
        => repo.ObtenerAsync(id, ct);

    /// <summary>Crea la sede y la devuelve recargada (con su id).</summary>
    public async Task<(Guid Id, SedeDto? Sede)> CrearAsync(CrearSedeDto dto, CancellationToken ct = default)
    {
        var newId = await repo.CrearAsync(dto, ct);
        return (newId, await repo.ObtenerAsync(newId, ct));
    }

    public async Task<ResultadoSede<SedeDto>> ActualizarAsync(Guid id, CrearSedeDto dto, CancellationToken ct = default)
    {
        if (await repo.ActualizarAsync(id, dto, ct) == 0) return ResultadoSede<SedeDto>.NoEncontrado();
        return ResultadoSede<SedeDto>.Ok(await repo.ObtenerAsync(id, ct));
    }

    public async Task<ResultadoSede<SedeDto>> ToggleAsync(Guid id, CancellationToken ct = default)
    {
        if (await repo.ToggleAsync(id, ct) == 0) return ResultadoSede<SedeDto>.NoEncontrado();
        return ResultadoSede<SedeDto>.Ok(await repo.ObtenerAsync(id, ct));
    }

    /// <summary>False si la sede no existe.</summary>
    public async Task<bool> EliminarAsync(Guid id, CancellationToken ct = default)
        => await repo.EliminarAsync(id, ct) > 0;

    // ── Programas ─────────────────────────────────────────────────────────────

    public Task<ProgramaDto?> ObtenerProgramaAsync(Guid id, CancellationToken ct = default)
        => repo.ObtenerProgramaAsync(id, ct);

    public Task<List<ProgramaDto>> ListarProgramasAsync(Guid sedeId, CancellationToken ct = default)
        => repo.ListarProgramasAsync(sedeId, ct);

    public async Task<ResultadoSede<ProgramaDto>> CrearProgramaAsync(CrearProgramaDto dto, CancellationToken ct = default)
    {
        if (!await repo.ExisteSedeAsync(dto.SedeId, ct))
            return ResultadoSede<ProgramaDto>.Invalido("Sede no encontrada.");
        var newId = await repo.CrearProgramaAsync(dto, ct);
        return ResultadoSede<ProgramaDto>.Ok(await ProgramaExistenteAsync(newId, ct));
    }

    public async Task<ResultadoSede<ProgramaDto>> ActualizarProgramaAsync(Guid id, CrearProgramaDto dto, CancellationToken ct = default)
    {
        if (await repo.ActualizarProgramaAsync(id, dto, ct) == 0) return ResultadoSede<ProgramaDto>.NoEncontrado();
        return await ReleerProgramaAsync(id, ct);
    }

    public async Task<ResultadoSede<ProgramaDto>> ToggleProgramaAsync(Guid id, CancellationToken ct = default)
    {
        if (await repo.ToggleProgramaAsync(id, ct) == 0) return ResultadoSede<ProgramaDto>.NoEncontrado();
        return ResultadoSede<ProgramaDto>.Ok(await ProgramaExistenteAsync(id, ct));
    }

    public async Task<bool> EliminarProgramaAsync(Guid id, CancellationToken ct = default)
        => await repo.EliminarProgramaAsync(id, ct) > 0;

    // Copia los datos del representante legal de configuracion al programa.
    public async Task<ResultadoSede<ProgramaDto>> AutorizarRepLegalAsync(Guid id, CancellationToken ct = default)
    {
        var rep = await repo.ObtenerRepLegalConfigAsync(ct);
        if (rep is null)
            return ResultadoSede<ProgramaDto>.Invalido("No hay configuración de representante legal guardada. Ve a Configuración y completa los datos.");
        // Antes se autorizaba "en blanco" si la configuración existía pero sin datos del representante
        if (string.IsNullOrWhiteSpace(rep.Nombre) || string.IsNullOrWhiteSpace(rep.Documento))
            return ResultadoSede<ProgramaDto>.Invalido("Completa el nombre y el documento del representante legal en Configuración antes de autorizar.");
        if (await repo.AutorizarRepAsync(id, rep, ct) == 0) return ResultadoSede<ProgramaDto>.NoEncontrado();
        return await ReleerProgramaAsync(id, ct);
    }

    public async Task<ResultadoSede<ProgramaDto>> RevocarRepLegalAsync(Guid id, CancellationToken ct = default)
    {
        if (await repo.RevocarRepAsync(id, ct) == 0) return ResultadoSede<ProgramaDto>.NoEncontrado();
        return await ReleerProgramaAsync(id, ct);
    }

    private async Task<ResultadoSede<ProgramaDto>> ReleerProgramaAsync(Guid id, CancellationToken ct)
    {
        var p = await repo.ObtenerProgramaAsync(id, ct);
        return p is null ? ResultadoSede<ProgramaDto>.NoEncontrado() : ResultadoSede<ProgramaDto>.Ok(p);
    }

    // El programa se acaba de crear/modificar: si no aparece, falla igual que antes (500).
    private async Task<ProgramaDto> ProgramaExistenteAsync(Guid id, CancellationToken ct)
        => await repo.ObtenerProgramaAsync(id, ct)
           ?? throw new InvalidOperationException("No row is available");

    // ── Campos dinámicos ──────────────────────────────────────────────────────

    public Task<List<CampoDto>> ListarCamposAsync(Guid programaId, CancellationToken ct = default)
        => repo.ListarCamposAsync(programaId, ct);

    public async Task<ResultadoSede<CampoDto>> CrearCampoAsync(Guid programaId, CrearCampoDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Seccion))
            return ResultadoSede<CampoDto>.Invalido("La sección del campo es obligatoria.");
        if (!await repo.ExisteProgramaAsync(programaId, ct))
            return ResultadoSede<CampoDto>.NoEncontrado("Programa no encontrado.");
        return ResultadoSede<CampoDto>.Ok(await repo.CrearCampoAsync(programaId, dto, ct));
    }

    public async Task<ResultadoSede<CampoDto>> ActualizarCampoAsync(Guid programaId, Guid campoId, CrearCampoDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Seccion))
            return ResultadoSede<CampoDto>.Invalido("La sección del campo es obligatoria.");
        var campo = await repo.ActualizarCampoAsync(programaId, campoId, dto, ct);
        return campo is null ? ResultadoSede<CampoDto>.NoEncontrado() : ResultadoSede<CampoDto>.Ok(campo);
    }

    public async Task<bool> EliminarCampoAsync(Guid programaId, Guid campoId, CancellationToken ct = default)
        => await repo.EliminarCampoAsync(programaId, campoId, ct) > 0;
}
