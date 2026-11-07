using FundacionPanorama.Application.Features.Archivos.DTOs;

namespace FundacionPanorama.Application.Features.Archivos.Interfaces;

/// <summary>Auditoría de descargas de documentos (tabla log_descargas).</summary>
public interface IArchivosRepository
{
    Task<long> ContarDescargasAsync(CancellationToken ct = default);
    Task<IReadOnlyList<LogDescargaRegistroDto>> ListarDescargasAsync(int pagina, int porPagina, CancellationToken ct = default);
    Task RegistrarDescargaAsync(string email, LogDescargaDto dto, CancellationToken ct = default);
}
