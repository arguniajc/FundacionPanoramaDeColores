// Sube archivos a Supabase Storage y lleva auditoría de descargas de documentos.
using System.Security.Claims;
using FundacionPanorama.API.Data;
using FundacionPanorama.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FundacionPanorama.API.Controllers;

public record LogDescargaDto(Guid BeneficiarioId, string? TipoArchivo, string? UrlArchivo);

[ApiController]
[Route("api/archivos")]
public class ArchivosController : ControllerBase
{
    private readonly SupabaseStorageService _storage;
    private readonly AppDbContext           _db;

    public ArchivosController(SupabaseStorageService storage, AppDbContext db)
    {
        _storage = storage;
        _db      = db;
    }

    // POST api/archivos/upload?carpeta=fotos
    [HttpPost("upload")]
    [Authorize]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload(
        IFormFile archivo,
        [FromQuery] string carpeta = "fotos")
    {
        if (archivo is null || archivo.Length == 0)
            return BadRequest(new { mensaje = "No se recibió ningún archivo." });

        var tiposPermitidos = new[]
        {
            "image/jpeg", "image/jpg", "image/png",
            "image/webp", "image/heic", "image/heif",
            "application/pdf"
        };

        if (!tiposPermitidos.Contains(archivo.ContentType.ToLower()))
            return BadRequest(new { mensaje = "Solo se permiten imágenes (JPG, PNG, WEBP) o PDF." });

        var esPdf    = archivo.ContentType.ToLower() == "application/pdf";
        long maxBytes = esPdf ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
        if (archivo.Length > maxBytes)
            return BadRequest(new { mensaje = esPdf ? "El PDF no puede superar 10 MB." : "La imagen no puede superar 5 MB." });

        if (!SupabaseStorageService.CarpetaPermitida(carpeta))
            return BadRequest(new { mensaje = "Carpeta de destino no válida." });

        // Un fallo de Supabase Storage llega al manejador global: queda en el log
        // con código y el cliente recibe un mensaje sin detalles internos.
        // Devuelve una URL pública (carpeta web) o una referencia "privado://…".
        var url = await _storage.SubirAsync(archivo, carpeta);
        return Ok(new { url });
    }

    public record FirmarDto(List<string> Referencias);

    // POST api/archivos/firmar — enlaces temporales (1 h) para archivos privados.
    // Solo con sesión iniciada; las URLs que no son "privado://" se devuelven igual.
    [HttpPost("firmar")]
    [Authorize]
    public async Task<IActionResult> Firmar([FromBody] FirmarDto dto, CancellationToken ct)
    {
        var refs = (dto.Referencias ?? []).Where(r => !string.IsNullOrWhiteSpace(r)).Distinct().ToList();
        if (refs.Count > 200)
            return BadRequest(new { mensaje = "Máximo 200 archivos por solicitud." });
        return Ok(new { urls = await _storage.FirmarAsync(refs, 3600, ct) });
    }

    // ── Migración de archivos personales al bucket privado (solo administrador) ──

    private bool EsAdministrador() =>
        User.FindFirst(ClaimTypes.Role)?.Value is "administrador" or "Admin";

    private static string Ident(string nombre) => "\"" + nombre.Replace("\"", "\"\"") + "\"";

    // Columnas de texto/JSON de la BD que contienen URLs públicas del bucket
    private async Task<List<(string Tabla, string Columna, string Tipo)>> ColumnasConUrlsAsync(NpgsqlConnection conn, CancellationToken ct)
    {
        var columnas = new List<(string, string, string)>();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                SELECT c.table_name, c.column_name, c.data_type
                FROM information_schema.columns c
                JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
                WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
                  AND c.data_type IN ('text', 'character varying', 'json', 'jsonb')";
            await using var r = await cmd.ExecuteReaderAsync(ct);
            while (await r.ReadAsync(ct)) columnas.Add((r.GetString(0), r.GetString(1), r.GetString(2)));
        }

