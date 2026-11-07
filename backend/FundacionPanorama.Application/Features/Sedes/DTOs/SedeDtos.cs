// DTOs del módulo Sedes y Programas. Nombres y propiedades son el contrato JSON: no cambiarlos.
namespace FundacionPanorama.Application.Features.Sedes.DTOs;

public record SedeDto(Guid Id, string Nombre, string? Direccion, string? Ciudad, string? Telefono, bool Activo, DateTime FechaCreacion, DateTime FechaModificacion, List<ProgramaDto> Programas);
public record ProgramaDto(Guid Id, Guid SedeId, string NombreSede, string Nombre, string? Descripcion, int? CupoMaximo, bool Activo, bool TieneTercero, string? NombreTercero, DateTime FechaCreacion, DateTime FechaModificacion, bool RepAutorizado, DateTime? RepAutorizacionFecha, string? RepFirma, string? RepNombre, string? RepDocumento, string? RepCargo, string? TerceroRepNombre, string? TerceroRepTipoDoc, string? TerceroRepDocumento, string? TerceroRepCargo, string? TerceroRepFirma);
public record CrearSedeDto(string Nombre, string? Direccion, string? Ciudad, string? Telefono);
public record CrearProgramaDto(Guid SedeId, string Nombre, string? Descripcion, int? CupoMaximo, bool TieneTercero = false, string? NombreTercero = null, string? TerceroRepNombre = null, string? TerceroRepTipoDoc = null, string? TerceroRepDocumento = null, string? TerceroRepCargo = null, string? TerceroRepFirma = null);
public record CampoDto(Guid Id, Guid ProgramaId, string Etiqueta, string Tipo, bool Obligatorio, string[]? Opciones, int Orden, bool Activo, string? Seccion, int Columnas, DateTime FechaCreacion, DateTime FechaModificacion);
public record CrearCampoDto(string Etiqueta, string Tipo, bool Obligatorio, string[]? Opciones, int Orden, string? Seccion, int? Columnas);

/// <summary>Datos del representante legal guardados en la tabla configuracion.</summary>
public record RepLegalConfig(string? Nombre, string? Documento, string? Cargo, string? Firma);

public enum EstadoResultadoSede { Ok, NoEncontrado, Invalido }

/// <summary>
/// Resultado de una operación del servicio. El controller lo traduce a HTTP:
/// Ok → 200 con Valor; NoEncontrado → 404 (con { mensaje } si Mensaje no es null);
/// Invalido → 400 { mensaje }.
/// </summary>
public sealed class ResultadoSede<T>
{
    public EstadoResultadoSede Estado  { get; private init; }
    public T?                  Valor   { get; private init; }
    public string?             Mensaje { get; private init; }

    public static ResultadoSede<T> Ok(T? valor)                         => new() { Estado = EstadoResultadoSede.Ok, Valor = valor };
    public static ResultadoSede<T> NoEncontrado(string? mensaje = null) => new() { Estado = EstadoResultadoSede.NoEncontrado, Mensaje = mensaje };
    public static ResultadoSede<T> Invalido(string mensaje)             => new() { Estado = EstadoResultadoSede.Invalido, Mensaje = mensaje };
}
