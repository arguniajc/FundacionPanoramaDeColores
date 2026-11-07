using FundacionPanorama.Application.Features.Voluntarios;
using FundacionPanorama.Application.Features.Voluntarios.Interfaces;
using FundacionPanorama.Infrastructure.Persistence.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace FundacionPanorama.Infrastructure;

public static class VoluntariosRegistro
{
    /// <summary>Repositorio y servicio de Voluntarios (y sus asignaciones).</summary>
    public static IServiceCollection AddVoluntarios(this IServiceCollection services)
    {
        services.AddScoped<IVoluntariosRepository, VoluntariosRepository>();
        services.AddScoped<VoluntariosService>();
        return services;
    }
}
