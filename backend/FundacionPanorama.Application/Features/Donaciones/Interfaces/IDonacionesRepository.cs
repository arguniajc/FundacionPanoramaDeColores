using FundacionPanorama.Application.Features.Donaciones.DTOs;
using FundacionPanorama.Application.Shared;

namespace FundacionPanorama.Application.Features.Donaciones.Interfaces;

public interface IDonacionesRepository
{
    /// <summary>Página de donaciones activas (más recientes primero) y total con los mismos filtros.</summary>
    Task<ListaPaginada<DonacionDto>> ListarAsync(FiltroDonaciones filtro, int pagina, int porPagina, CancellationToken ct = default);

    Task<DonacionDto?> ObtenerAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Crea la donación en una única transacción (recibo, inventario y auditoría),
    /// dispara el registro contable automático y devuelve el registro completo.
    /// </summary>
    Task<DonacionDto?> CrearAsync(CrearDonacionDto dto, string? usuarioEmail, CancellationToken ct = default);

    Task<bool> ActualizarAsync(Guid id, CrearDonacionDto dto, CancellationToken ct = default);
    Task<bool> EliminarAsync(Guid id, CancellationToken ct = default);
    Task<bool> AnularAsync(Guid id, CancellationToken ct = default);
    Task<StatsDonacionesDto> ObtenerStatsAsync(CancellationToken ct = default);

    Task RegistrarLogEmisionAsync(
        Guid donacionId, string accion,
        string? usuarioEmail, string? destinatarioEmail, string? detalle,
        CancellationToken ct = default);
}
