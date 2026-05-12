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
    string? FirmaRep);

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
                                   cargo_rep, firma_rep, updated_at
                            FROM configuracion LIMIT 1";
        await using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync())
            return Ok(new ConfiguracionDto(null, null, null, null, null, null, null, null, null, null));

        return Ok(new ConfiguracionDto(
            r.IsDBNull(0) ? null : r.GetString(0),
            r.IsDBNull(1) ? null : r.GetString(1),
            r.IsDBNull(2) ? null : r.GetString(2),
            r.IsDBNull(3) ? null : r.GetString(3),
            r.IsDBNull(4) ? null : r.GetString(4),
            r.IsDBNull(5) ? null : r.GetString(5),
            r.IsDBNull(6) ? null : r.GetString(6),
            r.IsDBNull(7) ? null : r.GetString(7),
            r.IsDBNull(8) ? null : r.GetString(8),
            r.IsDBNull(9) ? null : r.GetDateTime(9)));
    }

    [HttpPut]
    public async Task<IActionResult> Guardar([FromBody] GuardarConfiguracionDto dto)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        // Upsert: INSERT si no existe ninguna fila, luego UPDATE siempre
        cmd.CommandText = @"
            INSERT INTO configuracion
                (nombre_fundacion, nit, direccion, telefono,
                 nombre_rep_legal, tipo_doc_rep, documento_rep, cargo_rep, firma_rep)
            SELECT @nf, @nit, @dir, @tel, @nrl, @tdr, @docr, @cargo, @firma
            WHERE NOT EXISTS (SELECT 1 FROM configuracion);

            UPDATE configuracion SET
                nombre_fundacion = @nf,
                nit              = @nit,
                direccion        = @dir,
                telefono         = @tel,
                nombre_rep_legal = @nrl,
                tipo_doc_rep     = @tdr,
                documento_rep    = @docr,
                cargo_rep        = @cargo,
                firma_rep        = @firma,
                updated_at       = NOW()";

        cmd.Parameters.AddWithValue("nf",    (object?)dto.NombreFundacion?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("nit",   (object?)dto.Nit?.Trim()             ?? DBNull.Value);
        cmd.Parameters.AddWithValue("dir",   (object?)dto.Direccion?.Trim()       ?? DBNull.Value);
        cmd.Parameters.AddWithValue("tel",   (object?)dto.Telefono?.Trim()        ?? DBNull.Value);
        cmd.Parameters.AddWithValue("nrl",   (object?)dto.NombreRepLegal?.Trim()  ?? DBNull.Value);
        cmd.Parameters.AddWithValue("tdr",   (object?)dto.TipoDocRep?.Trim()      ?? DBNull.Value);
        cmd.Parameters.AddWithValue("docr",  (object?)dto.DocumentoRep?.Trim()    ?? DBNull.Value);
        cmd.Parameters.AddWithValue("cargo", (object?)dto.CargoRep?.Trim()        ?? DBNull.Value);
        cmd.Parameters.AddWithValue("firma", (object?)dto.FirmaRep               ?? DBNull.Value);

        await cmd.ExecuteNonQueryAsync();
        return await Obtener();
    }

    private NpgsqlConnection AbrirConexion() =>
        new(_db.Database.GetConnectionString());
}
