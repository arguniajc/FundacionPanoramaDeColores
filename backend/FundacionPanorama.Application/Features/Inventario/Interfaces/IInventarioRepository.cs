using FundacionPanorama.Application.Features.Inventario.DTOs;

namespace FundacionPanorama.Application.Features.Inventario.Interfaces;

public interface IInventarioRepository
{
    // Items
    Task<IReadOnlyList<ItemInventarioDto>> ListarItemsAsync(Guid? sedeId, string? buscar, string? categoria, string? tipoTenencia);
    Task<ItemInventarioDto?>               ObtenerItemAsync(Guid id);
    /// <summary>Genera el código (prefijo-año-secuencia) e inserta el ítem en una sola transacción.</summary>
    Task<ItemInventarioDto>                CrearItemAsync(CrearItemDto dto, string categoria, string prefijo, string anio2Digitos);
    Task<ItemInventarioDto?>               ActualizarItemAsync(Guid id, ActualizarItemDto dto);
    /// <summary>Desactiva el ítem si tiene movimientos; si no, lo borra.</summary>
    Task<ResultadoEliminacionItem>         EliminarItemAsync(Guid id);

    // Movimientos (cada operación de escritura es atómica: una transacción por método)
    Task<IReadOnlyList<MovimientoDto>>                        ListarMovimientosAsync(Guid? itemId, Guid? sedeId);
    Task<ResultadoInventario<MovimientoRegistradoResultado>>  RegistrarMovimientoAsync(RegistrarMovimientoDto dto, string? usuarioEmail);
    Task<ResultadoInventario<TransferenciaResultado>>         TransferirAsync(TransferenciaDto dto, string? usuarioEmail);
    Task<ResultadoInventario<IngresoDonacionResultado>>       IngresarDesdeDonacionAsync(IngresarDesdeDonacionDto dto, string nombreItem, string? usuarioEmail);

    // Catálogos y consultas
    Task<IReadOnlyList<TipoMovimientoDto>> ListarTiposAsync();
    Task<IReadOnlyList<DonanteResumenDto>> BuscarDonantesAsync(string? buscar);
    Task<StatsInventarioDto>               ObtenerStatsAsync(Guid? sedeId);
    Task<IReadOnlyList<ItemInventarioDto>> ComodatosProximosAsync(int dias);
}
