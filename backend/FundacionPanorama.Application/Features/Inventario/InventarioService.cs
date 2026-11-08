using FundacionPanorama.Application.Features.Inventario.DTOs;
using FundacionPanorama.Application.Features.Inventario.Interfaces;
using static FundacionPanorama.Application.Shared.Validar;

namespace FundacionPanorama.Application.Features.Inventario;

public class InventarioService(IInventarioRepository repo)
{
    /// <summary>Valores del panel (geodata.js CATEGORIAS_INVENTARIO y NuevoItemDialog.jsx TIPOS_TENENCIA).</summary>
    public static readonly string[] Categorias =
    [
        "Material escolar", "Equipos electrónicos", "Deportivo", "Ropa y calzado", "Alimentos",
        "Medicamentos", "Muebles y enseres", "Herramientas", "Otros",
    ];
    public static readonly string[] TiposTenencia = ["propio", "comodato", "donacion_uso", "arrendamiento"];

    // Columnas de inventario_items: nombre 200, unidad_medida 50, categoria 50,
    // tipo_tenencia 20, comodante 200, comodato_contrato 100.
    static void ValidarItem(string nombre, string? unidadMedida, string? categoria, string? tipoTenencia,
        string? comodante, string? comodatoContrato, string? comodatoInicio, string? comodatoFin)
    {
        Largo(nombre, 200, "El nombre");
        Largo(unidadMedida, 50, "La unidad de medida");
        if (!string.IsNullOrWhiteSpace(categoria))
            EnLista(categoria, Categorias, "La categoría no es válida. Elígela de la lista. Ejemplo: Material escolar");
        if (!string.IsNullOrWhiteSpace(tipoTenencia))
            EnLista(tipoTenencia, TiposTenencia, "El tipo de tenencia no es válido (propio, comodato, donación en uso o arrendamiento).");
        Largo(comodante, 200, "El comodante");
        Largo(comodatoContrato, 100, "El número de contrato de comodato");
        var inicio = FechaTexto(comodatoInicio, "La fecha de inicio del comodato", "2025-01-15");
        var fin    = FechaTexto(comodatoFin, "La fecha de fin del comodato", "2025-12-31");
        Exigir(inicio is null || fin is null || fin >= inicio,
            "La fecha de fin del comodato no puede ser anterior a la fecha de inicio.");
    }

    /// <summary>Una fecha vacía ("") llegaría a la BD como texto inválido: se trata como sin fecha.</summary>
    static string? SinVacio(string? s) => string.IsNullOrWhiteSpace(s) ? null : s;

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
        if (PrimerError(() => ValidarItem(dto.Nombre, dto.UnidadMedida, dto.Categoria, dto.TipoTenencia,
                dto.Comodante, dto.ComodatoContrato, dto.ComodatoFechaInicio, dto.ComodatoFechaFin)) is { } error)
            return ResultadoInventario<ItemInventarioDto>.Invalido(error);
        if (dto.SedeId is { } sedeId && sedeId != Guid.Empty && !await repo.ExisteSedeAsync(sedeId))
            return ResultadoInventario<ItemInventarioDto>.Invalido("La sede seleccionada no existe. Recarga la página y elígela de nuevo.");
        if (SinVacio(dto.ComodatoFechaInicio) != dto.ComodatoFechaInicio || SinVacio(dto.ComodatoFechaFin) != dto.ComodatoFechaFin)
            dto = dto with { ComodatoFechaInicio = SinVacio(dto.ComodatoFechaInicio), ComodatoFechaFin = SinVacio(dto.ComodatoFechaFin) };

        var cat   = string.IsNullOrWhiteSpace(dto.Categoria) ? "Otros" : dto.Categoria.Trim();
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
        if (PrimerError(() => ValidarItem(dto.Nombre, dto.UnidadMedida, dto.Categoria, dto.TipoTenencia,
                dto.Comodante, dto.ComodatoContrato, dto.ComodatoFechaInicio, dto.ComodatoFechaFin)) is { } error)
            return ResultadoInventario<ItemInventarioDto>.Invalido(error);
        if (SinVacio(dto.ComodatoFechaInicio) != dto.ComodatoFechaInicio || SinVacio(dto.ComodatoFechaFin) != dto.ComodatoFechaFin)
            dto = dto with { ComodatoFechaInicio = SinVacio(dto.ComodatoFechaInicio), ComodatoFechaFin = SinVacio(dto.ComodatoFechaFin) };

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
        if (PrimerError(() => ValidarItem(nombre, dto.UnidadMedida, dto.Categoria, null, null, null, null, null)) is { } error)
            return Task.FromResult(ResultadoInventario<IngresoDonacionResultado>.Invalido(error));
        if (dto.StockMinimo < 0)
            return Task.FromResult(ResultadoInventario<IngresoDonacionResultado>.Invalido("El stock mínimo no puede ser negativo."));
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
