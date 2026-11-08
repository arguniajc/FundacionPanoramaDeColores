using FundacionPanorama.Application.Features.TalentoHumano.DTOs;
using FundacionPanorama.Application.Features.TalentoHumano.Interfaces;
using static FundacionPanorama.Application.Shared.Validar;

namespace FundacionPanorama.Application.Features.TalentoHumano;

/// <summary>
/// Empleados y novedades. Los datos se validan antes de tocar la BD; un dato inválido lanza
/// DatoInvalidoException, que la API responde como 400 con el mensaje.
/// </summary>
public class TalentoHumanoService(ITalentoHumanoRepository repo)
{
    /// <summary>Valores del panel (PanelNovedades.jsx).</summary>
    public static readonly string[] TiposNovedad   = ["vacaciones", "incapacidad", "permiso_remunerado", "permiso_no_remunerado", "comision", "otro"];
    public static readonly string[] EstadosNovedad = ["pendiente", "aprobada", "rechazada"];

    // Límites = columnas de empleados. Donde el esquema base (BD nueva) y las migraciones
    // difieren se usa el menor: numero_documento 30, email 150, telefono 20.
    const decimal SalarioMaximo = 999_999_999_999.99m; // NUMERIC(14,2)

    public Task<IReadOnlyList<EmpleadoResumenDto>> ListarAsync(bool? activo, Guid? sedeId, string? area, CancellationToken ct = default)
        => repo.ListarAsync(activo, sedeId, area, ct);

    public Task<EmpleadoDto?> ObtenerAsync(Guid id, CancellationToken ct = default)
        => repo.ObtenerAsync(id, ct);

    static void ValidarEmpleado(string? nombres, string? apellidos, string? tipoDocumento, string? numeroDocumento,
        string? email, string? telefono, string? celular, string? cargo, string? area, string? tipoContrato,
        DateOnly? fechaIngreso, DateOnly? fechaFinContrato, decimal? salario, string? eps, string? pension)
    {
        Obligatorio(nombres, "Los nombres son obligatorios. Ejemplo: María José");
        Largo(nombres, 200, "Los nombres");
        Obligatorio(apellidos, "Los apellidos son obligatorios. Ejemplo: Rodríguez Pérez");
        Largo(apellidos, 200, "Los apellidos");
        Largo(tipoDocumento, 20, "El tipo de documento");
        Largo(numeroDocumento, 30, "El número de documento");
        Correo(email, 150, "El email", "maria.rodriguez@correo.com");
        Largo(telefono, 20, "El teléfono");
        Largo(celular, 30, "El celular");
        Largo(cargo, 100, "El cargo");
        Largo(area, 100, "El área");
        Largo(tipoContrato, 50, "El tipo de contrato");
        Largo(eps, 100, "La EPS");
        Largo(pension, 100, "El fondo de pensión");
        Exigir(fechaIngreso is null || fechaIngreso.Value.Year is >= 1950 and <= 2100, "La fecha de ingreso no es válida. Ejemplo: 2025-02-01");
        Exigir(fechaFinContrato is null || fechaIngreso is null || fechaFinContrato >= fechaIngreso,
            "La fecha de fin de contrato no puede ser anterior a la fecha de ingreso.");
        Exigir(salario is null or >= 0, "El salario no puede ser negativo. Ejemplo: 1423500");
        Exigir(salario is null || salario <= SalarioMaximo, "El salario es demasiado grande. Revisa el valor.");
    }

    public Task<EmpleadoDto> CrearAsync(CrearEmpleadoDto dto, CancellationToken ct = default)
    {
        ValidarEmpleado(dto.Nombres, dto.Apellidos, dto.TipoDocumento, dto.NumeroDocumento, dto.Email, dto.Telefono,
            dto.Celular, dto.Cargo, dto.Area, dto.TipoContrato, dto.FechaIngreso, dto.FechaFinContrato, dto.Salario,
            dto.Eps, dto.Pension);
        return repo.CrearAsync(dto, ct);
    }

    public Task<EmpleadoDto?> ActualizarAsync(Guid id, ActualizarEmpleadoDto dto, CancellationToken ct = default)
    {
        ValidarEmpleado(dto.Nombres, dto.Apellidos, dto.TipoDocumento, dto.NumeroDocumento, dto.Email, dto.Telefono,
            dto.Celular, dto.Cargo, dto.Area, dto.TipoContrato, dto.FechaIngreso, dto.FechaFinContrato, dto.Salario,
            dto.Eps, dto.Pension);
        return repo.ActualizarAsync(id, dto, ct);
    }

    public Task<bool> EliminarAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarAsync(id, ct);

    // ── Novedades ─────────────────────────────────────────────────────────────

    public Task<IReadOnlyList<NovedadDto>> ListarNovedadesAsync(Guid empleadoId, CancellationToken ct = default)
        => repo.ListarNovedadesAsync(empleadoId, ct);

    public Task<IReadOnlyList<NovedadDto>> ListarTodasNovedadesAsync(string? estado, CancellationToken ct = default)
        => repo.ListarTodasNovedadesAsync(estado, ct);

    static void ValidarNovedad(string? tipo, DateOnly fechaInicio, DateOnly? fechaFin, int? dias)
    {
        EnLista(tipo, TiposNovedad,
            "El tipo de novedad no es válido (vacaciones, incapacidad, permiso remunerado, permiso no remunerado, comisión u otro).");
        Exigir(fechaInicio.Year is >= 2000 and <= 2100, "La fecha de inicio no es válida. Ejemplo: 2025-07-01");
        Exigir(fechaFin is null || fechaFin >= fechaInicio, "La fecha fin no puede ser anterior a la fecha de inicio.");
        Exigir(dias is null or >= 0 and <= 366, "Los días deben estar entre 0 y 366. Ejemplo: 15");
    }

    public async Task<NovedadDto> CrearNovedadAsync(Guid empleadoId, CrearNovedadDto dto, CancellationToken ct = default)
    {
        ValidarNovedad(dto.Tipo, dto.FechaInicio, dto.FechaFin, dto.Dias);
        Exigir(await repo.ObtenerAsync(empleadoId, ct) is not null, "El empleado no existe. Recarga la página.");
        return await repo.CrearNovedadAsync(empleadoId, dto with { Tipo = dto.Tipo.Trim() }, ct);
    }

    public Task<NovedadDto?> ActualizarNovedadAsync(Guid id, ActualizarNovedadDto dto, CancellationToken ct = default)
    {
        ValidarNovedad(dto.Tipo, dto.FechaInicio, dto.FechaFin, dto.Dias);
        EnLista(dto.Estado, EstadosNovedad, "El estado de la novedad no es válido (pendiente, aprobada o rechazada).");
        return repo.ActualizarNovedadAsync(id, dto with { Tipo = dto.Tipo.Trim(), Estado = dto.Estado.Trim() }, ct);
    }

    public Task<bool> EliminarNovedadAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarNovedadAsync(id, ct);

    public Task<TalentoHumanoStatsDto> StatsAsync(CancellationToken ct = default)
        => repo.StatsAsync(ct);
}
