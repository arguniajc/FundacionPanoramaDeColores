namespace FundacionPanorama.Application.Features.Configuracion.DTOs;

public record ConfiguracionDto(
    string? NombreFundacion,
    string? Nit,
    string? Direccion,
    string? Telefono,
    string? NombreRepLegal,
    string? TipoDocRep,
    string? DocumentoRep,
    string? CargoRep,
    string? FirmaRep,
    string? ColorPrimario,
    string? ColorSidebar,
    string? Tagline,
    string? Mision,
    string? Vision,
    string? EmailContacto,
    string? SitioWeb,
    string? MensajeBienvenida,
    string? FooterTexto,
    string? WebContenido,
    DateTime? UpdatedAt);

public record GuardarConfiguracionDto(
    string? NombreFundacion,
    string? Nit,
    string? Direccion,
    string? Telefono,
    string? NombreRepLegal,
    string? TipoDocRep,
    string? DocumentoRep,
    string? CargoRep,
    string? FirmaRep,
    string? ColorPrimario,
    string? ColorSidebar,
    string? Tagline,
    string? Mision,
    string? Vision,
    string? EmailContacto,
    string? SitioWeb,
    string? MensajeBienvenida,
    string? FooterTexto,
    string? WebContenido);

public record ConfiguracionPublicaDto(
    string? NombreFundacion,
    string? EmailContacto,
    string? SitioWeb,
    string? FooterTexto,
    string? WebContenido);
