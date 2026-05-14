using FundacionPanorama.Application.Features.Configuracion;
using FundacionPanorama.Application.Features.Configuracion.Interfaces;
using FundacionPanorama.Infrastructure.Persistence;
using FundacionPanorama.Infrastructure.Persistence.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace FundacionPanorama.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        string connectionString)
    {
        services.AddSingleton(new DbConnectionFactory(connectionString));

        // Repositories
        services.AddScoped<IConfiguracionRepository, ConfiguracionRepository>();

        // Services
        services.AddScoped<ConfiguracionService>();

        return services;
    }
}
