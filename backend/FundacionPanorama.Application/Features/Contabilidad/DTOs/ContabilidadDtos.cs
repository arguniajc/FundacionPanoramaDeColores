namespace FundacionPanorama.Application.Features.Contabilidad.DTOs;

// ── Categorías ────────────────────────────────────────────────────────────────
public record CategoriaContableDto(
    int     Id,
    string  Tipo,
    string  CodigoPuc,
    string  Nombre,
    string? Descripcion,
    string? Icono);

// ── Cuentas caja/banco ────────────────────────────────────────────────────────
public record CuentaCajaDto(
    Guid    Id,
    string  Nombre,
    string  Tipo,
    string? Banco,
    string? NumeroCuenta,
    decimal SaldoInicial,
    decimal SaldoActual,
    bool    Activo);

public record CrearCuentaCajaDto(
    string  Nombre,
    string  Tipo,
    string? Banco,
    string? NumeroCuenta,
    decimal SaldoInicial);

// ── Movimientos ───────────────────────────────────────────────────────────────
public record MovimientoDto(
    Guid     Id,
    string   Tipo,
    DateOnly Fecha,
    string   Concepto,
    decimal  Monto,
    Guid     CuentaId,
    string   CuentaNombre,
    int      CategoriaId,
    string   CategoriaNombre,
    string   CodigoPuc,
    Guid?    ProgramaId,
    string?  ProgramaNombre,
    string?  TerceroNombre,
    string?  TerceroDocumento,
    string?  NumeroSoporte,
    string?  Descripcion,
    DateTime FechaCreacion);

public record CrearMovimientoDto(
    string   Tipo,
    DateOnly Fecha,
    string   Concepto,
    decimal  Monto,
    Guid     CuentaId,
    int      CategoriaId,
    Guid?    ProgramaId,
    string?  TerceroNombre,
    string?  TerceroDocumento,
    string?  NumeroSoporte,
    string?  Descripcion);

public record ActualizarMovimientoDto(
    string   Tipo,
    DateOnly Fecha,
    string   Concepto,
    decimal  Monto,
    Guid     CuentaId,
    int      CategoriaId,
    Guid?    ProgramaId,
    string?  TerceroNombre,
    string?  TerceroDocumento,
    string?  NumeroSoporte,
    string?  Descripcion);

// ── Presupuesto ───────────────────────────────────────────────────────────────
public record PresupuestoDto(
    Guid    Id,
    int     Anio,
    Guid?   ProgramaId,
    string? ProgramaNombre,
    int     CategoriaId,
    string  CategoriaNombre,
    string  CodigoPuc,
    decimal MontoPresupuestado,
    decimal Ejecutado,
    decimal Disponible);

public record CrearPresupuestoDto(
    int     Anio,
    Guid?   ProgramaId,
    int     CategoriaId,
    decimal MontoPresupuestado);

// ── Dashboard / stats ─────────────────────────────────────────────────────────
public record ContabilidadStatsDto(
    decimal SaldoTotal,
    decimal IngresosMes,
    decimal EgresosMes,
    decimal BalanceMes,
    decimal IngresosAnio,
    decimal EgresosAnio,
    IReadOnlyList<SerieMesContDto> UltimosDosMeses);

public record SerieMesContDto(string Mes, decimal Ingresos, decimal Egresos);

// ── Reporte para contador ─────────────────────────────────────────────────────
public record ReporteContadorDto(
    string                           Periodo,
    decimal                          TotalIngresos,
    decimal                          TotalEgresos,
    decimal                          Balance,
    IReadOnlyList<ResumenCuentaDto>  PorCuenta,
    IReadOnlyList<ResumenProgramaDto> PorPrograma,
    IReadOnlyList<MovimientoDto>     Movimientos);

public record ResumenCuentaDto(
    string  CodigoPuc,
    string  Cuenta,
    string  Tipo,
    decimal Total);

public record ResumenProgramaDto(
    string  Programa,
    decimal Ingresos,
    decimal Egresos,
    decimal Balance);

// ── Caja Menor ────────────────────────────────────────────────────────────────
public record LibroAuxiliarItemDto(
    Guid     Id,
    string   Tipo,
    DateOnly Fecha,
    string   Concepto,
    string   CodigoPuc,
    string   CategoriaNombre,
    string?  ProgramaNombre,
    string?  TerceroNombre,
    string?  NumeroSoporte,
    decimal  Ingreso,
    decimal  Egreso,
    decimal  SaldoAcumulado);

public record ArqueoCajaDto(
    int      Id,
    Guid     CuentaId,
    string   CuentaNombre,
    DateOnly Fecha,
    decimal  SaldoSistema,
    decimal  SaldoFisico,
    decimal  Diferencia,
    string?  Observacion,
    string?  Responsable,
    DateTime CreadoEn);

public record CrearArqueoDto(
    Guid     CuentaId,
    DateOnly Fecha,
    decimal  SaldoFisico,
    string?  Observacion,
    string?  Responsable);

public record CrearReposicionDto(
    Guid     CuentaCajaId,
    Guid     CuentaOrigenId,
    DateOnly Fecha,
    decimal  Monto,
    string?  NumeroSoporte,
    string?  Observacion);
