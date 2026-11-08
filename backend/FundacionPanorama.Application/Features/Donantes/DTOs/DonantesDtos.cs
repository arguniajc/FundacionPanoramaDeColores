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

/// <summary>Donante que ya tiene un documento (respuesta de verificar-documento).</summary>
public record DonanteExistente(Guid Id, string Nombre);

// Límites = columnas de donantes (email 150 y telefono 20 en el esquema base; tipo VARCHAR(20)).
public record CrearDonanteDto(
    [Required(ErrorMessage = "El nombre es obligatorio. Ejemplo: Ferretería El Tornillo")]
    [StringLength(200, ErrorMessage = "El nombre no puede superar 200 caracteres.")]           string  Nombre,
    [StringLength(20,  ErrorMessage = "El tipo no es válido (persona o empresa).")]            string  Tipo,
    [StringLength(50,  ErrorMessage = "El documento no puede superar 50 caracteres.")]         string? Documento,
    [StringLength(30,  ErrorMessage = "El tipo de documento no puede superar 30 caracteres.")] string? TipoDocumento,
    [EmailAddress(ErrorMessage = "El correo no es válido. Ejemplo: nombre@empresa.com")]
    [StringLength(150, ErrorMessage = "El correo no puede superar 150 caracteres.")]           string? Email,
    [Phone(ErrorMessage = "El teléfono no es válido. Ejemplo: 3001234567")]
    [StringLength(20,  ErrorMessage = "El teléfono no puede superar 20 caracteres.")]          string? Telefono,
    [StringLength(100, ErrorMessage = "La ciudad no puede superar 100 caracteres.")]           string? Ciudad,
    [StringLength(100, ErrorMessage = "El país no puede superar 100 caracteres.")]             string? Pais,
    [StringLength(100, ErrorMessage = "El departamento no puede superar 100 caracteres.")]     string? Departamento,
    [StringLength(1000, ErrorMessage = "Las notas no pueden superar 1000 caracteres.")]        string? Notas
);
