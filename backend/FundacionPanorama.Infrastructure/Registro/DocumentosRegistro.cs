using FundacionPanorama.Application.Features.Alertas;
using FundacionPanorama.Application.Features.Alertas.Interfaces;
using FundacionPanorama.Application.Features.Archivos;
using FundacionPanorama.Application.Features.Archivos.Interfaces;
using FundacionPanorama.Application.Features.Auditoria;
using FundacionPanorama.Application.Features.Auditoria.Interfaces;
using FundacionPanorama.Application.Features.Documentos;
using FundacionPanorama.Application.Features.Documentos.Interfaces;
using FundacionPanorama.Infrastructure.Persistence.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace FundacionPanorama.Infrastructure;

public static class DocumentosRegistro
{
    /// <summary>Repositorios y servicios de Documentos, Auditoría, Alertas y log de descargas (Archivos).</summary>
    public static IServiceCollection AddDocumentosAuditoriaAlertas(this IServiceCollection services)
    {
        services.AddScoped<IDocumentosRepository, DocumentosRepository>();
        services.AddScoped<IAuditoriaRepository, AuditoriaRepository>();
        services.AddScoped<IAlertasRepository, AlertasRepository>();
        services.AddScoped<IArchivosRepository, ArchivosRepository>();

        services.AddScoped<DocumentosService>();
        services.AddScoped<AuditoriaService>();
        services.AddScoped<AlertasService>();
        services.AddScoped<ArchivosService>();

        return services;
    }
}
