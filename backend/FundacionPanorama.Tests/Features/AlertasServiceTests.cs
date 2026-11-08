using FundacionPanorama.Application.Features.Alertas;
using FundacionPanorama.Application.Features.Alertas.DTOs;
using FundacionPanorama.Application.Features.Alertas.Interfaces;
using Moq;

namespace FundacionPanorama.Tests.Features;

public class AlertasServiceTests
{
    private readonly Mock<IAlertasRepository> _repo = new();
    private readonly AlertasService           _sut;

    public AlertasServiceTests() => _sut = new(_repo.Object);

    static ConteosAlertas Todos(int n) => new(n, n, n, n, n, n);

    [Fact]
    public void Sin_Conteos_No_Hay_Alertas()
        => Assert.Empty(AlertasService.Construir(Todos(0)));

    [Fact]
    public void Cada_Conteo_Genera_Su_Alerta_Con_Modulo_Nivel_Y_Valor()
    {
        var alertas = AlertasService.Construir(new ConteosAlertas(2, 3, 4, 5, 6, 7));

        Assert.Equal(6, alertas.Count);
        Assert.Collection(alertas,
            a => { Assert.Equal(("contrato_vencimiento", "talento_humano", "warning", 2), (a.Tipo, a.Modulo, a.Nivel, a.Valor)); },
            a => { Assert.Equal(("novedad_pendiente", "talento_humano", "info", 3), (a.Tipo, a.Modulo, a.Nivel, a.Valor)); },
            a => { Assert.Equal(("stock_bajo", "inventario", "warning", 4), (a.Tipo, a.Modulo, a.Nivel, a.Valor)); },
            a => { Assert.Equal(("sin_stock", "inventario", "error", 5), (a.Tipo, a.Modulo, a.Nivel, a.Valor)); },
            a => { Assert.Equal(("comodato_vencimiento", "inventario", "warning", 6), (a.Tipo, a.Modulo, a.Nivel, a.Valor)); },
            a => { Assert.Equal(("presupuesto_sobre_ejecutado", "contabilidad", "error", 7), (a.Tipo, a.Modulo, a.Nivel, a.Valor)); });
        Assert.All(alertas, a => Assert.StartsWith(a.Valor.ToString(), a.Mensaje));
        Assert.All(alertas, a => Assert.Contains(a.Nivel, new[] { "warning", "info", "error" }));
    }

    [Fact]
    public void Solo_Se_Incluyen_Los_Conteos_Mayores_Que_Cero()
    {
        var alertas = AlertasService.Construir(new ConteosAlertas(0, 0, 0, 0, ComodatosProximos: 2, PresupuestoSobreEjecutado: 0));
        var a = Assert.Single(alertas);
        Assert.Equal("comodato_vencimiento", a.Tipo);
        Assert.Equal("2 comodatos vencen en los próximos 30 días", a.Mensaje);
    }

    [Fact]
    public void Mensajes_En_Singular_Y_Plural()
    {
        var uno = AlertasService.Construir(Todos(1)).Select(a => a.Mensaje).ToList();
        Assert.Contains("1 contrato vence en los próximos 30 días", uno);
        Assert.Contains("1 novedad pendiente", uno);
        Assert.Contains("1 comodato vence en los próximos 30 días", uno);
        Assert.Contains("1 rubro del presupuesto superó lo presupuestado este año", uno);

        var varios = AlertasService.Construir(Todos(3)).Select(a => a.Mensaje).ToList();
        Assert.Contains("3 contratos vencen en los próximos 30 días", varios);
        Assert.Contains("3 novedades pendientes", varios);
        Assert.Contains("3 artículos sin stock", varios);
        Assert.Contains("3 rubros del presupuesto superaron lo presupuestado este año", varios);
    }

    [Fact]
    public async Task ObtenerAsync_Construye_Desde_El_Repositorio()
    {
        _repo.Setup(r => r.ObtenerConteosAsync(It.IsAny<CancellationToken>()))
             .ReturnsAsync(new ConteosAlertas(1, 0, 0, 0, 0, 2));

        var alertas = await _sut.ObtenerAsync();

        Assert.Equal(["contrato_vencimiento", "presupuesto_sobre_ejecutado"], alertas.Select(a => a.Tipo));
    }

    [Fact]
    public async Task Solo_Se_Ven_Las_Alertas_De_Modulos_Permitidos()
    {
        _repo.Setup(r => r.ObtenerConteosAsync(It.IsAny<CancellationToken>())).ReturnsAsync(Todos(1));
        var consultados = new List<string>();

        var alertas = await _sut.ObtenerVisiblesAsync(modulo =>
        {
            consultados.Add(modulo);
            return Task.FromResult(modulo == "inventario");
        });

        Assert.Equal(3, alertas.Count);
        Assert.All(alertas, a => Assert.Equal("inventario", a.Modulo));
        // Un permiso por módulo, no por alerta
        Assert.Equal(["talento_humano", "inventario", "contabilidad"], consultados);
    }

    [Fact]
    public async Task Sin_Permisos_No_Ve_Ninguna_Alerta()
    {
        _repo.Setup(r => r.ObtenerConteosAsync(It.IsAny<CancellationToken>())).ReturnsAsync(Todos(5));
        Assert.Empty(await _sut.ObtenerVisiblesAsync(_ => Task.FromResult(false)));
    }

    [Fact]
    public async Task Con_Todos_Los_Permisos_Ve_Todas()
    {
        var todas = AlertasService.Construir(Todos(2));
        var visibles = await AlertasService.FiltrarPorModuloAsync(todas, _ => Task.FromResult(true));
        Assert.Equal(todas, visibles);
    }
}
