namespace FundacionPanorama.Application.Features.TalentoHumano.DTOs;

public record EmpleadoResumenDto(
    Guid     Id,
    string   Nombres,
    string   Apellidos,
    string?  TipoDocumento,
    string?  NumeroDocumento,
    string?  Cargo,
    string?  Area,
    Guid?    SedeId,
    string?  SedeNombre,
    string?  TipoContrato,
    DateOnly? FechaIngreso,
    DateOnly? FechaFinContrato,
    bool     Activo,
    string?  FotoUrl,
    string?  Email,
    string?  Telefono,
    int      NovedadesPendientes);

public record EmpleadoDto(
    Guid     Id,
    string   Nombres,
    string   Apellidos,
    string?  TipoDocumento,
    string?  NumeroDocumento,
    string?  Email,
    string?  Telefono,
    string?  Celular,
    string?  Cargo,
    string?  Area,
    Guid?    SedeId,
    string?  SedeNombre,
    string?  TipoContrato,
    DateOnly? FechaIngreso,
    DateOnly? FechaFinContrato,
    decimal? Salario,
    string?  Eps,
    string?  Pension,
    bool     Activo,
    string?  FotoUrl,
    string?  Notas,
    DateTime FechaCreacion);

public record CrearEmpleadoDto(
    string   Nombres,
    string   Apellidos,
    string?  TipoDocumento,
    string?  NumeroDocumento,
    string?  Email,
    string?  Telefono,
    string?  Celular,
    string?  Cargo,
    string?  Area,
    Guid?    SedeId,
    string?  TipoContrato,
    DateOnly? FechaIngreso,
    DateOnly? FechaFinContrato,
    decimal? Salario,
    string?  Eps,
    string?  Pension,
    string?  Notas);

public record ActualizarEmpleadoDto(
    string   Nombres,
    string   Apellidos,
    string?  TipoDocumento,
    string?  NumeroDocumento,
    string?  Email,
    string?  Telefono,
    string?  Celular,
    string?  Cargo,
    string?  Area,
    Guid?    SedeId,
    string?  TipoContrato,
    DateOnly? FechaIngreso,
    DateOnly? FechaFinContrato,
    decimal? Salario,
    string?  Eps,
    string?  Pension,
    bool     Activo,
    string?  Notas);

public record NovedadDto(
    Guid     Id,
    Guid     EmpleadoId,
    string   EmpleadoNombre,
    string   Tipo,
    DateOnly FechaInicio,
    DateOnly? FechaFin,
    int?     Dias,
    string?  Descripcion,
    string   Estado,
    DateTime FechaCreacion);

public record CrearNovedadDto(
    string   Tipo,
    DateOnly FechaInicio,
    DateOnly? FechaFin,
    int?     Dias,
    string?  Descripcion);

public record ActualizarNovedadDto(
    string   Tipo,
    DateOnly FechaInicio,
    DateOnly? FechaFin,
    int?     Dias,
    string?  Descripcion,
    string   Estado);

public record TalentoHumanoStatsDto(
    int Total,
    int Activos,
    int ContratosProximosVencer,
    int NovedadesPendientes);
