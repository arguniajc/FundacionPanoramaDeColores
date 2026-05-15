using FundacionPanorama.Application.Features.Actividades;
using FundacionPanorama.Application.Features.Actividades.Interfaces;
using FundacionPanorama.Application.Features.Configuracion;
using FundacionPanorama.Application.Features.Configuracion.Interfaces;
using FundacionPanorama.Application.Features.Contabilidad;
using FundacionPanorama.Application.Features.Contabilidad.Interfaces;
using FundacionPanorama.Application.Features.Organigrama;
using FundacionPanorama.Application.Features.Permisos;
using FundacionPanorama.Application.Features.Permisos.Interfaces;
using FundacionPanorama.Application.Features.Reportes;
using FundacionPanorama.Application.Features.Reportes.Interfaces;
using FundacionPanorama.Application.Features.TalentoHumano;
using FundacionPanorama.Application.Features.TalentoHumano.Interfaces;
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
        services.AddScoped<IReportesRepository, ReportesRepository>();
        services.AddScoped<ITalentoHumanoRepository, TalentoHumanoRepository>();
        services.AddScoped<IContabilidadRepository, ContabilidadRepository>();
        services.AddScoped<IOrganigramaRepository, OrganigramaRepository>();

        // Services
        services.AddScoped<ConfiguracionService>();
        services.AddScoped<UsuariosService>();
        services.AddScoped<PermisosService>();
        services.AddScoped<ActividadesService>();
        services.AddScoped<ReportesService>();
        services.AddScoped<TalentoHumanoService>();
        services.AddScoped<ContabilidadService>();
        services.AddScoped<OrganigramaService>();

        return services;
    }
}
