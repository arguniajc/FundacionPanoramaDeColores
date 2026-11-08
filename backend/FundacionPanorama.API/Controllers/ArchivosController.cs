// Sube archivos a Supabase Storage y lleva auditoría de descargas de documentos.
using System.Security.Claims;
using FundacionPanorama.API.Filters;
using FundacionPanorama.API.Services;
using FundacionPanorama.Application.Features.Archivos;
using FundacionPanorama.Application.Features.Archivos.DTOs;
using FundacionPanorama.Application.Features.Archivos.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/archivos")]
public class ArchivosController : ControllerBase
{
    private readonly SupabaseStorageService             _storage;
    private readonly IAlmacenamientoMigracionRepository _migracion;
    private readonly ArchivosService                    _archivos;

    public ArchivosController(SupabaseStorageService storage, IAlmacenamientoMigracionRepository migracion, ArchivosService archivos)
    {
        _storage   = storage;
        _migracion = migracion;
        _archivos  = archivos;
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

        // Cada carpeta exige el permiso de su módulo (p. ej. "web" —bucket público— solo Configuración)
        if (!await Permisos.TieneAlgunoAsync(HttpContext, PermisosArchivos.ParaSubir(carpeta)))
            return StatusCode(403, new { mensaje = "No tienes permiso para subir archivos en esta sección." });

        // Un fallo de Supabase Storage llega al manejador global: queda en el log
        // con código y el cliente recibe un mensaje sin detalles internos.
        // Devuelve una URL pública (carpeta web) o una referencia "privado://…".
        var url = await _storage.SubirAsync(archivo, carpeta);
        return Ok(new { url });
    }

    public record FirmarDto(List<string> Referencias);

    // POST api/archivos/firmar — enlaces temporales (1 h) para archivos privados.
    // Las URLs que no son "privado://" se devuelven igual. Una referencia privada solo
    // se firma si el rol puede ver el módulo de su carpeta; si no, queda fuera de la respuesta.
    [HttpPost("firmar")]
    [Authorize]
    public async Task<IActionResult> Firmar([FromBody] FirmarDto dto, CancellationToken ct)
    {
        var refs = (dto.Referencias ?? []).Where(r => !string.IsNullOrWhiteSpace(r)).Distinct().ToList();
        if (refs.Count > 200)
            return BadRequest(new { mensaje = "Máximo 200 archivos por solicitud." });
        var permitidas = new List<string>();
        var cache = new Dictionary<string, bool>();   // un chequeo por carpeta, no por archivo
        foreach (var r in refs)
        {
            if (!r.StartsWith(SupabaseStorageService.PrefijoPrivado, StringComparison.Ordinal)) { permitidas.Add(r); continue; }
            var ruta = r[SupabaseStorageService.PrefijoPrivado.Length..];
            var necesarios = PermisosArchivos.ParaLeer(ruta);
            var clave = string.Join(',', necesarios);
            if (!cache.TryGetValue(clave, out var ok))
                cache[clave] = ok = necesarios.Length > 0
                    ? await Permisos.TieneAlgunoAsync(HttpContext, necesarios)
                    : Permisos.EsAdministrador(User) && PermisosArchivos.RutaSegura(ruta);
            if (ok) permitidas.Add(r);
        }
        return Ok(new { urls = await _storage.FirmarAsync(permitidas, 3600, ct) });
    }

    // ── Migración de archivos personales al bucket privado (solo administrador) ──

    private bool EsAdministrador() =>
        User.FindFirst(ClaimTypes.Role)?.Value is "administrador" or "Admin";

    // Columnas de texto/JSON de la BD que contienen URLs públicas del bucket
    private Task<List<ColumnaConUrls>> ColumnasConUrlsAsync(CancellationToken ct)
        => _migracion.ColumnasConPrefijoAsync(_storage.PrefijoPublicoBucket, ct);

    // URLs públicas de archivos personales (no carpeta web) que aparecen en una columna
    private async Task<HashSet<string>> UrlsMigrablesAsync(ColumnaConUrls columna, CancellationToken ct)
    {
        var urls  = new HashSet<string>();
        var regex = new System.Text.RegularExpressions.Regex(
            System.Text.RegularExpressions.Regex.Escape(_storage.PrefijoPublicoBucket) + @"[^""'\s,)\]}\\]+");
        foreach (var valor in await _migracion.ValoresConPrefijoAsync(columna.Tabla, columna.Columna, _storage.PrefijoPublicoBucket, ct))
            foreach (System.Text.RegularExpressions.Match m in regex.Matches(valor))
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

        var detalle  = new List<DetalleMigracion>();
        var copiados = new Dictionary<string, bool>(); // url → copiado OK
        var filasActualizadas = 0;

        foreach (var columna in await ColumnasConUrlsAsync(ct))
        {
            var urls = await UrlsMigrablesAsync(columna, ct);
            if (urls.Count == 0) continue;
            var filasCol = 0;

            if (!simular)
            {
                foreach (var url in urls)
                {
                    if (!copiados.TryGetValue(url, out var ok))
                        copiados[url] = ok = await _storage.CopiarAPrivadoAsync(_storage.RutaPublicaMigrable(url)!, ct);
                    if (!ok) continue; // si no se pudo copiar, la URL pública se conserva

                    filasCol += await _migracion.ReemplazarAsync(columna, url,
                        SupabaseStorageService.PrefijoPrivado + _storage.RutaPublicaMigrable(url), ct);
                }
                filasActualizadas += filasCol;
            }
            detalle.Add(new DetalleMigracion(columna.Tabla, columna.Columna, urls.Count, filasCol));
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

        // Archivos públicos que todavía se usan en la BD: nunca se borran
        var enUso = new HashSet<string>();
        foreach (var columna in await ColumnasConUrlsAsync(ct))
            foreach (var url in await UrlsMigrablesAsync(columna, ct))
                enUso.Add(_storage.RutaPublicaMigrable(url)!);

        var publicos   = await _storage.ListarPublicosPersonalesAsync(ct);
        var candidatos = publicos.Where(r => !enUso.Contains(r)).ToList();
        // EliminarPublicosMigradosAsync solo borra los que tienen copia en el bucket privado
        var borrados = await _storage.EliminarPublicosMigradosAsync(candidatos, ct);
        return Ok(new { publicos = publicos.Count, borrados, sinCopiaOEnUso = publicos.Count - borrados });
    }

    // GET api/archivos/log-descargas?pagina=1&porPagina=20
    [HttpGet("log-descargas")]
    [RequierePermiso("log_descargas", "ver")]
    public async Task<IActionResult> ObtenerLog(
        [FromQuery] int pagina    = 1,
        [FromQuery] int porPagina = 20)
        => Ok(await _archivos.ObtenerLogAsync(pagina, porPagina));

    // GET api/archivos/log-exportaciones?pagina=1&porPagina=20
    [HttpGet("log-exportaciones")]
    [RequierePermiso("log_descargas", "ver")]
    public async Task<IActionResult> ObtenerExportaciones(
        [FromQuery] int pagina    = 1,
        [FromQuery] int porPagina = 20)
        => Ok(await _archivos.ObtenerExportacionesAsync(pagina, porPagina));

    // POST api/archivos/log-exportacion — el panel lo llama tras generar un Excel
    [HttpPost("log-exportacion")]
    [Authorize]
    public async Task<IActionResult> LogExportacion([FromBody] LogExportacionDto dto)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value ?? User.Identity?.Name ?? "desconocido";
        await _archivos.RegistrarExportacionAsync(email, dto);
        return Ok();
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

        await _archivos.RegistrarDescargaAsync(email, dto);
        return Ok();
    }
}
