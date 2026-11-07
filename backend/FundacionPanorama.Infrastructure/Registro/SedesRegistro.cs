using FundacionPanorama.Application.Features.Sedes;
using FundacionPanorama.Application.Features.Sedes.Interfaces;
using FundacionPanorama.Infrastructure.Persistence.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace FundacionPanorama.Infrastructure;

public static class SedesRegistro
{
    public static IServiceCollection AddSedes(this IServiceCollection s)
    {
        s.AddScoped<ISedesRepository, SedesRepository>();
        s.AddScoped<SedesService>();
        return s;
    }
}
