using FundacionPanorama.Application.Features.Correos.DTOs;

namespace FundacionPanorama.Application.Features.Correos.Interfaces;

/// <summary>Cola persistente de correos (tabla cola_correos) y estado del resumen diario.</summary>
public interface IColaCorreosRepository
{
    /// <summary>Inserta los correos en estado pendiente, listos para el próximo ciclo.</summary>
    Task EncolarAsync(IEnumerable<CorreoNuevo> correos, CancellationToken ct = default);

    /// <summary>
    /// Toma hasta <paramref name="maximo"/> correos pendientes cuyo próximo intento ya llegó y que
    /// nadie tiene tomados (FOR UPDATE SKIP LOCKED). Les suma un intento y los reserva durante
    /// <paramref name="reserva"/>: si el proceso muere a mitad del envío, se retoman al vencer.
    /// </summary>
    Task<IReadOnlyList<CorreoEnCola>> TomarPendientesAsync(int maximo, TimeSpan reserva, CancellationToken ct = default);

    /// <summary>Marca el correo como enviado (solo si sigue pendiente).</summary>
    Task MarcarEnviadoAsync(Guid id, CancellationToken ct = default);

    /// <summary>Lo deja pendiente con el próximo intento dentro de <paramref name="espera"/>.</summary>
    Task ReprogramarAsync(Guid id, TimeSpan espera, string tipoError, CancellationToken ct = default);

    /// <summary>Lo marca como fallido definitivo (agotó los intentos).</summary>
    Task MarcarFallidoAsync(Guid id, string tipoError, CancellationToken ct = default);

    /// <summary>Borra enviados y fallidos más antiguos que las antigüedades dadas. Devuelve cuántos borró.</summary>
    Task<int> LimpiarAsync(TimeSpan antiguedadEnviados, TimeSpan antiguedadFallidos, CancellationToken ct = default);

    /// <summary>Usuarios activos con correo (para avisos internos y el resumen diario).</summary>
    Task<IReadOnlyList<UsuarioDestinatario>> ObtenerUsuariosActivosAsync(CancellationToken ct = default);

    Task<ResumenDiarioConfigDto> ObtenerResumenDiarioAsync(CancellationToken ct = default);

    Task<ResumenDiarioConfigDto> GuardarResumenDiarioAsync(GuardarResumenDiarioDto dto, CancellationToken ct = default);

    /// <summary>
    /// En una sola transacción: marca <paramref name="dia"/> como procesado (solo si el resumen está
    /// activo y ese día aún no se había procesado) y encola los correos. Devuelve false si otro
    /// ciclo ya lo había hecho: así, aunque el servidor se reinicie, sale como máximo uno por día.
    /// </summary>
    Task<bool> EncolarResumenDelDiaAsync(DateOnly dia, IEnumerable<CorreoNuevo> correos, CancellationToken ct = default);
}
