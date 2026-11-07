using FundacionPanorama.Application.Features.Inventario;
using FundacionPanorama.Application.Features.Inventario.Interfaces;
using FundacionPanorama.Infrastructure.Persistence.Repositories;
using Microsoft.Extensions.DependencyInjection;

// Mismo namespace que DependencyInjection para que AddInfrastructure lo use sin "using" adicional.
namespace FundacionPanorama.Infrastructure;

public static class InventarioRegistro
{
    public static IServiceCollection AddInventario(this IServiceCollection s)
    {
        s.AddScoped<IInventarioRepository, InventarioRepository>();
        s.AddScoped<InventarioService>();
        return s;
    }
}
