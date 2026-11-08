using FundacionPanorama.Application.Features.Actividades.DTOs;
using FundacionPanorama.Application.Features.Actividades.Interfaces;
using static FundacionPanorama.Application.Shared.Validar;

namespace FundacionPanorama.Application.Features.Actividades;

/// <summary>
/// Actividades y horarios de programas. Los datos se validan antes de tocar la BD; un dato
/// inválido lanza DatoInvalidoException, que la API responde como 400 con el mensaje.
/// </summary>
public class ActividadesService(IActividadesRepository repo)
{
    /// <summary>Estados que usa el panel (y la auto-transición del repositorio).</summary>
    public static readonly string[] Estados = ["programada", "en_curso", "realizada", "cancelada"];

    // Columnas: actividades.titulo VARCHAR(200), lugar VARCHAR(200); programa_horarios.lugar VARCHAR(200)
    const int MaxTitulo = 200;
    const int MaxLugar  = 200;
    const int MaxDiasAdicionales = 366;

    public Task<IReadOnlyList<ActividadResumenDto>> ListarAsync(int? mes, int? anio, Guid? programaId, CancellationToken ct = default)
        => repo.ListarAsync(mes, anio, programaId, ct);

    public Task<ActividadDto?> ObtenerAsync(Guid id, CancellationToken ct = default)
        => repo.ObtenerAsync(id, ct);

    async Task ValidarActividad(string? titulo, Guid? programaId, DateTime fechaInicio, DateTime? fechaFin,
        string? lugar, List<CrearActividadDiaDto>? dias, CancellationToken ct)
    {
        Obligatorio(titulo, "El título es obligatorio. Ejemplo: Taller de pintura");
        Largo(titulo, MaxTitulo, "El título");
        Exigir(fechaInicio.Year is >= 2000 and <= 2100, "La fecha de inicio no es válida. Ejemplo: 2025-03-15 08:00");
        Exigir(fechaFin is null || fechaFin >= fechaInicio,
            "La fecha/hora de fin no puede ser anterior a la de inicio. Ejemplo: 08:00 – 10:00");
        Largo(lugar, MaxLugar, "El lugar");
        ValidarDias(dias);
        if (programaId is { } pid && pid != Guid.Empty)
            Exigir(await repo.ExisteProgramaAsync(pid, ct), "El programa seleccionado no existe. Recarga la página y elígelo de nuevo.");
    }

    static void ValidarDias(List<CrearActividadDiaDto>? dias)
    {
        if (dias is null) return;
        Exigir(dias.Count <= MaxDiasAdicionales, $"No se pueden agregar más de {MaxDiasAdicionales} días adicionales.");
        for (var i = 0; i < dias.Count; i++)
        {
            var d = dias[i];
            Exigir(d is not null && !string.IsNullOrWhiteSpace(d.Fecha) && !string.IsNullOrWhiteSpace(d.HoraInicio) && !string.IsNullOrWhiteSpace(d.HoraFin),
                $"El día adicional {i + 1} está incompleto: llena fecha, hora inicio y hora fin. Ejemplo: 2025-03-15, 08:00 – 10:00");
            FechaTexto(d!.Fecha, $"La fecha del día adicional {i + 1}");
            var hi = Hora(d.HoraInicio, $"La hora de inicio del día adicional {i + 1}");
            var hf = Hora(d.HoraFin, $"La hora de fin del día adicional {i + 1}", "10:00");
            Exigir(hf > hi, $"En el día adicional {i + 1}, la hora fin debe ser posterior a la hora inicio. Ejemplo: 08:00 – 10:00");
        }
    }

    public async Task<ActividadDto> CrearAsync(CrearActividadDto dto, CancellationToken ct = default)
    {
        await ValidarActividad(dto.Titulo, dto.ProgramaId, dto.FechaInicio, dto.FechaFin, dto.Lugar, dto.DiasAdicionales, ct);
        return await repo.CrearAsync(dto, ct);
    }

