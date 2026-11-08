using FundacionPanorama.Infrastructure.Persistence;
using System.Text.Json;
using FundacionPanorama.API.Services;
using FundacionPanorama.API.Data;
using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Contabilidad;
using FundacionPanorama.Application.Features.Contabilidad.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Timeouts;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Npgsql;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/contabilidad")]
[Authorize]
public class ContabilidadController(
    ContabilidadService svc,
    IHttpClientFactory httpFactory,
    IConfiguration configuration,
    DbConnectionFactory db) : BaseController
{
    private NpgsqlConnection AbrirConexion() => db.Create();
    // ── Categorías ─────────────────────────────────────────────────────────────

    [HttpGet("categorias")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> ListarCategorias([FromQuery] string? tipo, CancellationToken ct)
        => Ok(await svc.ListarCategoriasAsync(tipo, ct));

    // ── Cuentas ────────────────────────────────────────────────────────────────

    [HttpGet("cuentas")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> ListarCuentas(CancellationToken ct)
        => Ok(await svc.ListarCuentasAsync(ct));

    [HttpPost("cuentas")]
    [RequierePermiso("contabilidad", "crear")]
    public async Task<IActionResult> CrearCuenta([FromBody] CrearCuentaCajaDto dto, CancellationToken ct)
    {
        var c = await svc.CrearCuentaAsync(dto, ct);
        await using var conn = AbrirConexion(); await conn.OpenAsync();
        await RegistrarAuditAsync(conn, null, "contabilidad_cuenta", c.Id.ToString(), c.Nombre, "creado");
        return Ok(c);
    }

    [HttpPut("cuentas/{id:guid}")]
    [RequierePermiso("contabilidad", "editar")]
    public async Task<IActionResult> ActualizarCuenta(Guid id, [FromBody] CrearCuentaCajaDto dto, CancellationToken ct)
    {
        var c = await svc.ActualizarCuentaAsync(id, dto, ct);
        if (c is null) return NotFound();
        await using var conn = AbrirConexion(); await conn.OpenAsync();
        await RegistrarAuditAsync(conn, null, "contabilidad_cuenta", id.ToString(), c.Nombre, "editado");
        return Ok(c);
    }

    [HttpDelete("cuentas/{id:guid}")]
    [RequierePermiso("contabilidad", "eliminar")]
    public async Task<IActionResult> EliminarCuenta(Guid id, CancellationToken ct)
    {
        if (!await svc.EliminarCuentaAsync(id, ct)) return NotFound();
        await using var conn = AbrirConexion(); await conn.OpenAsync();
        await RegistrarAuditAsync(conn, null, "contabilidad_cuenta", id.ToString(), null, "eliminado");
        return NoContent();
    }

    // ── Movimientos ────────────────────────────────────────────────────────────

    // GET api/contabilidad/movimientos?pagina=1&porPagina=25&buscar=...&tipo=&cuentaId=&programaId=&mes=&anio=
    // Respuesta: { data, total, pagina, porPagina, totalIngresos, totalEgresos, cantidadIngresos, cantidadEgresos }
    [HttpGet("movimientos")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> ListarMovimientos(
        [FromQuery] string? tipo       = null,
        [FromQuery] Guid?   cuentaId   = null,
        [FromQuery] Guid?   programaId = null,
        [FromQuery] int?    mes        = null,
        [FromQuery] int?    anio       = null,
        [FromQuery] string? buscar     = null,
        [FromQuery] int     pagina     = 1,
        [FromQuery] int     porPagina  = 25,
        CancellationToken ct = default)
        => Ok(await svc.ListarMovimientosAsync(tipo, cuentaId, programaId, mes, anio, buscar, pagina, porPagina, ct));

    [HttpGet("movimientos/{id:guid}")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> ObtenerMovimiento(Guid id, CancellationToken ct)
    {
        var m = await svc.ObtenerMovimientoAsync(id, ct);
        return m is null ? NotFound() : Ok(m);
    }

    [HttpPost("movimientos")]
    [RequierePermiso("contabilidad", "crear")]
    public async Task<IActionResult> CrearMovimiento([FromBody] CrearMovimientoDto dto, CancellationToken ct)
    {
        var m = await svc.CrearMovimientoAsync(dto, ct);
        await using var conn = AbrirConexion(); await conn.OpenAsync();
        await RegistrarAuditAsync(conn, null, "contabilidad_movimiento", m.Id.ToString(), m.Concepto, "creado");
        return Ok(m);
    }

    [HttpPut("movimientos/{id:guid}")]
    [RequierePermiso("contabilidad", "editar")]
    public async Task<IActionResult> ActualizarMovimiento(Guid id, [FromBody] ActualizarMovimientoDto dto, CancellationToken ct)
    {
        var m = await svc.ActualizarMovimientoAsync(id, dto, ct);
        if (m is null) return NotFound();
        await using var conn = AbrirConexion(); await conn.OpenAsync();
        await RegistrarAuditAsync(conn, null, "contabilidad_movimiento", id.ToString(), m.Concepto, "editado");
        return Ok(m);
    }

    [HttpDelete("movimientos/{id:guid}")]
    [RequierePermiso("contabilidad", "eliminar")]
    public async Task<IActionResult> EliminarMovimiento(Guid id, CancellationToken ct)
    {
        if (!await svc.EliminarMovimientoAsync(id, ct)) return NotFound();
        await using var conn = AbrirConexion(); await conn.OpenAsync();
        await RegistrarAuditAsync(conn, null, "contabilidad_movimiento", id.ToString(), null, "eliminado");
        return NoContent();
    }

    [HttpPatch("movimientos/{id:guid}/anular")]
    [RequierePermiso("contabilidad", "editar")]
    public async Task<IActionResult> AnularMovimiento(Guid id, CancellationToken ct)
    {
        if (!await svc.AnularMovimientoAsync(id, ct)) return NotFound();
        await using var conn = AbrirConexion(); await conn.OpenAsync();
        await RegistrarAuditAsync(conn, null, "contabilidad_movimiento", id.ToString(), null, "anulado");
        return NoContent();
    }

    // ── Presupuesto ────────────────────────────────────────────────────────────

    [HttpGet("presupuesto")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> ListarPresupuesto([FromQuery] int? anio, CancellationToken ct)
        => Ok(await svc.ListarPresupuestosAsync(anio ?? DateTime.UtcNow.Year, ct));

    [HttpPost("presupuesto")]
    [RequierePermiso("contabilidad", "crear")]
    public async Task<IActionResult> CrearPresupuesto([FromBody] CrearPresupuestoDto dto, CancellationToken ct)
    {
        var p = await svc.CrearPresupuestoAsync(dto, ct);
        await using var conn = AbrirConexion(); await conn.OpenAsync();
        await RegistrarAuditAsync(conn, null, "contabilidad_presupuesto", p.Id.ToString(), p.ProgramaNombre, "creado");
        return Ok(p);
    }

    [HttpPut("presupuesto/{id:guid}")]
    [RequierePermiso("contabilidad", "editar")]
    public async Task<IActionResult> ActualizarPresupuesto(Guid id, [FromBody] CrearPresupuestoDto dto, CancellationToken ct)
    {
        var p = await svc.ActualizarPresupuestoAsync(id, dto, ct);
        if (p is null) return NotFound();
        await using var conn = AbrirConexion(); await conn.OpenAsync();
        await RegistrarAuditAsync(conn, null, "contabilidad_presupuesto", id.ToString(), p.ProgramaNombre, "editado");
        return Ok(p);
    }

    [HttpDelete("presupuesto/{id:guid}")]
    [RequierePermiso("contabilidad", "eliminar")]
    public async Task<IActionResult> EliminarPresupuesto(Guid id, CancellationToken ct)
    {
        if (!await svc.EliminarPresupuestoAsync(id, ct)) return NotFound();
        await using var conn = AbrirConexion(); await conn.OpenAsync();
        await RegistrarAuditAsync(conn, null, "contabilidad_presupuesto", id.ToString(), null, "eliminado");
        return NoContent();
    }

    // ── Caja Menor ─────────────────────────────────────────────────────────────

    [HttpGet("caja-menor/libro")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> LibroAuxiliar(
        [FromQuery] Guid cuentaId,
        [FromQuery] int? mes  = null,
        [FromQuery] int? anio = null,
        CancellationToken ct = default)
        => Ok(await svc.LibroAuxiliarAsync(cuentaId, mes, anio, ct));

    [HttpGet("caja-menor/arqueos")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> ListarArqueos([FromQuery] Guid cuentaId, CancellationToken ct)
        => Ok(await svc.ListarArqueosAsync(cuentaId, ct));

    [HttpPost("caja-menor/arqueos")]
    [RequierePermiso("contabilidad", "crear")]
    public async Task<IActionResult> CrearArqueo([FromBody] CrearArqueoDto dto, CancellationToken ct)
    {
        var a = await svc.CrearArqueoAsync(dto, ct);
        await using var conn = AbrirConexion(); await conn.OpenAsync();
        await RegistrarAuditAsync(conn, null, "contabilidad_arqueo", a.Id.ToString(), a.CuentaNombre, "creado");
        return Ok(a);
    }

    [HttpDelete("caja-menor/arqueos/{id:int}")]
    [RequierePermiso("contabilidad", "eliminar")]
    public async Task<IActionResult> EliminarArqueo(int id, CancellationToken ct)
    {
        if (!await svc.EliminarArqueoAsync(id, ct)) return NotFound();
        await using var conn = AbrirConexion(); await conn.OpenAsync();
        await RegistrarAuditAsync(conn, null, "contabilidad_arqueo", id.ToString(), null, "eliminado");
        return NoContent();
    }

    [HttpPost("caja-menor/reposicion")]
    [RequierePermiso("contabilidad", "crear")]
    public async Task<IActionResult> ReponerCaja([FromBody] CrearReposicionDto dto, CancellationToken ct)
    {
        try
        {
            var (entrada, salida) = await svc.ReponerCajaAsync(dto, ct);
            return Ok(new { entrada, salida });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { mensaje = ex.Message });
        }
    }

    // ── Dashboard / Reporte ────────────────────────────────────────────────────

    [HttpGet("stats")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> Stats(CancellationToken ct)
        => Ok(await svc.StatsAsync(ct));

    [HttpGet("reporte")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> Reporte(
        [FromQuery] int? mes  = null,
        [FromQuery] int? anio = null,
        CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        return Ok(await svc.ReporteAsync(mes ?? now.Month, anio ?? now.Year, ct));
    }

    [HttpGet("resumen-anual")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> ResumenAnual(
        [FromQuery] int? anio = null,
        CancellationToken ct = default)
        => Ok(await svc.ResumenAnualAsync(anio ?? DateTime.UtcNow.Year, ct));

    // ── Libro Mayor ────────────────────────────────────────────────────────────

    [HttpGet("libro-mayor")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> LibroMayor(
        [FromQuery] int?    anio       = null,
        [FromQuery] int?    mes        = null,
        [FromQuery] string? codigoPuc  = null,
        CancellationToken ct = default)
        => Ok(await svc.LibroMayorAsync(anio ?? DateTime.UtcNow.Year, mes, codigoPuc, ct));

    // ── OCR: Extraer datos de factura con OCR.space (gratis, sin restricción regional) ──

    [HttpPost("extraer-factura")]
    [RequierePermiso("contabilidad", "crear")]
    [EnableRateLimiting(LimiteSolicitudes.PoliticaOcr)]
    [RequestTimeout(60_000)]
    public async Task<IActionResult> ExtraerFactura(
        [FromBody] ExtraerFacturaRequestDto dto,
        CancellationToken ct)
    {
        // Errores inesperados van al manejador global (log con código, sin detalle al cliente)
        {
            var ocrApiKey = configuration["OcrSpace:ApiKey"] ?? "helloworld";
            var client    = httpFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(55);
            client.DefaultRequestHeaders.Add("apikey", ocrApiKey);

            using var form = new MultipartFormDataContent();
            form.Add(new StringContent($"data:{dto.MimeType};base64,{dto.ImagenBase64}"), "base64Image");
            form.Add(new StringContent("spa"),   "language");
            form.Add(new StringContent("false"), "isOverlayRequired");
            form.Add(new StringContent("true"),  "scale");
            form.Add(new StringContent("2"),     "OCREngine");

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(50));

            var ocrResp = await client.PostAsync("https://api.ocr.space/parse/image", form, cts.Token);
            var ocrJson = await ocrResp.Content.ReadAsStringAsync(cts.Token);

            if (!ocrResp.IsSuccessStatusCode)
                return BadRequest(new { mensaje = "Error en servicio OCR", detalle = ocrJson });

            using var doc = JsonDocument.Parse(ocrJson);
            var root      = doc.RootElement;

            if (root.TryGetProperty("IsErroredOnProcessing", out var errored) && errored.GetBoolean())
            {
                var msg = root.TryGetProperty("ErrorMessage", out var em) ? em.GetString() : "Error OCR";
                return BadRequest(new { mensaje = "No se pudo procesar la imagen", detalle = msg });
            }

            var parsedText = root
                .GetProperty("ParsedResults")[0]
                .GetProperty("ParsedText")
                .GetString() ?? "";

            if (string.IsNullOrWhiteSpace(parsedText))
                return Ok(new FacturaExtraidaDto(
                    Fecha: null, Monto: null, Concepto: null,
                    NitProveedor: null, NombreProveedor: null,
                    NumeroFactura: null, TipoSoporte: null,
                    Advertencia: "No se extrajo texto. Toma la foto con mejor luz y enfoque."));

            return Ok(ParserFactura.Parsear(parsedText));
        }
    }
}
