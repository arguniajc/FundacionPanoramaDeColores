using FundacionPanorama.Application.Features.Correos;
using FundacionPanorama.Application.Features.Correos.Interfaces;
using FundacionPanorama.Infrastructure.Persistence.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace FundacionPanorama.Infrastructure;

public static class CorreosRegistro
{
    /// <summary>
    /// Cola persistente de correos y resumen diario de alertas. El enviador SMTP
    /// (<see cref="IEnviadorCorreo"/>) lo registra la API.
    /// </summary>
    public static IServiceCollection AddCorreos(this IServiceCollection services)
    {
        services.AddScoped<IColaCorreosRepository, ColaCorreosRepository>();
        services.AddScoped<ProcesadorColaCorreos>();
        services.AddScoped<ResumenDiarioService>();
        return services;
    }
}
