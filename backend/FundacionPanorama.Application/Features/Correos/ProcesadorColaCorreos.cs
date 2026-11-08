using FundacionPanorama.Application.Features.Configuracion.Interfaces;
using FundacionPanorama.Application.Features.Correos.Interfaces;

namespace FundacionPanorama.Application.Features.Correos;

/// <summary>Resultado de un ciclo de la cola.</summary>
public record ResultadoCiclo(bool SinSmtp, int Enviados, int Reprogramados, int Fallidos);

/// <summary>
/// Procesa un lote de la cola de correos: toma los pendientes (sin que otro ciclo los tome a la
/// vez), los envía y según el resultado los marca enviados, los reprograma con espera exponencial
/// o, al agotar <see cref="MaxIntentos"/>, los deja como fallidos.
/// </summary>
public class ProcesadorColaCorreos(IColaCorreosRepository cola, IEnviadorCorreo enviador, IConfiguracionRepository cfg)
{
    public const int MaxIntentos  = 5;
    public const int TamanoLote   = 20;
    /// <summary>Tiempo que un correo tomado queda reservado; si el proceso muere, se retoma al vencer.</summary>
    public static readonly TimeSpan Reserva    = TimeSpan.FromMinutes(5);
    public static readonly TimeSpan EsperaBase = TimeSpan.FromMinutes(2);

    /// <summary>
    /// Espera antes del siguiente intento tras fallar el intento número <paramref name="intentos"/>
    /// (1 → 2 min, 2 → 4 min, 3 → 8 min, 4 → 16 min…), con tope de 2 horas.
    /// </summary>
    public static TimeSpan Espera(int intentos)
    {
        var exp   = Math.Clamp(intentos - 1, 0, 10);
        var valor = TimeSpan.FromTicks(EsperaBase.Ticks * (1L << exp));
        return valor > TimeSpan.FromHours(2) ? TimeSpan.FromHours(2) : valor;
    }

    public async Task<ResultadoCiclo> ProcesarAsync(CancellationToken ct = default)
    {
        // Sin SMTP no se toma nada: los correos esperan sin gastar intentos.
        if (await cfg.ObtenerSmtpAsync(ct) is null) return new ResultadoCiclo(true, 0, 0, 0);

        int enviados = 0, reprogramados = 0, fallidos = 0;
        var lote = await cola.TomarPendientesAsync(TamanoLote, Reserva, ct);
        foreach (var correo in lote)
        {
            ct.ThrowIfCancellationRequested();
            var destinatarios = correo.Destinatarios
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var r = await enviador.EnviarAhoraAsync(destinatarios, correo.Asunto, correo.Html, ct);
            if (r.Ok)
            {
                await cola.MarcarEnviadoAsync(correo.Id, ct);
                enviados++;
                continue;
            }

            var error = Recortar(r.TipoError ?? "Error desconocido", 200);
            if (correo.Intentos >= MaxIntentos)
            {
                await cola.MarcarFallidoAsync(correo.Id, error, ct);
                fallidos++;
            }
            else
            {
                await cola.ReprogramarAsync(correo.Id, Espera(correo.Intentos), error, ct);
                reprogramados++;
            }
        }
        return new ResultadoCiclo(false, enviados, reprogramados, fallidos);
    }

    static string Recortar(string s, int max) => s.Length <= max ? s : s[..max];
}
