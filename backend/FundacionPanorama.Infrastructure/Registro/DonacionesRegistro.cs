using FundacionPanorama.Application.Features.Donaciones;
using FundacionPanorama.Application.Features.Donaciones.Interfaces;
using FundacionPanorama.Application.Features.Donantes;
using FundacionPanorama.Application.Features.Donantes.Interfaces;
using FundacionPanorama.Application.Features.Inscripciones;
using FundacionPanorama.Application.Features.Inscripciones.Interfaces;
using FundacionPanorama.Infrastructure.Persistence.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace FundacionPanorama.Infrastructure;

public static class DonacionesRegistro
{
    /// <summary>Repositorios y servicios de Donaciones, Donantes e Inscripciones.</summary>
    public static IServiceCollection AddDonacionesDonantesInscripciones(this IServiceCollection services)
    {
        services.AddScoped<IDonacionesRepository, DonacionesRepository>();
        services.AddScoped<IDonantesRepository, DonantesRepository>();
        services.AddScoped<IInscripcionesRepository, InscripcionesRepository>();

        services.AddScoped<DonacionesService>();
        services.AddScoped<DonantesService>();
        services.AddScoped<InscripcionesService>();

        return services;
    }
}
