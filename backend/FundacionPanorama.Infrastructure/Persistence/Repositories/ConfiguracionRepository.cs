using FundacionPanorama.Application.Features.Configuracion.DTOs;
using FundacionPanorama.Application.Features.Configuracion.Interfaces;
using Npgsql;

namespace FundacionPanorama.Infrastructure.Persistence.Repositories;

public class ConfiguracionRepository(DbConnectionFactory factory) : IConfiguracionRepository
{
    public async Task<ConfiguracionDto?> ObtenerAsync(CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT nombre_fundacion, nit, direccion, telefono,
                   nombre_rep_legal, tipo_doc_rep, documento_rep, cargo_rep, firma_rep,
                   color_primario, color_sidebar,
                   color_secundario, color_gradiente,
                   color_oscuro_fondo, color_oscuro_paper, color_oscuro_sidebar,
                   color_acento, font_family,
                   tagline, mision, vision,
                   email_contacto, sitio_web, mensaje_bienvenida, footer_texto, web_contenido,
                   smtp_host, smtp_puerto, smtp_usuario,
                   (smtp_clave IS NOT NULL AND smtp_clave <> '') AS smtp_clave_guardada,
                   smtp_de_nombre, smtp_de_email, COALESCE(smtp_ssl, true) AS smtp_ssl,
                   updated_at
            FROM configuracion LIMIT 1";

        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct)) return null;

        return new ConfiguracionDto(
            r.IsDBNull(0)  ? null : r.GetString(0),   // NombreFundacion
            r.IsDBNull(1)  ? null : r.GetString(1),   // Nit
            r.IsDBNull(2)  ? null : r.GetString(2),   // Direccion
            r.IsDBNull(3)  ? null : r.GetString(3),   // Telefono
            r.IsDBNull(4)  ? null : r.GetString(4),   // NombreRepLegal
            r.IsDBNull(5)  ? null : r.GetString(5),   // TipoDocRep
            r.IsDBNull(6)  ? null : r.GetString(6),   // DocumentoRep
            r.IsDBNull(7)  ? null : r.GetString(7),   // CargoRep
            r.IsDBNull(8)  ? null : r.GetString(8),   // FirmaRep
            r.IsDBNull(9)  ? null : r.GetString(9),   // ColorPrimario
            r.IsDBNull(10) ? null : r.GetString(10),  // ColorSidebar
            r.IsDBNull(11) ? null : r.GetString(11),  // ColorSecundario
            r.IsDBNull(12) ? null : r.GetString(12),  // ColorGradiente
            r.IsDBNull(13) ? null : r.GetString(13),  // ColorOscuroFondo
            r.IsDBNull(14) ? null : r.GetString(14),  // ColorOscuroPaper
            r.IsDBNull(15) ? null : r.GetString(15),  // ColorOscuroSidebar
            r.IsDBNull(16) ? null : r.GetString(16),  // ColorAccento
            r.IsDBNull(17) ? null : r.GetString(17),  // FontFamily
            r.IsDBNull(18) ? null : r.GetString(18),  // Tagline
            r.IsDBNull(19) ? null : r.GetString(19),  // Mision
            r.IsDBNull(20) ? null : r.GetString(20),  // Vision
            r.IsDBNull(21) ? null : r.GetString(21),  // EmailContacto
            r.IsDBNull(22) ? null : r.GetString(22),  // SitioWeb
            r.IsDBNull(23) ? null : r.GetString(23),  // MensajeBienvenida
            r.IsDBNull(24) ? null : r.GetString(24),  // FooterTexto
            r.IsDBNull(25) ? null : r.GetString(25),  // WebContenido
            r.IsDBNull(26) ? null : r.GetString(26),  // SmtpHost
            r.IsDBNull(27) ? null  : r.GetInt32(27),  // SmtpPuerto
            r.IsDBNull(28) ? null : r.GetString(28),  // SmtpUsuario
            !r.IsDBNull(29) && r.GetBoolean(29),       // SmtpClaveGuardada
            r.IsDBNull(30) ? null : r.GetString(30),  // SmtpDeNombre
            r.IsDBNull(31) ? null : r.GetString(31),  // SmtpDeEmail
            !r.IsDBNull(32) && r.GetBoolean(32),       // SmtpSsl
            r.IsDBNull(33) ? null : r.GetDateTime(33));// UpdatedAt
    }

    public async Task<ConfiguracionPublicaDto?> ObtenerPublicaAsync(CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT nombre_fundacion, email_contacto, sitio_web, footer_texto, web_contenido,
                   color_primario, color_sidebar,
                   color_secundario, color_gradiente,
                   color_oscuro_fondo, color_oscuro_paper, color_oscuro_sidebar,
                   color_acento, font_family
            FROM configuracion LIMIT 1";

        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct)) return null;

        return new ConfiguracionPublicaDto(
            r.IsDBNull(0)  ? null : r.GetString(0),
            r.IsDBNull(1)  ? null : r.GetString(1),
            r.IsDBNull(2)  ? null : r.GetString(2),
            r.IsDBNull(3)  ? null : r.GetString(3),
            r.IsDBNull(4)  ? null : r.GetString(4),
            r.IsDBNull(5)  ? null : r.GetString(5),
            r.IsDBNull(6)  ? null : r.GetString(6),
            r.IsDBNull(7)  ? null : r.GetString(7),
            r.IsDBNull(8)  ? null : r.GetString(8),
            r.IsDBNull(9)  ? null : r.GetString(9),
            r.IsDBNull(10) ? null : r.GetString(10),
            r.IsDBNull(11) ? null : r.GetString(11),
            r.IsDBNull(12) ? null : r.GetString(12),
            r.IsDBNull(13) ? null : r.GetString(13));
    }

    public async Task<SmtpConfig?> ObtenerSmtpAsync(CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT smtp_host, smtp_puerto, smtp_usuario, smtp_clave,
                   smtp_de_nombre, smtp_de_email, COALESCE(smtp_ssl, true)
            FROM configuracion LIMIT 1";

        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct)) return null;
        if (r.IsDBNull(0) || r.IsDBNull(2) || r.IsDBNull(3)) return null;
        if (string.IsNullOrWhiteSpace(r.GetString(0)) ||
            string.IsNullOrWhiteSpace(r.GetString(2)) ||
            string.IsNullOrWhiteSpace(r.GetString(3))) return null;

        return new SmtpConfig(
            r.GetString(0),
            r.IsDBNull(1) ? 587 : r.GetInt32(1),
            r.GetString(2),
            r.GetString(3),
            r.IsDBNull(4) ? "" : r.GetString(4),
            r.IsDBNull(5) ? "" : r.GetString(5),
            !r.IsDBNull(6) && r.GetBoolean(6));
    }

    public async Task<ConfiguracionDto> GuardarAsync(GuardarConfiguracionDto dto, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO configuracion
                (nombre_fundacion, nit, direccion, telefono,
                 nombre_rep_legal, tipo_doc_rep, documento_rep, cargo_rep, firma_rep,
                 color_primario, color_sidebar,
                 color_secundario, color_gradiente,
                 color_oscuro_fondo, color_oscuro_paper, color_oscuro_sidebar,
                 color_acento, font_family,
                 tagline, mision, vision,
                 email_contacto, sitio_web, mensaje_bienvenida, footer_texto, web_contenido,
                 smtp_host, smtp_puerto, smtp_usuario, smtp_clave,
                 smtp_de_nombre, smtp_de_email, smtp_ssl)
            SELECT @nf, @nit, @dir, @tel, @nrl, @tdr, @docr, @cargo, @firma,
                   @cp, @cs, @csec, @cgr, @cof, @cop, @cos, @cac, @ff,
                   @tag, @mis, @vis, @email, @web, @bienvenida, @footer, @webcon,
                   @smtpHost, @smtpPuerto, @smtpUsu, @smtpClave,
                   @smtpDeNombre, @smtpDeEmail, @smtpSsl
            WHERE NOT EXISTS (SELECT 1 FROM configuracion);

            UPDATE configuracion SET
                nombre_fundacion     = @nf,
                nit                  = @nit,
                direccion            = @dir,
                telefono             = @tel,
                nombre_rep_legal     = @nrl,
                tipo_doc_rep         = @tdr,
                documento_rep        = @docr,
                cargo_rep            = @cargo,
                firma_rep            = @firma,
                color_primario       = @cp,
                color_sidebar        = @cs,
                color_secundario     = @csec,
                color_gradiente      = @cgr,
                color_oscuro_fondo   = @cof,
                color_oscuro_paper   = @cop,
                color_oscuro_sidebar = @cos,
                color_acento         = @cac,
                font_family          = @ff,
                tagline              = @tag,
                mision               = @mis,
                vision               = @vis,
                email_contacto       = @email,
                sitio_web            = @web,
                mensaje_bienvenida   = @bienvenida,
                footer_texto         = @footer,
                web_contenido        = @webcon,
                smtp_host            = @smtpHost,
                smtp_puerto          = @smtpPuerto,
                smtp_usuario         = @smtpUsu,
                smtp_clave           = CASE WHEN @smtpClave IS NULL OR @smtpClave = ''
                                            THEN smtp_clave
                                            ELSE @smtpClave END,
                smtp_de_nombre       = @smtpDeNombre,
                smtp_de_email        = @smtpDeEmail,
                smtp_ssl             = @smtpSsl,
                updated_at           = NOW()";

        cmd.Parameters.AddWithValue("nf",         (object?)dto.NombreFundacion?.Trim()    ?? DBNull.Value);
        cmd.Parameters.AddWithValue("nit",        (object?)dto.Nit?.Trim()                ?? DBNull.Value);
        cmd.Parameters.AddWithValue("dir",        (object?)dto.Direccion?.Trim()          ?? DBNull.Value);
        cmd.Parameters.AddWithValue("tel",        (object?)dto.Telefono?.Trim()           ?? DBNull.Value);
        cmd.Parameters.AddWithValue("nrl",        (object?)dto.NombreRepLegal?.Trim()     ?? DBNull.Value);
        cmd.Parameters.AddWithValue("tdr",        (object?)dto.TipoDocRep?.Trim()         ?? DBNull.Value);
        cmd.Parameters.AddWithValue("docr",       (object?)dto.DocumentoRep?.Trim()       ?? DBNull.Value);
        cmd.Parameters.AddWithValue("cargo",      (object?)dto.CargoRep?.Trim()           ?? DBNull.Value);
        cmd.Parameters.Add(new NpgsqlParameter("firma", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)dto.FirmaRep ?? DBNull.Value });
        cmd.Parameters.AddWithValue("cp",         (object?)dto.ColorPrimario?.Trim()      ?? DBNull.Value);
        cmd.Parameters.AddWithValue("cs",         (object?)dto.ColorSidebar?.Trim()       ?? DBNull.Value);
        cmd.Parameters.AddWithValue("csec",       (object?)dto.ColorSecundario?.Trim()    ?? DBNull.Value);
        cmd.Parameters.AddWithValue("cgr",        (object?)dto.ColorGradiente?.Trim()     ?? DBNull.Value);
        cmd.Parameters.AddWithValue("cof",        (object?)dto.ColorOscuroFondo?.Trim()   ?? DBNull.Value);
        cmd.Parameters.AddWithValue("cop",        (object?)dto.ColorOscuroPaper?.Trim()   ?? DBNull.Value);
        cmd.Parameters.AddWithValue("cos",        (object?)dto.ColorOscuroSidebar?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("cac",        (object?)dto.ColorAccento?.Trim()       ?? DBNull.Value);
        cmd.Parameters.AddWithValue("ff",         (object?)dto.FontFamily?.Trim()         ?? DBNull.Value);
        cmd.Parameters.AddWithValue("tag",        (object?)dto.Tagline?.Trim()            ?? DBNull.Value);
        cmd.Parameters.AddWithValue("mis",        (object?)dto.Mision?.Trim()             ?? DBNull.Value);
        cmd.Parameters.AddWithValue("vis",        (object?)dto.Vision?.Trim()             ?? DBNull.Value);
        cmd.Parameters.AddWithValue("email",      (object?)dto.EmailContacto?.Trim()      ?? DBNull.Value);
        cmd.Parameters.AddWithValue("web",        (object?)dto.SitioWeb?.Trim()           ?? DBNull.Value);
        cmd.Parameters.AddWithValue("bienvenida", (object?)dto.MensajeBienvenida?.Trim()  ?? DBNull.Value);
        cmd.Parameters.AddWithValue("footer",     (object?)dto.FooterTexto?.Trim()        ?? DBNull.Value);
        cmd.Parameters.AddWithValue("webcon",     (object?)dto.WebContenido               ?? DBNull.Value);
        cmd.Parameters.AddWithValue("smtpHost",    (object?)dto.SmtpHost?.Trim()          ?? DBNull.Value);
        cmd.Parameters.Add(new NpgsqlParameter("smtpPuerto", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)dto.SmtpPuerto ?? DBNull.Value });
        cmd.Parameters.AddWithValue("smtpUsu",     (object?)dto.SmtpUsuario?.Trim()       ?? DBNull.Value);
        cmd.Parameters.Add(new NpgsqlParameter("smtpClave", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)dto.SmtpClave?.Trim() ?? DBNull.Value });
        cmd.Parameters.AddWithValue("smtpDeNombre",(object?)dto.SmtpDeNombre?.Trim()      ?? DBNull.Value);
        cmd.Parameters.AddWithValue("smtpDeEmail", (object?)dto.SmtpDeEmail?.Trim()       ?? DBNull.Value);
        cmd.Parameters.Add(new NpgsqlParameter("smtpSsl", NpgsqlTypes.NpgsqlDbType.Boolean) { Value = dto.SmtpSsl });

        await cmd.ExecuteNonQueryAsync(ct);
        return (await ObtenerAsync(ct))!;
    }
}
