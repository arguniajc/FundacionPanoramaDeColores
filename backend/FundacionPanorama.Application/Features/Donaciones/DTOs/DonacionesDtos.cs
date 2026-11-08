namespace FundacionPanorama.Application.Features.Donaciones.DTOs;

public record DonacionDto(
    Guid      Id,
    Guid      DonanteId,
    string    NombreDonante,
    string    TipoDonante,
    string    Tipo,
    decimal?  Monto,
    Guid?     ItemId,
    string?   NombreItem,
    decimal?  Cantidad,
    string?   UnidadMedida,
    Guid?     ProgramaId,
    string    NombrePrograma,
    Guid?     SedeId,
    string    NombreSede,
    string?   Descripcion,
    DateTime  FechaDonacion,
    string?   ReciboNumero,
    bool      Activo,
    DateTime  FechaCreacion,
    string?   TipoDocDonante,
    string?   DocumentoDonante,
    string?   EmailDonante,
    string    ReciboEstado
);

public record CrearDonacionDto(
    Guid      DonanteId,
    string    Tipo,
    decimal?  Monto,
    Guid?     ItemId,
    string?   NombreItem,
    decimal?  Cantidad,
    string?   UnidadMedida,
    Guid?     ProgramaId,
    Guid?     SedeId,
    string?   Descripcion,
    DateTime? FechaDonacion,
    string?   ReciboNumero
);

public record StatsDonacionesDto(
    decimal TotalDineroMes,
    decimal TotalDineroAnio,
    decimal TotalDineroTotal,
    int     TotalEspecieMes,
    int     TotalDonantesActivos
);

public record LogEmisionDto(string Accion, string? DestinatarioEmail = null, string? Detalle = null);

/// <summary>Filtros del listado de donaciones. Buscar compara donante (nombre/documento), N° de recibo y artículo.</summary>
public record FiltroDonaciones(
    Guid? DonanteId, string? Tipo, Guid? SedeId, Guid? ProgramaId,
    DateTime? Desde, DateTime? Hasta, string? Buscar);
