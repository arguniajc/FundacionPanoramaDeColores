namespace FundacionPanorama.Application.Features.Configuracion.DTOs;

public record ConfiguracionDto(
    string?   NombreFundacion,
    string?   Nit,
    string?   Direccion,
    string?   Telefono,
    string?   NombreRepLegal,
    string?   TipoDocRep,
    string?   DocumentoRep,
    string?   CargoRep,
    string?   FirmaRep,
    string?   ColorPrimario,
    string?   ColorSidebar,
    string?   Tagline,
    string?   Mision,
    string?   Vision,
    string?   EmailContacto,
    string?   SitioWeb,
    string?   MensajeBienvenida,
    string?   FooterTexto,
    string?   WebContenido,
    // SMTP (contraseña NO se devuelve, solo indicador de si está configurada)
    string?   SmtpHost,
    int?      SmtpPuerto,
    string?   SmtpUsuario,
    bool      SmtpClaveGuardada,
    string?   SmtpDeNombre,
    string?   SmtpDeEmail,
    bool      SmtpSsl,
    DateTime? UpdatedAt);

public record GuardarConfiguracionDto(
    string?   NombreFundacion,
    string?   Nit,
    string?   Direccion,
    string?   Telefono,
    string?   NombreRepLegal,
    string?   TipoDocRep,
    string?   DocumentoRep,
    string?   CargoRep,
    string?   FirmaRep,
    string?   ColorPrimario,
    string?   ColorSidebar,
    string?   Tagline,
    string?   Mision,
    string?   Vision,
    string?   EmailContacto,
    string?   SitioWeb,
    string?   MensajeBienvenida,
    string?   FooterTexto,
    string?   WebContenido,
    // SMTP
    string?   SmtpHost,
    int?      SmtpPuerto,
    string?   SmtpUsuario,
    string?   SmtpClave,       // contraseña real; si es null/vacío no se modifica la existente
    string?   SmtpDeNombre,
    string?   SmtpDeEmail,
    bool      SmtpSsl);

public record ConfiguracionPublicaDto(
    string? NombreFundacion,
    string? EmailContacto,
    string? SitioWeb,
    string? FooterTexto,
    string? WebContenido,
    string? ColorPrimario,
    string? ColorSidebar);

// Configuración SMTP completa (incluye contraseña) — solo uso interno del EmailService
public record SmtpConfig(
    string Host,
    int    Puerto,
    string Usuario,
    string Clave,
    string DeNombre,
    string DeEmail,
    bool   Ssl);
