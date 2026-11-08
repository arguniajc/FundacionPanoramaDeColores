using FundacionPanorama.Application.Features.Nomina.DTOs;
using FundacionPanorama.Application.Features.Nomina.Interfaces;
using FundacionPanorama.Domain.Shared;

namespace FundacionPanorama.Application.Features.Nomina;

/// <summary>
/// Nómina. Un período "cerrado" ya se pagó: no se vuelve a liquidar. Un dato inválido
/// lanza DatoInvalidoException, que la API responde como 400 con el mensaje.
/// </summary>
public class NominaService(INominaRepository repo)
{
    const string Borrador = "borrador";

    static void Exigir(bool condicion, string mensaje)
    {
        if (!condicion) throw new DatoInvalidoException(mensaje);
    }

    /// <summary>El período debe existir y seguir en borrador para poder liquidar.</summary>
    async Task PeriodoEditable(int periodoId, CancellationToken ct, string mensajeCerrado = CerradoLiquidar)
    {
        var periodo = await repo.ObtenerPeriodoAsync(periodoId, ct);
        Exigir(periodo is not null, "El período de nómina no existe.");
        Exigir(periodo!.Estado == Borrador, mensajeCerrado);
    }

    const string CerradoLiquidar = "Este período ya está cerrado: no se puede volver a liquidar.";
    const string CerradoEditar   = "Este período ya está cerrado: sus liquidaciones no se pueden editar.";

    public Task<IReadOnlyList<NominaPeriodoDto>> ListarPeriodosAsync(int? anio, CancellationToken ct = default)
        => repo.ListarPeriodosAsync(anio, ct);

    public Task<NominaPeriodoDto?> ObtenerPeriodoAsync(int id, CancellationToken ct = default)
        => repo.ObtenerPeriodoAsync(id, ct);

    public async Task<NominaPeriodoDto> CrearPeriodoAsync(CrearPeriodoDto dto, CancellationToken ct = default)
    {
        var anioActual = DateTime.UtcNow.AddHours(-5).Year;
        Exigir(dto.Mes is >= 1 and <= 12, "El mes debe estar entre 1 y 12.");
        // La tabla tiene CHECK (anio >= 2020)
        Exigir(dto.Anio >= 2020 && dto.Anio <= anioActual + 1, $"El año debe estar entre 2020 y {anioActual + 1}.");
        Exigir(dto.Observacion is null or { Length: <= 500 }, "La observación no puede superar 500 caracteres.");
        var existe = (await repo.ListarPeriodosAsync(dto.Anio, ct)).Any(p => p.Mes == dto.Mes);
        Exigir(!existe, "Ya existe la nómina de ese mes. Ábrela en lugar de crear otra.");
        return await repo.CrearPeriodoAsync(dto, ct);
    }

    public Task<bool> CerrarPeriodoAsync(int id, CancellationToken ct = default)
        => repo.CerrarPeriodoAsync(id, ct);

    public Task<bool> EliminarPeriodoAsync(int id, CancellationToken ct = default)
        => repo.EliminarPeriodoAsync(id, ct);

    public Task<IReadOnlyList<NominaLiquidacionDto>> ListarLiquidacionesAsync(int periodoId, CancellationToken ct = default)
        => repo.ListarLiquidacionesAsync(periodoId, ct);

    public async Task<IReadOnlyList<NominaLiquidacionDto>> AutoLiquidarAsync(int periodoId, AutoLiquidarDto dto, CancellationToken ct = default)
    {
        await PeriodoEditable(periodoId, ct);
        return await repo.AutoLiquidarAsync(periodoId, dto, ct);
    }

    /// <summary>Reglas de una liquidación manual (mes laboral de 30 días, sin valores negativos).</summary>
    public static string? ValidarLiquidacion(LiquidarEmpleadoDto dto)
    {
        if (dto.EmpleadoId == Guid.Empty) return "Selecciona el empleado.";
        if (dto.DiasTrabajados is < 0 or > 30) return "Los días trabajados deben estar entre 0 y 30.";
        if (dto.SalarioOverride is <= 0) return "El salario debe ser mayor que cero.";
        if (dto.HorasExtras < 0 || dto.Bonificaciones < 0 || dto.RetencionFuente < 0 || dto.OtrasDeducciones < 0)
            return "Horas extras, bonificaciones, retención y deducciones no pueden ser negativas.";
        if (dto.Observacion is { Length: > 500 }) return "La observación no puede superar 500 caracteres.";
        return null;
    }

    public async Task<NominaLiquidacionDto> LiquidarEmpleadoAsync(int periodoId, LiquidarEmpleadoDto dto, CancellationToken ct = default)
    {
        if (ValidarLiquidacion(dto) is { } error) throw new DatoInvalidoException(error);
        await PeriodoEditable(periodoId, ct);
        return await repo.LiquidarEmpleadoAsync(periodoId, dto, ct);
    }

    /// <summary>
    /// Edita una liquidación (mismo empleado) con las mismas reglas que al liquidar; los
    /// totales se recalculan en el repositorio igual que en LiquidarEmpleadoAsync.
    /// Devuelve null si la liquidación no existe.
    /// </summary>
    public async Task<NominaLiquidacionDto?> EditarLiquidacionAsync(int id, EditarLiquidacionDto dto, CancellationToken ct = default)
    {
        var actual = await repo.ObtenerLiquidacionAsync(id, ct);
        if (actual is null) return null;

        var datos = new LiquidarEmpleadoDto(actual.EmpleadoId, dto.DiasTrabajados, dto.SalarioOverride,
            dto.HorasExtras, dto.Bonificaciones, dto.RetencionFuente, dto.OtrasDeducciones, dto.Observacion);
        if (ValidarLiquidacion(datos) is { } error) throw new DatoInvalidoException(error);
        await PeriodoEditable(actual.PeriodoId, ct, CerradoEditar);

        // El UPDATE vuelve a exigir el borrador (por si el período se cerró entre la consulta y el guardado)
        var editada = await repo.ActualizarLiquidacionAsync(id, datos, ct);
        Exigir(editada is not null, CerradoEditar);
        return editada;
    }

    public Task<bool> EliminarLiquidacionAsync(int id, CancellationToken ct = default)
        => repo.EliminarLiquidacionAsync(id, ct);
}
