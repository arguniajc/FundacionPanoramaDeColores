namespace FundacionPanorama.Application.Features.Inventario.DTOs;

// ── DTOs (contrato JSON: nombres y propiedades sin cambios) ──────────────────

public record ItemInventarioDto(
    Guid    Id,
    Guid?   SedeId,
    string  NombreSede,
    string? Codigo,
    string  Nombre,
    string? Descripcion,
    string  UnidadMedida,
    string  Categoria,
    decimal StockActual,
    decimal StockMinimo,
    bool    Activo,
    DateTime FechaCreacion,
    DateTime FechaModificacion,
    string   TipoTenencia,
    string?  Comodante,
    string?  ComodatoContrato,
    string?  ComodatoFechaInicio,
    string?  ComodatoFechaFin
);

public record CrearItemDto(
    Guid?   SedeId,
    string  Nombre,
    string? Descripcion,
    string  UnidadMedida,
    string  Categoria,
    decimal StockActual,
    decimal StockMinimo,
    string  TipoTenencia         = "propio",
    string? Comodante            = null,
    string? ComodatoContrato     = null,
    string? ComodatoFechaInicio  = null,
    string? ComodatoFechaFin     = null
);

public record ActualizarItemDto(
    string  Nombre,
    string? Descripcion,
    string  UnidadMedida,
    string  Categoria,
    decimal StockMinimo,
    string  TipoTenencia         = "propio",
    string? Comodante            = null,
    string? ComodatoContrato     = null,
    string? ComodatoFechaInicio  = null,
    string? ComodatoFechaFin     = null
);

public record TipoMovimientoDto(
    int     Id,
    string  Codigo,
    string  Nombre,
    string? Descripcion,
    string  AfectaStock
);

public record MovimientoDto(
    Guid     Id,
    Guid     ItemId,
    string   NombreItem,
    int      TipoMovimientoId,
    string   NombreTipo,
    string   AfectaStock,
    decimal  Cantidad,
    decimal  StockResultante,
    string?  Motivo,
    string?  Donante,
    Guid?    DonanteId,
    string?  NombreDonante,
    Guid?    SedeDestinoId,
    string   NombreSedeDestino,
    Guid?    TransferenciaGrupo,
    string?  UsuarioEmail,
    DateTime FechaMovimiento
);

public record RegistrarMovimientoDto(
    Guid    ItemId,
    int     TipoMovimientoId,
    decimal Cantidad,
    string? Motivo,
    string? Donante,
    Guid?   DonanteId
);

public record TransferenciaDto(
    Guid    ItemOrigenId,
    Guid    SedeDestinoId,
    decimal Cantidad,
    string? Motivo
);

public record StatsInventarioDto(
    int TotalItems,
    int StockBajo,
    int MovimientosMes,
    int SinStock
);

public record DonanteResumenDto(Guid Id, string Nombre, string Tipo, string? Documento);

public record IngresarDesdeDonacionDto(
    Guid?   ItemId,
    string  NombreItem,
    string? Categoria,
    string? UnidadMedida,
    decimal StockMinimo,
    Guid?   SedeId,
    decimal Cantidad,
    Guid?   DonanteId,
    string? NombreDonante,
    Guid?   DonacionId
);

// ── Resultados internos (no se serializan tal cual; el controller arma la respuesta) ──

public enum EstadoResultadoInventario { Ok, Invalido, NoEncontrado }

/// <summary>
/// Resultado de una operación que puede fallar por validación (400) o no encontrado (404).
/// Mensaje null en NoEncontrado = 404 sin cuerpo.
/// </summary>
public record ResultadoInventario<T>(EstadoResultadoInventario Estado, T? Valor, string? Mensaje)
{
    public static ResultadoInventario<T> Exito(T valor)              => new(EstadoResultadoInventario.Ok, valor, null);
    public static ResultadoInventario<T> Invalido(string mensaje)    => new(EstadoResultadoInventario.Invalido, default, mensaje);
    public static ResultadoInventario<T> NoEncontrado(string? mensaje = null) => new(EstadoResultadoInventario.NoEncontrado, default, mensaje);
}

public enum ResultadoEliminacionItem { NoEncontrado, Desactivado, Eliminado }

public record MovimientoRegistradoResultado(Guid MovimientoId, decimal NuevoStock);

public record TransferenciaResultado(
    Guid    GrupoId,
    Guid    ItemOrigenId,
    decimal NuevoStockOrigen,
    Guid    ItemDestinoId,
    decimal NuevoStockDestino,
    string  NombreItem);

public record IngresoDonacionResultado(Guid ItemId, decimal NuevoStock);
