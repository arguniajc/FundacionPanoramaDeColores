using FundacionPanorama.Application.Features.Actividades;
using FundacionPanorama.Application.Features.Actividades.Interfaces;
using FundacionPanorama.Application.Features.Configuracion;
using FundacionPanorama.Application.Features.Configuracion.Interfaces;
using FundacionPanorama.Application.Features.Permisos;
using FundacionPanorama.Application.Features.Permisos.Interfaces;
using FundacionPanorama.Application.Features.Usuarios;
using FundacionPanorama.Application.Features.Usuarios.Interfaces;
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
        services.AddScoped<IUsuariosRepository, UsuariosRepository>();
        services.AddScoped<IPermisosRepository, PermisosRepository>();
        services.AddScoped<IActividadesRepository, ActividadesRepository>();

        // Services
        services.AddScoped<ConfiguracionService>();
        services.AddScoped<UsuariosService>();
        services.AddScoped<PermisosService>();
        services.AddScoped<ActividadesService>();

        return services;
    }
}
