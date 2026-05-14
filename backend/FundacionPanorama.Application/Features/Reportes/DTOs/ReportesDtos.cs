namespace FundacionPanorama.Application.Features.Reportes.DTOs;

// ── Componentes compartidos ───────────────────────────────────────────────────
public record GrupoDto(string Etiqueta, int Cantidad);
public record SerieMesDto(string Mes, int Cantidad);
public record SerieMonetoDto(string Mes, decimal Monto, int Cantidad);

// ── Beneficiarios ─────────────────────────────────────────────────────────────
public record BeneficiariosReporteDto(
    ResumenBeneficiariosDto     Resumen,
    IReadOnlyList<GrupoDto>     PorEdad,
    IReadOnlyList<GrupoDto>     PorGenero,
    IReadOnlyList<GrupoDto>     PorPrograma,
    IReadOnlyList<GrupoDto>     PorGrado,
    IReadOnlyList<SerieMesDto>  NuevosPorMes);

public record ResumenBeneficiariosDto(
    int Total,
    int Activos,
    int Inactivos,
    int ConDiscapacidad,
    int ConAutorizacion);

// ── Programas ─────────────────────────────────────────────────────────────────
public record ProgramasReporteDto(
    ResumenProgramasDto              Resumen,
    IReadOnlyList<ProgramaDetalleDto> InscritosPorPrograma,
    IReadOnlyList<GrupoDto>           EstadoInscripciones,
    IReadOnlyList<GrupoDto>           PorSede);

public record ResumenProgramasDto(int Total, int Activos, int TotalInscritos);

public record ProgramaDetalleDto(string Programa, int Inscritos, int InscritosActivos);

// ── Inventario ────────────────────────────────────────────────────────────────
public record InventarioReporteDto(
    ResumenInventarioDto           Resumen,
    IReadOnlyList<CategoriaDto>    PorCategoria,
    IReadOnlyList<GrupoDto>        MovimientosPorTipo,
    IReadOnlyList<ItemCriticoDto>  ItemsCriticos);

public record ResumenInventarioDto(int TotalItems, int ItemsBajoStock, int Categorias, decimal StockTotal);

public record CategoriaDto(string Categoria, int Items, decimal StockTotal);

public record ItemCriticoDto(string Nombre, decimal StockActual, decimal StockMinimo, string Categoria);

// ── Actividades ───────────────────────────────────────────────────────────────
public record ActividadesReporteDto(
    ResumenActividadesDto              Resumen,
    IReadOnlyList<GrupoDto>            PorEstado,
    IReadOnlyList<AsistenciaItemDto>   AsistenciaPorActividad,
    IReadOnlyList<SerieMesDto>         PorMes);

public record ResumenActividadesDto(
    int    Total,
    int    Completadas,
    int    EnCurso,
    int    Planificadas,
    int    TotalAsistencia,
    double PromedioAsistencia);

public record AsistenciaItemDto(string Titulo, int Inscritos, int Asistieron);

// ── Donaciones ────────────────────────────────────────────────────────────────
public record DonacionesReporteDto(
    ResumenDonacionesDto          Resumen,
    IReadOnlyList<TipoDonacionDto> PorTipo,
    IReadOnlyList<SerieMonetoDto>  MontosPorMes,
    IReadOnlyList<TopDonanteDto>   TopDonantes);

public record ResumenDonacionesDto(int Total, decimal TotalMonto, decimal PromedioMonto);

public record TipoDonacionDto(string Tipo, int Cantidad, decimal Monto);

public record TopDonanteDto(string Nombre, decimal TotalMonto, int Donaciones);
