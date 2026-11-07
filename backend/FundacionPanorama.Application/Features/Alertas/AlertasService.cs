using FundacionPanorama.Application.Features.Alertas.DTOs;
using FundacionPanorama.Application.Features.Alertas.Interfaces;

namespace FundacionPanorama.Application.Features.Alertas;

public class AlertasService(IAlertasRepository repo)
{
    public async Task<IReadOnlyList<AlertaDto>> ObtenerAsync(CancellationToken ct = default)
        => Construir(await repo.ObtenerConteosAsync(ct));

    /// <summary>Convierte los conteos en alertas; solo se incluyen las que tienen valor mayor que cero.</summary>
    public static IReadOnlyList<AlertaDto> Construir(ConteosAlertas c)
    {
        int contratosProximos   = c.ContratosProximos;
        int novedadesPendientes = c.NovedadesPendientes;
        int stockBajo           = c.StockBajo;
        int sinStock            = c.SinStock;

        var alertas = new List<AlertaDto>();

        if (contratosProximos > 0)
            alertas.Add(new AlertaDto(
                Tipo:    "contrato_vencimiento",
                Modulo:  "talento_humano",
                Mensaje: $"{contratosProximos} contrato{(contratosProximos != 1 ? "s" : "")} vence{(contratosProximos != 1 ? "n" : "")} en los próximos 30 días",
                Nivel:   "warning",
                Valor:   contratosProximos));

        if (novedadesPendientes > 0)
            alertas.Add(new AlertaDto(
                Tipo:    "novedad_pendiente",
                Modulo:  "talento_humano",
                Mensaje: $"{novedadesPendientes} novedad{(novedadesPendientes != 1 ? "es" : "")} pendiente{(novedadesPendientes != 1 ? "s" : "")}",
                Nivel:   "info",
                Valor:   novedadesPendientes));

        if (stockBajo > 0)
            alertas.Add(new AlertaDto(
                Tipo:    "stock_bajo",
                Modulo:  "inventario",
                Mensaje: $"{stockBajo} artículo{(stockBajo != 1 ? "s" : "")} con stock bajo el mínimo",
                Nivel:   "warning",
                Valor:   stockBajo));

        if (sinStock > 0)
            alertas.Add(new AlertaDto(
                Tipo:    "sin_stock",
                Modulo:  "inventario",
                Mensaje: $"{sinStock} artículo{(sinStock != 1 ? "s" : "")} sin stock",
                Nivel:   "error",
                Valor:   sinStock));

        return alertas;
    }
}
