// Configuración global de la fundación y representante legal (tabla de una sola fila).
using FundacionPanorama.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FundacionPanorama.API.Controllers;

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
    string? FooterTexto);

[ApiController]
[Route("api/configuracion")]
[Authorize]
public class ConfiguracionController : ControllerBase
{
    private readonly AppDbContext _db;
    public ConfiguracionController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Obtener()
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"SELECT nombre_fundacion, nit, direccion, telefono,
                                   nombre_rep_legal, tipo_doc_rep, documento_rep,
                                   cargo_rep, firma_rep,
                                   color_primario, color_sidebar,
                                   tagline, mision, vision,
                                   email_contacto, sitio_web,
                                   mensaje_bienvenida, footer_texto,
                                   updated_at
                            FROM configuracion LIMIT 1";
        await using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync())
            return Ok(new ConfiguracionDto(null, null, null, null, null, null, null, null, null,
                                           null, null, null, null, null, null, null, null, null, null));

        return Ok(new ConfiguracionDto(
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
            r.IsDBNull(13) ? null : r.GetString(13),
            r.IsDBNull(14) ? null : r.GetString(14),
            r.IsDBNull(15) ? null : r.GetString(15),
            r.IsDBNull(16) ? null : r.GetString(16),
            r.IsDBNull(17) ? null : r.GetString(17),
            r.IsDBNull(18) ? null : r.GetDateTime(18)));
    }

    [HttpPut]
    public async Task<IActionResult> Guardar([FromBody] GuardarConfiguracionDto dto)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO configuracion
                (nombre_fundacion, nit, direccion, telefono,
                 nombre_rep_legal, tipo_doc_rep, documento_rep, cargo_rep, firma_rep,
                 color_primario, color_sidebar,
                 tagline, mision, vision,
                 email_contacto, sitio_web, mensaje_bienvenida, footer_texto)
            SELECT @nf, @nit, @dir, @tel, @nrl, @tdr, @docr, @cargo, @firma,
                   @cp, @cs, @tag, @mis, @vis, @email, @web, @bienvenida, @footer
            WHERE NOT EXISTS (SELECT 1 FROM configuracion);

            UPDATE configuracion SET
                nombre_fundacion  = @nf,
                nit               = @nit,
                direccion         = @dir,
                telefono          = @tel,
                nombre_rep_legal  = @nrl,
                tipo_doc_rep      = @tdr,
                documento_rep     = @docr,
                cargo_rep         = @cargo,
                firma_rep         = @firma,
                color_primario    = @cp,
                color_sidebar     = @cs,
                tagline           = @tag,
                mision            = @mis,
                vision            = @vis,
                email_contacto    = @email,
                sitio_web         = @web,
                mensaje_bienvenida = @bienvenida,
                footer_texto      = @footer,
                updated_at        = NOW()";

        cmd.Parameters.AddWithValue("nf",         (object?)dto.NombreFundacion?.Trim()  ?? DBNull.Value);
        cmd.Parameters.AddWithValue("nit",        (object?)dto.Nit?.Trim()              ?? DBNull.Value);
        cmd.Parameters.AddWithValue("dir",        (object?)dto.Direccion?.Trim()        ?? DBNull.Value);
        cmd.Parameters.AddWithValue("tel",        (object?)dto.Telefono?.Trim()         ?? DBNull.Value);
        cmd.Parameters.AddWithValue("nrl",        (object?)dto.NombreRepLegal?.Trim()   ?? DBNull.Value);
        cmd.Parameters.AddWithValue("tdr",        (object?)dto.TipoDocRep?.Trim()       ?? DBNull.Value);
        cmd.Parameters.AddWithValue("docr",       (object?)dto.DocumentoRep?.Trim()     ?? DBNull.Value);
        cmd.Parameters.AddWithValue("cargo",      (object?)dto.CargoRep?.Trim()         ?? DBNull.Value);
        cmd.Parameters.AddWithValue("firma",      (object?)dto.FirmaRep                 ?? DBNull.Value);
        cmd.Parameters.AddWithValue("cp",         (object?)dto.ColorPrimario?.Trim()    ?? DBNull.Value);
        cmd.Parameters.AddWithValue("cs",         (object?)dto.ColorSidebar?.Trim()     ?? DBNull.Value);
        cmd.Parameters.AddWithValue("tag",        (object?)dto.Tagline?.Trim()          ?? DBNull.Value);
        cmd.Parameters.AddWithValue("mis",        (object?)dto.Mision?.Trim()           ?? DBNull.Value);
        cmd.Parameters.AddWithValue("vis",        (object?)dto.Vision?.Trim()           ?? DBNull.Value);
        cmd.Parameters.AddWithValue("email",      (object?)dto.EmailContacto?.Trim()    ?? DBNull.Value);
        cmd.Parameters.AddWithValue("web",        (object?)dto.SitioWeb?.Trim()         ?? DBNull.Value);
        cmd.Parameters.AddWithValue("bienvenida", (object?)dto.MensajeBienvenida?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("footer",     (object?)dto.FooterTexto?.Trim()      ?? DBNull.Value);

        await cmd.ExecuteNonQueryAsync();
        return await Obtener();
    }

    private NpgsqlConnection AbrirConexion() =>
        new(_db.Database.GetConnectionString());
}
