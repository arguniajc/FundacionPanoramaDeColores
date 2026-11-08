using FundacionPanorama.Application.Features.Correos;
using FundacionPanorama.Application.Features.Correos.Interfaces;

namespace FundacionPanorama.API.Services;

/// <summary>
/// Proceso en segundo plano de la cola de correos. Cada ~30 s, con un scope propio:
/// 1) revisa si toca el resumen diario de alertas y lo encola;
/// 2) envía un lote de pendientes (reintentos exponenciales, máx. 5 intentos);
/// 3) una vez por hora borra enviados de más de 30 días (y fallidos de más de 90).
/// Todo el estado vive en la BD, así que un reinicio o una suspensión de Render no pierde
/// correos: al volver, el siguiente ciclo continúa donde quedó. Cada paso tiene su propio
/// manejo de errores: si falla el resumen, la cola se procesa igual.
/// </summary>
public class ColaCorreosWorker(IServiceScopeFactory scopes, ILogger<ColaCorreosWorker> logger) : BackgroundService
{
    public static readonly TimeSpan Intervalo          = TimeSpan.FromSeconds(30);
    public static readonly TimeSpan IntervaloLimpieza  = TimeSpan.FromHours(1);
    public static readonly TimeSpan RetencionEnviados  = TimeSpan.FromDays(30);
    public static readonly TimeSpan RetencionFallidos  = TimeSpan.FromDays(90);

    bool avisoSinSmtpCola, avisoSinSmtpResumen;
    DateTime proximaLimpieza = DateTime.MinValue;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Pequeña espera para no competir con el arranque
        try { await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken); }
        catch (OperationCanceledException) { return; }

        using var timer = new PeriodicTimer(Intervalo);
        do
        {
            await Paso("resumen diario", ResumenAsync, stoppingToken);
            await Paso("envío de pendientes", ColaAsync, stoppingToken);
            if (DateTime.UtcNow >= proximaLimpieza)
            {
                proximaLimpieza = DateTime.UtcNow + IntervaloLimpieza;
                await Paso("limpieza", LimpiezaAsync, stoppingToken);
            }
        }
        while (await EsperarAsync(timer, stoppingToken));
    }

    static async Task<bool> EsperarAsync(PeriodicTimer timer, CancellationToken ct)
    {
        try { return await timer.WaitForNextTickAsync(ct); }
        catch (OperationCanceledException) { return false; }
    }

    async Task Paso(string nombre, Func<IServiceProvider, CancellationToken, Task> trabajo, CancellationToken ct)
    {
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            await trabajo(scope.ServiceProvider, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // Apagado del servidor: lo tomado se retoma al vencer la reserva
        }
        catch (Exception ex)
        {
            var codigo = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
            logger.LogError(ex, "❌ Falló la cola de correos ({Paso}) [{Codigo}]", nombre, codigo);
        }
    }

    async Task ResumenAsync(IServiceProvider sp, CancellationToken ct)
    {
        var (resumen, correos) = await sp.GetRequiredService<ResumenDiarioService>().EjecutarSiTocaAsync(DateTime.UtcNow, ct);
        if (resumen == ResultadoResumen.SinSmtp)
        {
            if (!avisoSinSmtpResumen)
                logger.LogWarning("⚠️ Resumen diario de alertas no encolado: SMTP no configurado.");
            avisoSinSmtpResumen = true;
            return;
        }
        avisoSinSmtpResumen = false;
        if (resumen == ResultadoResumen.Encolado)
            logger.LogInformation("📧 Resumen diario de alertas encolado para {N} destinatario(s).", correos);
    }

    async Task ColaAsync(IServiceProvider sp, CancellationToken ct)
    {
        var r = await sp.GetRequiredService<ProcesadorColaCorreos>().ProcesarAsync(ct);
        if (r.SinSmtp)
        {
            if (!avisoSinSmtpCola)
                logger.LogWarning("⚠️ Cola de correos en pausa: SMTP no configurado.");
            avisoSinSmtpCola = true;
            return;
        }
        avisoSinSmtpCola = false;
        if (r.Enviados + r.Reprogramados + r.Fallidos > 0)
            logger.LogInformation("📧 Cola de correos: {Enviados} enviado(s), {Reprog} para reintentar, {Fallidos} fallido(s).",
                r.Enviados, r.Reprogramados, r.Fallidos);
        if (r.Fallidos > 0)
            logger.LogWarning("⚠️ {N} correo(s) agotaron los {Max} intentos y quedaron como fallidos.",
                r.Fallidos, ProcesadorColaCorreos.MaxIntentos);
    }

    async Task LimpiezaAsync(IServiceProvider sp, CancellationToken ct)
    {
        var borrados = await sp.GetRequiredService<IColaCorreosRepository>()
            .LimpiarAsync(RetencionEnviados, RetencionFallidos, ct);
        if (borrados > 0)
            logger.LogInformation("🧹 Cola de correos: {N} correo(s) antiguos borrados.", borrados);
    }
}
