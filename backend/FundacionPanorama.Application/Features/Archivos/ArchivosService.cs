using FundacionPanorama.Application.Features.Archivos.DTOs;
using FundacionPanorama.Application.Features.Archivos.Interfaces;

namespace FundacionPanorama.Application.Features.Archivos;

/// <summary>Log de descargas de documentos. Subida, firma y migración de archivos siguen en el controlador (Storage).</summary>
public class ArchivosService(IArchivosRepository repo)
{
    public async Task<LogDescargasPaginaDto> ObtenerLogAsync(int pagina, int porPagina, CancellationToken ct = default)
    {
        pagina    = Math.Max(1, pagina);
        porPagina = Math.Clamp(porPagina, 1, 100);

        var total     = await repo.ContarDescargasAsync(ct);
        var registros = await repo.ListarDescargasAsync(pagina, porPagina, ct);
        return new LogDescargasPaginaDto(registros, total, pagina, porPagina);
    }

    public Task RegistrarDescargaAsync(string email, LogDescargaDto dto, CancellationToken ct = default)
        => repo.RegistrarDescargaAsync(email, dto, ct);

    public async Task<LogExportacionesPaginaDto> ObtenerExportacionesAsync(int pagina, int porPagina, CancellationToken ct = default)
    {
        pagina    = Math.Max(1, pagina);
        porPagina = Math.Clamp(porPagina, 1, 100);
        var total     = await repo.ContarExportacionesAsync(ct);
        var registros = await repo.ListarExportacionesAsync(pagina, porPagina, ct);
        return new LogExportacionesPaginaDto(registros, total, pagina, porPagina);
    }

    public Task RegistrarExportacionAsync(string email, LogExportacionDto dto, CancellationToken ct = default)
        => repo.RegistrarExportacionAsync(email, dto, ct);
}
