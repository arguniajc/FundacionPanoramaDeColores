using FundacionPanorama.Application.Features.Alertas.DTOs;
using FundacionPanorama.Application.Features.Alertas.Interfaces;

namespace FundacionPanorama.Infrastructure.Persistence.Repositories;

public class AlertasRepository(DbConnectionFactory factory) : IAlertasRepository
{
    public async Task<ConteosAlertas> ObtenerConteosAsync(CancellationToken ct = default)
    {
        await using var conn = factory.Create();
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

        return new ConteosAlertas(
            ContratosProximos:   r.GetInt32(0),
            NovedadesPendientes: r.GetInt32(1),
            StockBajo:           r.GetInt32(2),
            SinStock:            r.GetInt32(3));
    }
}
