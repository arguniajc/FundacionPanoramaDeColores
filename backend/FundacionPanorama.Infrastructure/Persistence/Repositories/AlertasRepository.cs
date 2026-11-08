using FundacionPanorama.Application.Features.Alertas;
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
        // Comodatos: mismo criterio que GET /api/inventario/comodatos-proximos.
        // Presupuesto: mismo cálculo de "ejecutado" que el listado de presupuestos de Contabilidad
        // (movimientos no anulados de la categoría —y del programa, si el rubro tiene— en el año).
        cmd.CommandText = """
            SELECT
              (SELECT COUNT(*)::int FROM empleados
               WHERE activo = true AND fecha_fin_contrato IS NOT NULL
               AND fecha_fin_contrato BETWEEN CURRENT_DATE AND CURRENT_DATE + make_interval(days => @dias)) AS contratos_proximos,
              (SELECT COUNT(*)::int FROM novedades_empleado WHERE estado = 'pendiente')            AS novedades_pendientes,
              (SELECT COUNT(*)::int FROM inventario_items
               WHERE activo = true AND stock_actual < stock_minimo AND stock_actual > 0)            AS stock_bajo,
              (SELECT COUNT(*)::int FROM inventario_items
               WHERE activo = true AND stock_actual <= 0)                                           AS sin_stock,
              (SELECT COUNT(*)::int FROM inventario_items
               WHERE activo = true AND tipo_tenencia = 'comodato' AND comodato_fecha_fin IS NOT NULL
               AND comodato_fecha_fin BETWEEN CURRENT_DATE AND CURRENT_DATE + make_interval(days => @dias)) AS comodatos_proximos,
              (SELECT COUNT(*)::int FROM (
                  SELECT pb.id
                  FROM presupuesto_contable pb
                  LEFT JOIN movimientos_contables m
                      ON  m.categoria_id = pb.categoria_id
                      AND (pb.programa_id IS NULL OR m.programa_id = pb.programa_id)
                      AND EXTRACT(YEAR FROM m.fecha) = pb.anio
                      AND NOT COALESCE(m.anulado, false)
                  WHERE pb.anio = EXTRACT(YEAR FROM CURRENT_DATE)::int
                  GROUP BY pb.id, pb.monto_presupuestado
                  HAVING COALESCE(SUM(m.monto), 0) > pb.monto_presupuestado
               ) sobre)                                                                             AS presupuesto_sobre_ejecutado
            """;
        cmd.Parameters.AddWithValue("dias", AlertasService.DiasAviso);

        await using var r = await cmd.ExecuteReaderAsync(ct);
        await r.ReadAsync(ct);

        return new ConteosAlertas(
            ContratosProximos:         r.GetInt32(0),
            NovedadesPendientes:       r.GetInt32(1),
            StockBajo:                 r.GetInt32(2),
            SinStock:                  r.GetInt32(3),
            ComodatosProximos:         r.GetInt32(4),
            PresupuestoSobreEjecutado: r.GetInt32(5));
    }
}
