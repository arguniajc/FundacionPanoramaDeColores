using FundacionPanorama.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using FundacionPanorama.API.Data;
using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Inventario;
using FundacionPanorama.Application.Features.Inventario.DTOs;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/inventario")]
[Authorize]
public class InventarioController(InventarioService svc, DbConnectionFactory db) : BaseController
{
    // Solo para la auditoría (BaseController.RegistrarAuditAsync)
    private NpgsqlConnection AbrirConexion() => db.Create();

    private async Task AuditarAsync(string entidadTipo, string entidadId, string? entidadNombre, string accion)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await RegistrarAuditAsync(conn, null, entidadTipo, entidadId, entidadNombre, accion);
    }

    private IActionResult Error<T>(ResultadoInventario<T> r) => r.Estado switch
    {
        EstadoResultadoInventario.NoEncontrado when r.Mensaje is null => NotFound(),
        EstadoResultadoInventario.NoEncontrado => NotFound(new { mensaje = r.Mensaje }),
        _                                      => BadRequest(new { mensaje = r.Mensaje }),
    };

    // ── Items ─────────────────────────────────────────────────────────────────

    [HttpGet("items")]
    [RequierePermiso("inventario", "ver")]
    public async Task<IActionResult> ListarItems(
        [FromQuery] Guid?   sedeId       = null,
        [FromQuery] string? buscar       = null,
        [FromQuery] string? categoria    = null,
        [FromQuery] string? tipoTenencia = null)
        => Ok(await svc.ListarItemsAsync(sedeId, buscar, categoria, tipoTenencia));

    [HttpGet("items/{id:guid}")]
    [RequierePermiso("inventario", "ver")]
    public async Task<IActionResult> ObtenerItem(Guid id)
    {
        var item = await svc.ObtenerItemAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost("items")]
    [RequierePermiso("inventario", "crear")]
    public async Task<IActionResult> CrearItem([FromBody] CrearItemDto dto)
    {
        var r = await svc.CrearItemAsync(dto);
        if (r.Estado != EstadoResultadoInventario.Ok) return Error(r);
        var item = r.Valor!;
        await AuditarAsync("inventario_item", item.Id.ToString(), item.Nombre, "creado");
        return Ok(item);
    }

    [HttpPut("items/{id:guid}")]
    [RequierePermiso("inventario", "editar")]
    public async Task<IActionResult> ActualizarItem(Guid id, [FromBody] ActualizarItemDto dto)
    {
        var r = await svc.ActualizarItemAsync(id, dto);
        if (r.Estado != EstadoResultadoInventario.Ok) return Error(r);
        var item = r.Valor!;
        await AuditarAsync("inventario_item", id.ToString(), item.Nombre, "editado");
        return Ok(item);
    }

    [HttpDelete("items/{id:guid}")]
    [RequierePermiso("inventario", "eliminar")]
    public async Task<IActionResult> EliminarItem(Guid id)
    {
        switch (await svc.EliminarItemAsync(id))
        {
            case ResultadoEliminacionItem.Desactivado:
                await AuditarAsync("inventario_item", id.ToString(), null, "desactivado");
                return NoContent();
            case ResultadoEliminacionItem.Eliminado:
                await AuditarAsync("inventario_item", id.ToString(), null, "eliminado");
                return NoContent();
            default:
                return NotFound();
        }
    }

    // ── Movimientos ───────────────────────────────────────────────────────────

    [HttpGet("movimientos")]
    [RequierePermiso("inventario", "ver")]
    public async Task<IActionResult> ListarMovimientos(
        [FromQuery] Guid? itemId = null,
        [FromQuery] Guid? sedeId = null)
        => Ok(await svc.ListarMovimientosAsync(itemId, sedeId));

    [HttpPost("movimientos")]
    [RequierePermiso("inventario", "crear")]
    public async Task<IActionResult> RegistrarMovimiento([FromBody] RegistrarMovimientoDto dto)
    {
        var r = await svc.RegistrarMovimientoAsync(dto, EmailUsuario);
        if (r.Estado != EstadoResultadoInventario.Ok) return Error(r);
        await AuditarAsync("inventario_movimiento", dto.ItemId.ToString(), null, "registrado");
        return Ok(new { movimientoId = r.Valor!.MovimientoId, nuevoStock = r.Valor.NuevoStock });
    }

    // ── Transferencia entre sedes ─────────────────────────────────────────────

    [HttpPost("transferencia")]
    [RequierePermiso("inventario", "editar")]
    public async Task<IActionResult> Transferir([FromBody] TransferenciaDto dto)
    {
        var r = await svc.TransferirAsync(dto, EmailUsuario);
        if (r.Estado != EstadoResultadoInventario.Ok) return Error(r);
        var t = r.Valor!;
        await AuditarAsync("inventario_transferencia", t.GrupoId.ToString(), t.NombreItem, "transferido");
        return Ok(new
        {
            grupoId             = t.GrupoId,
            itemOrigenId        = t.ItemOrigenId,
            nuevoStockOrigen    = t.NuevoStockOrigen,
            itemDestinoId       = t.ItemDestinoId,
            nuevoStockDestino   = t.NuevoStockDestino,
        });
    }

    // ── Tipos de movimiento ───────────────────────────────────────────────────

    [HttpGet("tipos")]
    [RequierePermiso("inventario", "ver")]
    public async Task<IActionResult> ListarTipos()
        => Ok(await svc.ListarTiposAsync());

    // ── Donantes (búsqueda rápida para autocomplete) ──────────────────────────

    [HttpGet("donantes")]
    [RequierePermiso("inventario", "ver")]
    public async Task<IActionResult> BuscarDonantes([FromQuery] string? buscar = null)
        => Ok(await svc.BuscarDonantesAsync(buscar));

    // ── Estadísticas ──────────────────────────────────────────────────────────

    [HttpGet("stats")]
    [RequierePermiso("inventario", "ver")]
    public async Task<IActionResult> ObtenerStats([FromQuery] Guid? sedeId = null)
        => Ok(await svc.ObtenerStatsAsync(sedeId));

    // ── Ingresar desde donación ───────────────────────────────────────────────

    [HttpPost("desde-donacion")]
    [RequierePermiso("inventario", "crear")]
    public async Task<IActionResult> IngresarDesdeDonacion([FromBody] IngresarDesdeDonacionDto dto)
    {
        var r = await svc.IngresarDesdeDonacionAsync(dto, EmailUsuario);
        if (r.Estado != EstadoResultadoInventario.Ok) return Error(r);
        return Ok(new { itemId = r.Valor!.ItemId, nuevoStock = r.Valor.NuevoStock });
    }

    // ── Comodatos próximos a vencer ───────────────────────────────────────────

    [HttpGet("comodatos-proximos")]
    [RequierePermiso("inventario", "ver")]
    public async Task<IActionResult> ComodatosProximos([FromQuery] int dias = 30)
        => Ok(await svc.ComodatosProximosAsync(dias));
}
