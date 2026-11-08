using FundacionPanorama.Application.Features.Alertas.DTOs;
using FundacionPanorama.Application.Features.Alertas.Interfaces;

namespace FundacionPanorama.Application.Features.Alertas;

/// <summary>
/// Alertas operativas que comparten la campana del panel y el Dashboard: una sola fuente
/// para que ambos muestren lo mismo. Cada alerta pertenece a un módulo y solo la ve quien
/// tiene permiso de ver ese módulo.
/// </summary>
public class AlertasService(IAlertasRepository repo)
{
    /// <summary>Días de anticipación con que se avisa el vencimiento de contratos y comodatos.</summary>
    public const int DiasAviso = 30;

    public async Task<IReadOnlyList<AlertaDto>> ObtenerAsync(CancellationToken ct = default)
        => Construir(await repo.ObtenerConteosAsync(ct));

    /// <summary>
    /// Alertas visibles para el usuario: las de los módulos en los que <paramref name="puedeVer"/>
    /// devuelve true.
    /// </summary>
    public async Task<IReadOnlyList<AlertaDto>> ObtenerVisiblesAsync(
        Func<string, Task<bool>> puedeVer, CancellationToken ct = default)
        => await FiltrarPorModuloAsync(await ObtenerAsync(ct), puedeVer);

    /// <summary>Deja solo las alertas de módulos permitidos; consulta el permiso una vez por módulo.</summary>
    public static async Task<IReadOnlyList<AlertaDto>> FiltrarPorModuloAsync(
        IReadOnlyList<AlertaDto> alertas, Func<string, Task<bool>> puedeVer)
    {
        var permitido = new Dictionary<string, bool>();
        var visibles  = new List<AlertaDto>();
        foreach (var a in alertas)
        {
            if (!permitido.TryGetValue(a.Modulo, out var ok))
                permitido[a.Modulo] = ok = await puedeVer(a.Modulo);
            if (ok) visibles.Add(a);
        }
        return visibles;
    }

    static string S(int n, string singular, string plural) => n == 1 ? singular : plural;

    /// <summary>Convierte los conteos en alertas; solo se incluyen las que tienen valor mayor que cero.</summary>
    public static IReadOnlyList<AlertaDto> Construir(ConteosAlertas c)
    {
        var alertas = new List<AlertaDto>();
        void Agregar(int valor, string tipo, string modulo, string nivel, string mensaje)
        {
            if (valor > 0) alertas.Add(new AlertaDto(tipo, modulo, mensaje, nivel, valor));
        }

        var n = c.ContratosProximos;
        Agregar(n, "contrato_vencimiento", "talento_humano", "warning",
            $"{n} {S(n, "contrato vence", "contratos vencen")} en los próximos {DiasAviso} días");

        n = c.NovedadesPendientes;
        Agregar(n, "novedad_pendiente", "talento_humano", "info",
            $"{n} {S(n, "novedad pendiente", "novedades pendientes")}");

        n = c.StockBajo;
        Agregar(n, "stock_bajo", "inventario", "warning",
            $"{n} {S(n, "artículo", "artículos")} con stock bajo el mínimo");

        n = c.SinStock;
        Agregar(n, "sin_stock", "inventario", "error",
            $"{n} {S(n, "artículo", "artículos")} sin stock");

        n = c.ComodatosProximos;
        Agregar(n, "comodato_vencimiento", "inventario", "warning",
            $"{n} {S(n, "comodato vence", "comodatos vencen")} en los próximos {DiasAviso} días");

        n = c.PresupuestoSobreEjecutado;
        Agregar(n, "presupuesto_sobre_ejecutado", "contabilidad", "error",
            $"{n} {S(n, "rubro del presupuesto superó", "rubros del presupuesto superaron")} lo presupuestado este año");

        return alertas;
    }
}
