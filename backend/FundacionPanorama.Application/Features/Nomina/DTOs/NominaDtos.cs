namespace FundacionPanorama.Application.Features.Nomina.DTOs;

public static class NominaConstants
{
    public const decimal SMLMV            = 1_423_500m;
    public const decimal AuxilioTransporte = 200_000m;
    public const decimal TasaSalud         = 0.04m;
    public const decimal TasaPension       = 0.04m;
}

public record NominaPeriodoDto(
    int       Id,
    int       Mes,
    string    MesLabel,
    int       Anio,
    DateOnly? FechaPago,
    string    Estado,
    string?   Observacion,
    int       TotalEmpleados,
    decimal   TotalNeto,
    DateTime  CreadoEn);

public record NominaLiquidacionDto(
    int      Id,
    int      PeriodoId,
    Guid     EmpleadoId,
    string   EmpleadoNombre,
    string?  Cargo,
    string?  NumeroDocumento,
    int      DiasTrabajados,
    decimal  SalarioBase,
    decimal  AuxilioTransporte,
    decimal  HorasExtras,
    decimal  Bonificaciones,
    decimal  DeduccionSalud,
    decimal  DeduccionPension,
    decimal  RetencionFuente,
    decimal  OtrasDeducciones,
    decimal  TotalDevengado,
    decimal  TotalDeducciones,
    decimal  NetoPagar,
    string?  Observacion);

public record CrearPeriodoDto(
    int       Mes,
    int       Anio,
    DateOnly? FechaPago,
    string?   Observacion);

public record LiquidarEmpleadoDto(
    Guid     EmpleadoId,
    int      DiasTrabajados,
    decimal? SalarioOverride,
    decimal  HorasExtras,
    decimal  Bonificaciones,
    decimal  RetencionFuente,
    decimal  OtrasDeducciones,
    string?  Observacion);

public record AutoLiquidarDto(bool SoloActivos = true);
