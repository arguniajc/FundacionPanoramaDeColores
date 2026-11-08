namespace FundacionPanorama.API.Services;

/// <summary>
/// Lanza un trabajo que no debe demorar la respuesta (p. ej. el aviso por correo a los
/// administradores) sin usar los servicios del request: al terminar el request, su scope se
/// libera y un EmailService/DbConnectionFactory capturado podría estar ya desechado.
/// Por eso el trabajo crea su PROPIO scope, y cualquier excepción queda en el log con un
/// código corto (como el manejador global de errores) en vez de perderse.
/// </summary>
public static class TrabajoEnSegundoPlano
{
    /// <summary>
    /// Ejecuta <paramref name="trabajo"/> en segundo plano con un <typeparamref name="TServicio"/>
    /// resuelto de un scope nuevo. Devuelve la tarea (útil en pruebas); el llamador puede descartarla.
    /// Nunca lanza: los errores se registran.
    /// </summary>
    public static Task Lanzar<TServicio>(
        IServiceScopeFactory scopes,
        ILogger logger,
        string descripcion,
        Func<TServicio, CancellationToken, Task> trabajo)
        where TServicio : notnull
        => Task.Run(async () =>
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var servicio = scope.ServiceProvider.GetRequiredService<TServicio>();
                await trabajo(servicio, CancellationToken.None);
            }
            catch (Exception ex)
            {
                var codigo = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
                logger.LogError(ex, "❌ Falló un trabajo en segundo plano [{Codigo}]: {Descripcion}", codigo, descripcion);
            }
        }, CancellationToken.None);
}
