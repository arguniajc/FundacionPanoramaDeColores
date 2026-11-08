using FundacionPanorama.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using FundacionPanorama.API.Data;
using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Donaciones;
using FundacionPanorama.Application.Features.Donaciones.DTOs;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/donaciones")]
[Authorize]
public class DonacionesController(DonacionesService svc, DbConnectionFactory db) : BaseController
{
    // Conexión solo para la auditoría (BaseController.RegistrarAuditAsync)
    private NpgsqlConnection AbrirConexion() => db.Create();

    // GET api/donaciones?pagina=1&porPagina=20&buscar=...&donanteId=&tipo=&sedeId=&programaId=&desde=&hasta=
    // Respuesta: { data, total, pagina, porPagina } (porPagina máximo 100)
    [HttpGet]
    [RequierePermiso("donaciones", "ver")]
    public async Task<IActionResult> Listar(
        [FromQuery] Guid?     donanteId  = null,
        [FromQuery] string?   tipo       = null,
        [FromQuery] Guid?     sedeId     = null,
        [FromQuery] Guid?     programaId = null,
        [FromQuery] DateTime? desde      = null,
        [FromQuery] DateTime? hasta      = null,
        [FromQuery] string?   buscar     = null,
        [FromQuery] int       pagina     = 1,
        [FromQuery] int       porPagina  = 20,
        CancellationToken ct = default)
        => Ok(await svc.ListarAsync(donanteId, tipo, sedeId, programaId, desde, hasta, buscar, pagina, porPagina, ct));

    [HttpGet("{id:guid}")]
    [RequierePermiso("donaciones", "ver")]
    public async Task<IActionResult> ObtenerPorId(Guid id)
    {
        var don = await svc.ObtenerAsync(id);
        return don is null ? NotFound() : Ok(don);
    }

    [HttpPost]
    [RequierePermiso("donaciones", "crear")]
    public async Task<IActionResult> Crear([FromBody] CrearDonacionDto dto)
    {
        var error = DonacionesService.ValidarCrear(dto);
        if (error is not null) return BadRequest(new { mensaje = error });

        // Transacción (recibo, inventario, auditoría) + contabilidad automática en el repositorio
        var result = await svc.CrearAsync(dto, EmailUsuario);
        return Ok(result);
    }

    [HttpPut("{id:guid}")]
    [RequierePermiso("donaciones", "editar")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] CrearDonacionDto dto)
    {
        // Mismas reglas que al crear (antes el PUT aceptaba montos negativos o vacíos)
        var error = DonacionesService.ValidarCrear(dto);
        if (error is not null) return BadRequest(new { mensaje = error });

        if (!await svc.ActualizarAsync(id, dto)) return NotFound();

        await using (var conn = AbrirConexion())
        {
            await conn.OpenAsync();
            await RegistrarAuditAsync(conn, null, "donacion", id.ToString(), dto.ReciboNumero, "editado");
        }
        var result = await svc.ObtenerAsync(id);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [RequierePermiso("donaciones", "eliminar")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        if (!await svc.EliminarAsync(id)) return NotFound();

        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await RegistrarAuditAsync(conn, null, "donacion", id.ToString(), null, "eliminado");
        return NoContent();
    }

    [HttpGet("stats")]
    [RequierePermiso("donaciones", "ver")]
    public async Task<IActionResult> ObtenerStats()
        => Ok(await svc.ObtenerStatsAsync());

    // =========================================================================
    // PATCH api/donaciones/{id}/anular
    // =========================================================================
    [HttpPatch("{id:guid}/anular")]
    [RequierePermiso("donaciones", "editar")]
    public async Task<IActionResult> Anular(Guid id)
    {
        if (!await svc.AnularAsync(id)) return NotFound();

        await using (var conn = AbrirConexion())
        {
            await conn.OpenAsync();
            await RegistrarAuditAsync(conn, null, "donacion", id.ToString(), null, "anulado");
        }
        await svc.RegistrarLogEmisionAsync(id, "anulacion", EmailUsuario, null, null);
        var result = await svc.ObtenerAsync(id);
        return Ok(result);
    }

    // =========================================================================
    // POST api/donaciones/{id}/log-emision
    // =========================================================================
    [HttpPost("{id:guid}/log-emision")]
    [RequierePermiso("donaciones", "ver")]
    public async Task<IActionResult> LogEmision(Guid id, [FromBody] LogEmisionDto dto)
    {
        await svc.RegistrarLogEmisionAsync(id, dto.Accion, EmailUsuario, dto.DestinatarioEmail, dto.Detalle);
        return Ok();
    }

    // =========================================================================
    // POST api/donaciones/{id}/enviar-recibo
    // =========================================================================
    [HttpPost("{id:guid}/enviar-recibo")]
    // Envía un correo al donante en nombre de la fundación: no basta con poder ver
    [RequiereAlgunPermiso("donaciones:crear", "donaciones:editar")]
    public async Task<IActionResult> EnviarRecibo(
        Guid id,
        [FromServices] FundacionPanorama.API.Services.EmailService emailSvc,
        [FromServices] FundacionPanorama.Application.Features.Configuracion.Interfaces.IConfiguracionRepository cfgRepo,
        CancellationToken ct)
    {
        var don = await svc.ObtenerAsync(id);
        if (don is null) return NotFound();
        if (string.IsNullOrWhiteSpace(don.EmailDonante))
            return BadRequest(new { mensaje = "El donante no tiene email registrado." });

        var cfg = await cfgRepo.ObtenerAsync(ct);
        var html = DonacionesService.GenerarHtmlRecibo(don, cfg);

        var (ok, detalle) = await emailSvc.EnviarReciboAsync(
            don.EmailDonante, don.NombreDonante,
            don.ReciboNumero ?? don.Id.ToString()[..8],
            cfg?.NombreFundacion ?? "Fundación Panorama de Colores",
            html, ct);

        if (!ok) return BadRequest(new { mensaje = detalle });

        await svc.RegistrarLogEmisionAsync(id, "email_enviado", EmailUsuario, don.EmailDonante, null);
        return Ok(new { mensaje = $"Recibo enviado a {don.EmailDonante}." });
    }
}
