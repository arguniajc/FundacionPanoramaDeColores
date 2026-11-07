using FundacionPanorama.Application.Features.Inventario.DTOs;
using FundacionPanorama.Application.Features.Inventario.Interfaces;

namespace FundacionPanorama.Application.Features.Inventario;

public class InventarioService(IInventarioRepository repo)
{
    // ── Items ─────────────────────────────────────────────────────────────────

    public Task<IReadOnlyList<ItemInventarioDto>> ListarItemsAsync(
        Guid? sedeId, string? buscar, string? categoria, string? tipoTenencia)
        => repo.ListarItemsAsync(sedeId, buscar, categoria, tipoTenencia);

    public Task<ItemInventarioDto?> ObtenerItemAsync(Guid id)
        => repo.ObtenerItemAsync(id);

    public async Task<ResultadoInventario<ItemInventarioDto>> CrearItemAsync(CrearItemDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return ResultadoInventario<ItemInventarioDto>.Invalido("El nombre es obligatorio.");
        if (dto.StockActual < 0 || dto.StockMinimo < 0)
            return ResultadoInventario<ItemInventarioDto>.Invalido("El stock no puede ser negativo.");

        var cat    = string.IsNullOrWhiteSpace(dto.Categoria) ? "Otros" : dto.Categoria.Trim();
        var prefix = InventarioReglas.CatPrefix(cat);
        var yy     = DateTime.UtcNow.ToString("yy");

        var item = await repo.CrearItemAsync(dto, cat, prefix, yy);
        return ResultadoInventario<ItemInventarioDto>.Exito(item);
    }

    public async Task<ResultadoInventario<ItemInventarioDto>> ActualizarItemAsync(Guid id, ActualizarItemDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return ResultadoInventario<ItemInventarioDto>.Invalido("El nombre es obligatorio.");
        if (dto.StockMinimo < 0)
            return ResultadoInventario<ItemInventarioDto>.Invalido("El stock mínimo no puede ser negativo.");

        var item = await repo.ActualizarItemAsync(id, dto);
        return item is null
            ? ResultadoInventario<ItemInventarioDto>.NoEncontrado()
            : ResultadoInventario<ItemInventarioDto>.Exito(item);
    }

    public Task<ResultadoEliminacionItem> EliminarItemAsync(Guid id)
        => repo.EliminarItemAsync(id);

    // ── Movimientos ───────────────────────────────────────────────────────────

    public Task<IReadOnlyList<MovimientoDto>> ListarMovimientosAsync(Guid? itemId, Guid? sedeId)
        => repo.ListarMovimientosAsync(itemId, sedeId);

    public Task<ResultadoInventario<MovimientoRegistradoResultado>> RegistrarMovimientoAsync(
        RegistrarMovimientoDto dto, string? usuarioEmail)
    {
        if (dto.Cantidad <= 0)
            return Task.FromResult(ResultadoInventario<MovimientoRegistradoResultado>.Invalido("La cantidad debe ser mayor a cero."));
        return repo.RegistrarMovimientoAsync(dto, usuarioEmail);
    }

    // ── Transferencia entre sedes ─────────────────────────────────────────────

    public Task<ResultadoInventario<TransferenciaResultado>> TransferirAsync(TransferenciaDto dto, string? usuarioEmail)
    {
        if (dto.Cantidad <= 0)
            return Task.FromResult(ResultadoInventario<TransferenciaResultado>.Invalido("La cantidad debe ser mayor a cero."));
        return repo.TransferirAsync(dto, usuarioEmail);
    }

    // ── Catálogos y consultas ─────────────────────────────────────────────────

    public Task<IReadOnlyList<TipoMovimientoDto>> ListarTiposAsync()
        => repo.ListarTiposAsync();

    public Task<IReadOnlyList<DonanteResumenDto>> BuscarDonantesAsync(string? buscar)
        => repo.BuscarDonantesAsync(buscar);

    public Task<StatsInventarioDto> ObtenerStatsAsync(Guid? sedeId)
        => repo.ObtenerStatsAsync(sedeId);

    public Task<IReadOnlyList<ItemInventarioDto>> ComodatosProximosAsync(int dias)
        => repo.ComodatosProximosAsync(dias);

    // ── Ingresar desde donación ───────────────────────────────────────────────

    public Task<ResultadoInventario<IngresoDonacionResultado>> IngresarDesdeDonacionAsync(
        IngresarDesdeDonacionDto dto, string? usuarioEmail)
    {
        if (dto.Cantidad <= 0)
            return Task.FromResult(ResultadoInventario<IngresoDonacionResultado>.Invalido("La cantidad debe ser mayor a cero."));
        var nombre = dto.NombreItem?.Trim();
        if (string.IsNullOrEmpty(nombre))
            return Task.FromResult(ResultadoInventario<IngresoDonacionResultado>.Invalido("El nombre del artículo es obligatorio."));
        return repo.IngresarDesdeDonacionAsync(dto, nombre, usuarioEmail);
    }
}

/// <summary>
/// Reglas de negocio puras del inventario. Se usan desde el servicio y desde el
/// repositorio (dentro de las transacciones, para no romper la atomicidad).
/// </summary>
public static class InventarioReglas
{
    public static string CatPrefix(string categoria) => categoria switch
    {
        "Material escolar"     => "MAT",
        "Equipos electrónicos" => "EQU",
        "Deportivo"            => "DEP",
        "Ropa y calzado"       => "ROP",
        "Alimentos"            => "ALI",
        "Medicamentos"         => "MED",
        "Muebles y enseres"    => "MUE",
        "Herramientas"         => "HER",
        _                      => "OTR",
    };

    public static string GenerarCodigo(string prefijo, string anio2Digitos, int secuencia)
        => $"{prefijo}-{anio2Digitos}-{secuencia:D4}";

    /// <summary>Stock resultante según el signo del tipo de movimiento ("+" suma, cualquier otro resta).</summary>
    public static decimal CalcularNuevoStock(string afectaStock, decimal stockActual, decimal cantidad)
        => afectaStock == "+" ? stockActual + cantidad : stockActual - cantidad;
}
