using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Contabilidad;
using FundacionPanorama.Application.Features.Contabilidad.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Timeouts;
using Microsoft.AspNetCore.Mvc;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/contabilidad")]
[Authorize]
public class ContabilidadController(
    ContabilidadService svc,
    IHttpClientFactory httpFactory,
    IConfiguration configuration) : ControllerBase
{
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
        => Ok(await svc.CrearCuentaAsync(dto, ct));

    [HttpPut("cuentas/{id:guid}")]
    [RequierePermiso("contabilidad", "editar")]
    public async Task<IActionResult> ActualizarCuenta(Guid id, [FromBody] CrearCuentaCajaDto dto, CancellationToken ct)
    {
        var c = await svc.ActualizarCuentaAsync(id, dto, ct);
        return c is null ? NotFound() : Ok(c);
    }

    [HttpDelete("cuentas/{id:guid}")]
    [RequierePermiso("contabilidad", "editar")]
    public async Task<IActionResult> EliminarCuenta(Guid id, CancellationToken ct)
        => await svc.EliminarCuentaAsync(id, ct) ? NoContent() : NotFound();

    // ── Movimientos ────────────────────────────────────────────────────────────

    [HttpGet("movimientos")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> ListarMovimientos(
        [FromQuery] string? tipo       = null,
        [FromQuery] Guid?   cuentaId   = null,
        [FromQuery] Guid?   programaId = null,
        [FromQuery] int?    mes        = null,
        [FromQuery] int?    anio       = null,
        CancellationToken ct = default)
        => Ok(await svc.ListarMovimientosAsync(tipo, cuentaId, programaId, mes, anio, ct));

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
        => Ok(await svc.CrearMovimientoAsync(dto, ct));

    [HttpPut("movimientos/{id:guid}")]
    [RequierePermiso("contabilidad", "editar")]
    public async Task<IActionResult> ActualizarMovimiento(Guid id, [FromBody] ActualizarMovimientoDto dto, CancellationToken ct)
    {
        var m = await svc.ActualizarMovimientoAsync(id, dto, ct);
        return m is null ? NotFound() : Ok(m);
    }

    [HttpDelete("movimientos/{id:guid}")]
    [RequierePermiso("contabilidad", "editar")]
    public async Task<IActionResult> EliminarMovimiento(Guid id, CancellationToken ct)
        => await svc.EliminarMovimientoAsync(id, ct) ? NoContent() : NotFound();

    [HttpPatch("movimientos/{id:guid}/anular")]
    [RequierePermiso("contabilidad", "editar")]
    public async Task<IActionResult> AnularMovimiento(Guid id, CancellationToken ct)
        => await svc.AnularMovimientoAsync(id, ct) ? NoContent() : NotFound();

    // ── Presupuesto ────────────────────────────────────────────────────────────

    [HttpGet("presupuesto")]
    [RequierePermiso("contabilidad", "ver")]
    public async Task<IActionResult> ListarPresupuesto([FromQuery] int? anio, CancellationToken ct)
        => Ok(await svc.ListarPresupuestosAsync(anio ?? DateTime.UtcNow.Year, ct));

    [HttpPost("presupuesto")]
    [RequierePermiso("contabilidad", "crear")]
    public async Task<IActionResult> CrearPresupuesto([FromBody] CrearPresupuestoDto dto, CancellationToken ct)
        => Ok(await svc.CrearPresupuestoAsync(dto, ct));

    [HttpPut("presupuesto/{id:guid}")]
    [RequierePermiso("contabilidad", "editar")]
    public async Task<IActionResult> ActualizarPresupuesto(Guid id, [FromBody] CrearPresupuestoDto dto, CancellationToken ct)
    {
        var p = await svc.ActualizarPresupuestoAsync(id, dto, ct);
        return p is null ? NotFound() : Ok(p);
    }

    [HttpDelete("presupuesto/{id:guid}")]
    [RequierePermiso("contabilidad", "editar")]
    public async Task<IActionResult> EliminarPresupuesto(Guid id, CancellationToken ct)
        => await svc.EliminarPresupuestoAsync(id, ct) ? NoContent() : NotFound();

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
        => Ok(await svc.CrearArqueoAsync(dto, ct));

    [HttpDelete("caja-menor/arqueos/{id:int}")]
    [RequierePermiso("contabilidad", "editar")]
    public async Task<IActionResult> EliminarArqueo(int id, CancellationToken ct)
        => await svc.EliminarArqueoAsync(id, ct) ? NoContent() : NotFound();

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
            return BadRequest(new { error = ex.Message });
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

    // ── OCR: Extraer datos de factura con Gemini Vision ────────────────────────

    [HttpPost("extraer-factura")]
    [RequierePermiso("contabilidad", "crear")]
    [RequestTimeout(90_000)]   // 90 s — Gemini puede tardar en imágenes grandes
    public async Task<IActionResult> ExtraerFactura(
        [FromBody] ExtraerFacturaRequestDto dto,
        CancellationToken ct)
    {
        var apiKey = configuration["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            return BadRequest(new { error = "OCR no configurado. Agrega la clave Gemini:ApiKey en la configuración del servidor." });

        const string prompt = """
            Analiza esta imagen de una factura o recibo colombiano y extrae los datos en formato JSON.
            Devuelve ÚNICAMENTE el JSON con esta estructura exacta, sin texto adicional:
            {
              "fecha": "YYYY-MM-DD o null si no se ve claramente",
              "monto": número sin puntos ni comas (ej: 150000) o null,
              "concepto": "descripción del producto o servicio comprado",
              "nit_proveedor": "solo los dígitos del NIT sin guiones ni dígito de verificación, o null",
              "nombre_proveedor": "nombre o razón social del emisor de la factura",
              "numero_factura": "número de la factura tal como aparece",
              "tipo_soporte": "factura" o "recibo" o "tiquete" según corresponda,
              "advertencia": "nota si la imagen es borrosa o falta información importante, sino null"
            }
            Si no puedes leer un campo, usa null. El monto debe ser el TOTAL a pagar.
            """;

        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { inline_data = new { mime_type = dto.MimeType, data = dto.ImagenBase64 } },
                        new { text = prompt }
                    }
                }
            },
            generationConfig = new { responseMimeType = "application/json" }
        };

        try
        {
            var client = httpFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(85);
            // Usar gemini-2.0-flash: más rápido y gratuito
            var url    = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={apiKey}";
            var body   = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            // CancellationToken propio de 80 s para no depender del timeout de la petición HTTP
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(80));

            var response = await client.PostAsync(url, body, cts.Token);
            var rawJson  = await response.Content.ReadAsStringAsync(cts.Token);

            if (!response.IsSuccessStatusCode)
                return BadRequest(new { error = $"Error Gemini API: {response.StatusCode}", detalle = rawJson });

            using var doc  = JsonDocument.Parse(rawJson);
            var textPart   = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString() ?? "{}";

            using var extracted = JsonDocument.Parse(textPart);
            var root = extracted.RootElement;

            decimal? monto = null;
            if (root.TryGetProperty("monto", out var montoEl) && montoEl.ValueKind == JsonValueKind.Number)
                monto = montoEl.GetDecimal();

            string? fecha = null;
            if (root.TryGetProperty("fecha", out var fechaEl) && fechaEl.ValueKind == JsonValueKind.String)
                fecha = fechaEl.GetString();

            var result = new FacturaExtraidaDto(
                Fecha:          fecha,
                Monto:          monto,
                Concepto:       root.TryGetProperty("concepto",         out var c)  && c.ValueKind  == JsonValueKind.String ? c.GetString()  : null,
                NitProveedor:   root.TryGetProperty("nit_proveedor",    out var n)  && n.ValueKind  == JsonValueKind.String ? n.GetString()  : null,
                NombreProveedor:root.TryGetProperty("nombre_proveedor", out var np) && np.ValueKind == JsonValueKind.String ? np.GetString() : null,
                NumeroFactura:  root.TryGetProperty("numero_factura",   out var nf) && nf.ValueKind == JsonValueKind.String ? nf.GetString() : null,
                TipoSoporte:    root.TryGetProperty("tipo_soporte",     out var ts) && ts.ValueKind == JsonValueKind.String ? ts.GetString() : null,
                Advertencia:    root.TryGetProperty("advertencia",      out var a)  && a.ValueKind  == JsonValueKind.String ? a.GetString()  : null
            );

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Error procesando la imagen.", detalle = ex.Message });
        }
    }
}