    public async Task<ActividadDto?> ActualizarAsync(Guid id, ActualizarActividadDto dto, CancellationToken ct = default)
    {
        EnLista(dto.Estado, Estados, "El estado no es válido (programada, en curso, realizada o cancelada).");
        await ValidarActividad(dto.Titulo, dto.ProgramaId, dto.FechaInicio, dto.FechaFin, dto.Lugar, dto.DiasAdicionales, ct);
        return await repo.ActualizarAsync(id, dto with { Estado = dto.Estado.Trim() }, ct);
    }

    public Task<bool> EliminarAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarAsync(id, ct);

    public Task<IReadOnlyList<AsistenciaItemDto>> ObtenerAsistenciaAsync(Guid actividadId, CancellationToken ct = default)
        => repo.ObtenerAsistenciaAsync(actividadId, ct);

    public async Task RegistrarAsistenciaAsync(Guid actividadId, RegistrarAsistenciaDto dto, CancellationToken ct = default)
    {
        Exigir(dto?.Asistencias is not null, "No se recibió la lista de asistencia.");
        var ids = dto!.Asistencias.Select(a => a.BeneficiarioId).Distinct().ToList();
        Exigir(!ids.Contains(Guid.Empty), "Hay un beneficiario sin identificar en la lista de asistencia. Recarga la página.");
        if (ids.Count > 0)
        {
            var faltan = await repo.BeneficiariosInexistentesAsync(ids, ct);
            Exigir(faltan.Count == 0,
                "Uno de los beneficiarios de la lista ya no existe. Recarga la página y vuelve a marcar la asistencia.");
        }
        await repo.RegistrarAsistenciaAsync(actividadId, dto, ct);
    }

    // ── Horarios ──────────────────────────────────────────────────────────────

    public Task<IReadOnlyList<HorarioDto>> ListarHorariosAsync(Guid? programaId, CancellationToken ct = default)
        => repo.ListarHorariosAsync(programaId, ct);

    /// <summary>DiaSemana sigue la convención de JavaScript (Date.getDay): 0 = domingo … 6 = sábado.</summary>
    async Task ValidarHorario(Guid programaId, int diaSemana, string? horaInicio, string? horaFin, string? lugar,
        string? inicioVigencia, string? finVigencia, CancellationToken ct)
    {
        Exigir(programaId != Guid.Empty, "Selecciona el programa. Ejemplo: Fútbol infantil");
        Exigir(diaSemana is >= 0 and <= 6, "El día de la semana no es válido (0 = domingo … 6 = sábado).");
        var hi = Hora(horaInicio, "La hora de inicio");
        var hf = Hora(horaFin, "La hora de fin", "10:00");
        Exigir(hf > hi, "La hora fin debe ser posterior a la hora inicio. Ejemplo: 08:00 – 10:00");
        Largo(lugar, MaxLugar, "El lugar");
        var desde = FechaTexto(inicioVigencia, "La fecha de inicio de vigencia", "2025-02-03");
        var hasta = FechaTexto(finVigencia, "La fecha de fin de vigencia", "2025-11-28");
        Exigir(desde is null || hasta is null || hasta >= desde,
            "La fecha de fin de vigencia no puede ser anterior a la de inicio.");
        Exigir(await repo.ExisteProgramaAsync(programaId, ct),
            "El programa seleccionado no existe. Recarga la página y elígelo de nuevo.");
    }

    public async Task<HorarioDto> CrearHorarioAsync(CrearHorarioDto dto, CancellationToken ct = default)
    {
        await ValidarHorario(dto.ProgramaId, dto.DiaSemana, dto.HoraInicio, dto.HoraFin, dto.Lugar,
            dto.FechaInicioVigencia, dto.FechaFinVigencia, ct);
        return await repo.CrearHorarioAsync(dto, ct);
    }

    public async Task<HorarioDto?> ActualizarHorarioAsync(Guid id, ActualizarHorarioDto dto, CancellationToken ct = default)
    {
        await ValidarHorario(dto.ProgramaId, dto.DiaSemana, dto.HoraInicio, dto.HoraFin, dto.Lugar,
            dto.FechaInicioVigencia, dto.FechaFinVigencia, ct);
        return await repo.ActualizarHorarioAsync(id, dto, ct);
    }

    public Task<bool> EliminarHorarioAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarHorarioAsync(id, ct);
}