        var conUrls = new List<(string, string, string)>();
        foreach (var (tabla, col, tipo) in columnas)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT EXISTS (SELECT 1 FROM {Ident(tabla)} WHERE {Ident(col)}::text LIKE @p)";
            cmd.Parameters.AddWithValue("p", "%" + _storage.PrefijoPublicoBucket + "%");
            if ((bool)(await cmd.ExecuteScalarAsync(ct))!) conUrls.Add((tabla, col, tipo));
        }
        return conUrls;
    }

    // URLs públicas de archivos personales (no carpeta web) que aparecen en una columna
    private async Task<HashSet<string>> UrlsMigrablesAsync(NpgsqlConnection conn, string tabla, string col, CancellationToken ct)
    {
        var urls  = new HashSet<string>();
        var regex = new System.Text.RegularExpressions.Regex(
            System.Text.RegularExpressions.Regex.Escape(_storage.PrefijoPublicoBucket) + @"[^""'\s,)\]}\\]+");
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"SELECT {Ident(col)}::text FROM {Ident(tabla)} WHERE {Ident(col)}::text LIKE @p";
        cmd.Parameters.AddWithValue("p", "%" + _storage.PrefijoPublicoBucket + "%");
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            foreach (System.Text.RegularExpressions.Match m in regex.Matches(r.GetString(0)))
                if (_storage.RutaPublicaMigrable(m.Value) is not null) urls.Add(m.Value);
        return urls;
    }

    public record DetalleMigracion(string Tabla, string Columna, int Archivos, int FilasActualizadas);

    // POST api/archivos/migrar-privado?simular=true
    // Copia al bucket privado cada archivo personal referenciado en la BD y cambia la
    // URL pública por "privado://…". Con simular=true solo informa qué haría. Repetible.
    [HttpPost("migrar-privado")]
    [Authorize]
    public async Task<IActionResult> MigrarPrivado([FromQuery] bool simular = true, CancellationToken ct = default)
    {
        if (!EsAdministrador()) return StatusCode(403, new { mensaje = "Solo un administrador puede migrar archivos." });

        await _storage.AsegurarBucketPrivadoAsync(ct);
        await using var conn = AbrirConexion();
        await conn.OpenAsync(ct);

        var detalle  = new List<DetalleMigracion>();
        var copiados = new Dictionary<string, bool>(); // url → copiado OK
        var filasActualizadas = 0;

        foreach (var (tabla, col, tipo) in await ColumnasConUrlsAsync(conn, ct))
        {
            var urls = await UrlsMigrablesAsync(conn, tabla, col, ct);
            if (urls.Count == 0) continue;
            var filasCol = 0;

            if (!simular)
            {
                foreach (var url in urls)
                {
                    if (!copiados.TryGetValue(url, out var ok))
                        copiados[url] = ok = await _storage.CopiarAPrivadoAsync(_storage.RutaPublicaMigrable(url)!, ct);
                    if (!ok) continue; // si no se pudo copiar, la URL pública se conserva

                    await using var upd = conn.CreateCommand();
                    var cast = tipo is "json" or "jsonb" ? "::" + tipo : "";
                    upd.CommandText = $"UPDATE {Ident(tabla)} SET {Ident(col)} = replace({Ident(col)}::text, @url, @ref){cast} " +
                                      $"WHERE {Ident(col)}::text LIKE @like";
                    upd.Parameters.AddWithValue("url",  url);
                    upd.Parameters.AddWithValue("ref",  SupabaseStorageService.PrefijoPrivado + _storage.RutaPublicaMigrable(url));
                    upd.Parameters.AddWithValue("like", "%" + url + "%");
                    filasCol += await upd.ExecuteNonQueryAsync(ct);
                }
                filasActualizadas += filasCol;
            }
            detalle.Add(new DetalleMigracion(tabla, col, urls.Count, filasCol));
        }

        var fallidos = copiados.Where(c => !c.Value).Select(c => c.Key).ToList();
        return Ok(new
        {
            simulacion = simular,
            archivos   = simular ? detalle.Sum(d => d.Archivos) : copiados.Count,
            copiados   = copiados.Count(c => c.Value),
            fallidos,
            filasActualizadas,
            detalle,
        });
    }

    // POST api/archivos/limpiar-publicos
    // Borra del bucket público los archivos personales ya copiados al privado y que
    // ninguna fila de la BD sigue referenciando con su URL pública.
    [HttpPost("limpiar-publicos")]
    [Authorize]
    public async Task<IActionResult> LimpiarPublicos(CancellationToken ct = default)
    {
        if (!EsAdministrador()) return StatusCode(403, new { mensaje = "Solo un administrador puede borrar archivos." });

        await using var conn = AbrirConexion();
        await conn.OpenAsync(ct);

        // Archivos públicos que todavía se usan en la BD: nunca se borran
        var enUso = new HashSet<string>();
        foreach (var (tabla, col, _) in await ColumnasConUrlsAsync(conn, ct))
            foreach (var url in await UrlsMigrablesAsync(conn, tabla, col, ct))
                enUso.Add(_storage.RutaPublicaMigrable(url)!);

        var publicos   = await _storage.ListarPublicosPersonalesAsync(ct);
        var candidatos = publicos.Where(r => !enUso.Contains(r)).ToList();
        // EliminarPublicosMigradosAsync solo borra los que tienen copia en el bucket privado
        var borrados = await _storage.EliminarPublicosMigradosAsync(candidatos, ct);
        return Ok(new { publicos = publicos.Count, borrados, sinCopiaOEnUso = publicos.Count - borrados });
    }

    // GET api/archivos/log-descargas?pagina=1&porPagina=20
    [HttpGet("log-descargas")]
    [Authorize]
    public async Task<IActionResult> ObtenerLog(
        [FromQuery] int pagina    = 1,
        [FromQuery] int porPagina = 20)
    {
        pagina    = Math.Max(1, pagina);
        porPagina = Math.Clamp(porPagina, 1, 100);

        await using var conn = AbrirConexion();
        await conn.OpenAsync();

        long total;
        await using (var cmdCount = conn.CreateCommand())
        {
            cmdCount.CommandText = "SELECT COUNT(*) FROM log_descargas";
            total = (long)(await cmdCount.ExecuteScalarAsync())!;
        }

        var registros = new List<object>();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT l.id, l.usuario_email, l.beneficiario_id,
                   concat_ws(' ', b.primer_nombre, b.segundo_nombre, b.primer_apellido, b.segundo_apellido) AS nombre_beneficiario,
                   l.tipo_archivo, l.url_archivo, l.descargado_en
            FROM log_descargas l
            JOIN beneficiarios b ON b.id = l.beneficiario_id
            ORDER BY l.descargado_en DESC
            LIMIT @limit OFFSET @offset";
        cmd.Parameters.AddWithValue("limit",  porPagina);
        cmd.Parameters.AddWithValue("offset", (pagina - 1) * porPagina);
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
        {
            registros.Add(new
            {
                Id                 = r.GetGuid(0),
                UsuarioEmail       = r.GetString(1),
                BeneficiarioId     = r.GetGuid(2),
                NombreBeneficiario = r.GetString(3),
                TipoArchivo        = r.IsDBNull(4) ? null : r.GetString(4),
                UrlArchivo         = r.IsDBNull(5) ? null : r.GetString(5),
                DescargadoEn       = r.GetDateTime(6),
            });
        }

        return Ok(new { data = registros, total, pagina, porPagina });
    }

    // POST api/archivos/log-descarga
    [HttpPost("log-descarga")]
    [Authorize]
    public async Task<IActionResult> LogDescarga([FromBody] LogDescargaDto dto)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value
                 ?? User.FindFirst("email")?.Value
                 ?? User.Identity?.Name
                 ?? "desconocido";

        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO log_descargas (usuario_email, beneficiario_id, tipo_archivo, url_archivo, descargado_en)
            VALUES (@email, @bid, @tipo, @url, NOW())";
        cmd.Parameters.AddWithValue("email", email);
        cmd.Parameters.AddWithValue("bid",   dto.BeneficiarioId);
        cmd.Parameters.AddWithValue("tipo",  dto.TipoArchivo ?? "documento");
        cmd.Parameters.AddWithValue("url",   (object?)dto.UrlArchivo ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync();
        return Ok();
    }

    private NpgsqlConnection AbrirConexion() => new(_db.Database.GetConnectionString());
}
