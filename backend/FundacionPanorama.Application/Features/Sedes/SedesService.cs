// Reglas del módulo Sedes y Programas: sedes, programas (con autorización del
// representante legal) y campos dinámicos del formulario de inscripción.
using FundacionPanorama.Application.Features.Sedes.DTOs;
using FundacionPanorama.Application.Features.Sedes.Interfaces;
using static FundacionPanorama.Application.Shared.Validar;

namespace FundacionPanorama.Application.Features.Sedes;

public class SedesService(ISedesRepository repo)
{
    /// <summary>Tipos de campo del editor del panel (programas/helpers.js TIPOS_CAMPO, más "firma").</summary>
    public static readonly string[] TiposCampo =
    [
        "text", "number", "date", "daterange", "boolean", "select", "document",
        "documento_id", "tipo_documento", "email", "telefono",
        "pais", "departamento", "ciudad",
        "genero", "tipo_sangre", "estrato", "nivel_educativo", "autoidentificacion",
        "peso", "talla", "altura", "talla_ropa", "talla_pantalon", "talla_zapatos",
        "grado_escolar", "edad", "fecha_nac", "valoracion",
        "datos_padre", "datos_madre", "datos_tutor", "firma",
    ];

    // Columnas: sedes.nombre VARCHAR(150), direccion 300, ciudad 100, telefono 30;
    // programas.nombre VARCHAR(150), nombre_tercero 200, tercero_rep_* (200/20/50/100);
    // programas_campos.etiqueta VARCHAR(100), seccion VARCHAR(100).
    static void ValidarSede(CrearSedeDto dto)
    {
        Obligatorio(dto.Nombre, "El nombre de la sede es obligatorio. Ejemplo: Sede Principal");
        Largo(dto.Nombre, 150, "El nombre de la sede");
        Largo(dto.Direccion, 300, "La dirección");
        Largo(dto.Ciudad, 100, "La ciudad");
        Largo(dto.Telefono, 30, "El teléfono");
    }

    static void ValidarPrograma(CrearProgramaDto dto)
    {
        Exigir(dto.SedeId != Guid.Empty, "Selecciona la sede del programa. Ejemplo: Sede Principal");
        Obligatorio(dto.Nombre, "El nombre del programa es obligatorio. Ejemplo: Escuela de fútbol");
        Largo(dto.Nombre, 150, "El nombre del programa");
        Largo(dto.Descripcion, 500, "La descripción");
        Exigir(dto.CupoMaximo is null or > 0, "El cupo máximo debe ser mayor que cero. Ejemplo: 30");
        Exigir(dto.CupoMaximo is null or <= 100_000, "El cupo máximo es demasiado grande. Ejemplo: 30");
        Largo(dto.NombreTercero, 200, "El nombre de la entidad ejecutora");
        Largo(dto.TerceroRepNombre, 200, "El nombre del representante");
        Largo(dto.TerceroRepTipoDoc, 20, "El tipo de documento del representante");
        Largo(dto.TerceroRepDocumento, 50, "El documento del representante");
        Largo(dto.TerceroRepCargo, 100, "El cargo del representante");
        ImagenBase64(dto.TerceroRepFirma, "La firma del representante");
    }

    static void ValidarCampo(CrearCampoDto dto)
    {
        Largo(dto.Seccion, 100, "La sección");
        Obligatorio(dto.Etiqueta, "La etiqueta del campo es obligatoria. Ejemplo: Talla de camiseta");
        Largo(dto.Etiqueta, 100, "La etiqueta del campo");
        Exigir(TiposCampo.Contains(dto.Tipo ?? ""), "El tipo de campo no es válido. Elígelo de la lista.");
        if (dto.Tipo == "select")
            Exigir((dto.Opciones ?? []).Count(o => !string.IsNullOrWhiteSpace(o)) >= 2,
                "Escribe al menos 2 opciones para la lista. Ejemplo: Talla S, Talla M, Talla L");
        Exigir(dto.Columnas is null or >= 1 and <= 12, "El ancho del campo debe estar entre 1 y 12 columnas (6 = media fila, 12 = fila completa).");
    }

    // ── Sedes ─────────────────────────────────────────────────────────────────

    public Task<List<SedeDto>> ListarAsync(bool soloActivas, CancellationToken ct = default)
        => repo.ListarAsync(soloActivas, ct);

    public Task<SedeDto?> ObtenerAsync(Guid id, CancellationToken ct = default)
        => repo.ObtenerAsync(id, ct);

    /// <summary>Crea la sede y la devuelve recargada (con su id).</summary>
    public async Task<(Guid Id, SedeDto? Sede)> CrearAsync(CrearSedeDto dto, CancellationToken ct = default)
    {
        ValidarSede(dto); // sin ResultadoSede: DatoInvalidoException → 400 por el manejador global
        var newId = await repo.CrearAsync(dto, ct);
        return (newId, await repo.ObtenerAsync(newId, ct));
    }

    public async Task<ResultadoSede<SedeDto>> ActualizarAsync(Guid id, CrearSedeDto dto, CancellationToken ct = default)
    {
        if (PrimerError(() => ValidarSede(dto)) is { } error) return ResultadoSede<SedeDto>.Invalido(error);
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
        if (PrimerError(() => ValidarPrograma(dto)) is { } error) return ResultadoSede<ProgramaDto>.Invalido(error);
        if (!await repo.ExisteSedeAsync(dto.SedeId, ct))
            return ResultadoSede<ProgramaDto>.Invalido("Sede no encontrada.");
        var newId = await repo.CrearProgramaAsync(dto, ct);
        return ResultadoSede<ProgramaDto>.Ok(await ProgramaExistenteAsync(newId, ct));
    }

    public async Task<ResultadoSede<ProgramaDto>> ActualizarProgramaAsync(Guid id, CrearProgramaDto dto, CancellationToken ct = default)
    {
        if (PrimerError(() => ValidarPrograma(dto)) is { } error) return ResultadoSede<ProgramaDto>.Invalido(error);
        if (!await repo.ExisteSedeAsync(dto.SedeId, ct))
            return ResultadoSede<ProgramaDto>.Invalido("Sede no encontrada.");
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
        if (PrimerError(() => ValidarCampo(dto)) is { } errorCampo) return ResultadoSede<CampoDto>.Invalido(errorCampo);
        if (!await repo.ExisteProgramaAsync(programaId, ct))
            return ResultadoSede<CampoDto>.NoEncontrado("Programa no encontrado.");
        return ResultadoSede<CampoDto>.Ok(await repo.CrearCampoAsync(programaId, dto, ct));
    }

    public async Task<ResultadoSede<CampoDto>> ActualizarCampoAsync(Guid programaId, Guid campoId, CrearCampoDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Seccion))
            return ResultadoSede<CampoDto>.Invalido("La sección del campo es obligatoria.");
        if (PrimerError(() => ValidarCampo(dto)) is { } errorCampo) return ResultadoSede<CampoDto>.Invalido(errorCampo);
        var campo = await repo.ActualizarCampoAsync(programaId, campoId, dto, ct);
        return campo is null ? ResultadoSede<CampoDto>.NoEncontrado() : ResultadoSede<CampoDto>.Ok(campo);
    }

    public async Task<bool> EliminarCampoAsync(Guid programaId, Guid campoId, CancellationToken ct = default)
        => await repo.EliminarCampoAsync(programaId, campoId, ct) > 0;
}
