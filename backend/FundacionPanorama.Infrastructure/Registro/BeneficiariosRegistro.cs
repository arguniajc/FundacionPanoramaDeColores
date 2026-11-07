using FundacionPanorama.Application.Features.Beneficiarios;
using FundacionPanorama.Application.Features.Beneficiarios.Interfaces;
using FundacionPanorama.Infrastructure.Persistence.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace FundacionPanorama.Infrastructure;

public static class BeneficiariosRegistro
{
    public static IServiceCollection AddBeneficiarios(this IServiceCollection s)
    {
        s.AddScoped<IBeneficiariosRepository, BeneficiariosRepository>();
        s.AddScoped<BeneficiariosService>();
        return s;
    }
}
