using FundacionPanorama.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/alertas")]
[Authorize]
public class AlertasController(AppDbContext db) : ControllerBase
{
    private NpgsqlConnection AbrirConexion() => new(db.Database.GetConnectionString());

    [HttpGet]
    public async Task<IActionResult> GetAlertas(CancellationToken ct)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync(ct);

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT
              (SELECT COUNT(*)::int FROM empleados
               WHERE activo = true AND fecha_fin_contrato IS NOT NULL
               AND fecha_fin_contrato BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') AS contratos_proximos,
              (SELECT COUNT(*)::int FROM novedades_empleado WHERE estado = 'pendiente')            AS novedades_pendientes,
              (SELECT COUNT(*)::int FROM inventario_items
               WHERE activo = true AND stock_actual < stock_minimo AND stock_actual > 0)            AS stock_bajo,
              (SELECT COUNT(*)::int FROM inventario_items
               WHERE activo = true AND stock_actual <= 0)                                           AS sin_stock
            """;

        await using var r = await cmd.ExecuteReaderAsync(ct);
        await r.ReadAsync(ct);

        int contratosProximos   = r.GetInt32(0);
        int novedadesPendientes = r.GetInt32(1);
        int stockBajo           = r.GetInt32(2);
        int sinStock            = r.GetInt32(3);

        var alertas = new List<object>();

        if (contratosProximos > 0)
            alertas.Add(new {
                tipo    = "contrato_vencimiento",
                modulo  = "talento_humano",
                mensaje = $"{contratosProximos} contrato{(contratosProximos != 1 ? "s" : "")} vence{(contratosProximos != 1 ? "n" : "")} en los próximos 30 días",
                nivel   = "warning",
                valor   = contratosProximos,
            });

        if (novedadesPendientes > 0)
            alertas.Add(new {
                tipo    = "novedad_pendiente",
                modulo  = "talento_humano",
                mensaje = $"{novedadesPendientes} novedad{(novedadesPendientes != 1 ? "es" : "")} pendiente{(novedadesPendientes != 1 ? "s" : "")}",
                nivel   = "info",
                valor   = novedadesPendientes,
            });

        if (stockBajo > 0)
            alertas.Add(new {
                tipo    = "stock_bajo",
                modulo  = "inventario",
                mensaje = $"{stockBajo} artículo{(stockBajo != 1 ? "s" : "")} con stock bajo el mínimo",
                nivel   = "warning",
                valor   = stockBajo,
            });

        if (sinStock > 0)
            alertas.Add(new {
                tipo    = "sin_stock",
                modulo  = "inventario",
                mensaje = $"{sinStock} artículo{(sinStock != 1 ? "s" : "")} sin stock",
                nivel   = "error",
                valor   = sinStock,
            });

        return Ok(alertas);
    }
}
