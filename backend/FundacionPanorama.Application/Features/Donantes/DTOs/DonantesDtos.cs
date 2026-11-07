using System.ComponentModel.DataAnnotations;

namespace FundacionPanorama.Application.Features.Donantes.DTOs;

public record DonanteDto(
    Guid     Id,
    string   Nombre,
    string   Tipo,
    string?  Documento,
    string?  TipoDocumento,
    string?  Email,
    string?  Telefono,
    string?  Ciudad,
    string?  Pais,
    string?  Departamento,
    string?  Notas,
    bool     Activo,
    DateTime FechaCreacion,
    DateTime FechaModificacion,
    // stats enriquecidos
    int      TotalDonaciones,
    decimal  TotalDinero,
    int      TotalEspecie,
    DateTime? UltimaDonacion
);

public record CrearDonanteDto(
    [Required][StringLength(200)] string  Nombre,
    [StringLength(50)]            string  Tipo,
    [StringLength(30)]            string? Documento,
    [StringLength(30)]            string? TipoDocumento,
    [EmailAddress][StringLength(150)] string? Email,
    [Phone][StringLength(30)]     string? Telefono,
    [StringLength(100)]           string? Ciudad,
    [StringLength(100)]           string? Pais,
    [StringLength(100)]           string? Departamento,
    [StringLength(1000)]          string? Notas
);
