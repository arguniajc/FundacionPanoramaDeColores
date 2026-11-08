using FundacionPanorama.Application.Features.Contabilidad;
using FundacionPanorama.Application.Features.Contabilidad.DTOs;
using FundacionPanorama.Application.Features.Contabilidad.Interfaces;
using FundacionPanorama.Application.Features.Donaciones;
using FundacionPanorama.Application.Features.Donaciones.DTOs;
using FundacionPanorama.Application.Features.Donaciones.Interfaces;
using FundacionPanorama.Application.Features.TalentoHumano;
using FundacionPanorama.Application.Features.TalentoHumano.DTOs;
using FundacionPanorama.Application.Features.TalentoHumano.Interfaces;
using FundacionPanorama.Application.Shared;
using FundacionPanorama.Infrastructure.Persistence;
using Moq;

namespace FundacionPanorama.Tests.Features;

/// <summary>Topes de pagina/porPagina y limpieza de filtros en los listados paginados en servidor.</summary>
public class PaginacionListadosTests
{
    // ── Helpers comunes ──────────────────────────────────────────────────────

    [Theory]
    [InlineData(0, 0, 1, 1)]
    [InlineData(-3, -10, 1, 1)]
    [InlineData(2, 101, 2, 100)]
    [InlineData(7, 50, 7, 50)]
    [InlineData(int.MaxValue, int.MaxValue, Paginacion.PaginaMaxima, Paginacion.PorPaginaMaximo)]
    public void Normalizar_Aplica_Topes(int pagina, int porPagina, int pEsperada, int ppEsperado)
        => Assert.Equal((pEsperada, ppEsperado), Paginacion.Normalizar(pagina, porPagina));

    [Theory]
    [InlineData(null, null)]
    [InlineData("", null)]
    [InlineData("   ", null)]
    [InlineData("  ana maría ", "ana maría")]
    public void NormalizarBusqueda_Recorta_Y_Anula_Vacios(string? buscar, string? esperado)
        => Assert.Equal(esperado, Paginacion.NormalizarBusqueda(buscar));

    [Fact]
    public void NormalizarBusqueda_Limita_El_Largo()
        => Assert.Equal(Paginacion.BuscarMaximo, Paginacion.NormalizarBusqueda(new string('a', 500))!.Length);

    [Theory]
    [InlineData("ana", "%ana%")]
    [InlineData("50%", @"%50\%%")]
    [InlineData("a_b", @"%a\_b%")]
    [InlineData(@"c:\x", @"%c:\\x%")]
    public void SqlLike_Contiene_Escapa_Comodines(string texto, string esperado)
        => Assert.Equal(esperado, SqlLike.Contiene(texto));

    // ── Donaciones ───────────────────────────────────────────────────────────

    [Theory]
    [InlineData(0, 0, 1, 1)]
    [InlineData(-1, 1000, 1, 100)]
    [InlineData(4, 20, 4, 20)]
    public async Task Donaciones_Ajusta_Pagina_Y_PorPagina(int pagina, int porPagina, int pEsperada, int ppEsperado)
    {
        var repo = new Mock<IDonacionesRepository>();
        repo.Setup(r => r.ListarAsync(It.IsAny<FiltroDonaciones>(), It.IsAny<int>(), It.IsAny<int>(), default))
            .ReturnsAsync(new ListaPaginada<DonacionDto>());

        await new DonacionesService(repo.Object).ListarAsync(null, null, null, null, null, null, null, pagina, porPagina);

        repo.Verify(r => r.ListarAsync(It.IsAny<FiltroDonaciones>(), pEsperada, ppEsperado, default), Times.Once);
    }

    [Fact]
    public async Task Donaciones_Conserva_Filtros_Y_Limpia_Busqueda()
    {
        var repo = new Mock<IDonacionesRepository>();
        FiltroDonaciones? recibido = null;
        repo.Setup(r => r.ListarAsync(It.IsAny<FiltroDonaciones>(), It.IsAny<int>(), It.IsAny<int>(), default))
            .Callback<FiltroDonaciones, int, int, CancellationToken>((f, _, _, _) => recibido = f)
            .ReturnsAsync(new ListaPaginada<DonacionDto>());
        Guid donante = Guid.NewGuid(), sede = Guid.NewGuid(), prog = Guid.NewGuid();
        DateTime desde = new(2026, 1, 1), hasta = new(2026, 1, 31);

        await new DonacionesService(repo.Object).ListarAsync(donante, " dinero ", sede, prog, desde, hasta, "  REC-1 ", 1, 20);

        Assert.Equal(new FiltroDonaciones(donante, "dinero", sede, prog, desde, hasta, "REC-1"), recibido);
    }

    // ── Movimientos contables ────────────────────────────────────────────────

    [Theory]
    [InlineData(0, 0, 1, 1)]
    [InlineData(-1, 1000, 1, 100)]
    [InlineData(2, 25, 2, 25)]
    public async Task Movimientos_Ajusta_Pagina_Y_PorPagina(int pagina, int porPagina, int pEsperada, int ppEsperado)
    {
        var repo = new Mock<IContabilidadRepository>();
        repo.Setup(r => r.ListarMovimientosAsync(It.IsAny<FiltroMovimientos>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ListaMovimientosDto());

        await new ContabilidadService(repo.Object).ListarMovimientosAsync(null, null, null, null, null, null, pagina, porPagina);

        repo.Verify(r => r.ListarMovimientosAsync(It.IsAny<FiltroMovimientos>(), pEsperada, ppEsperado, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Movimientos_Conserva_Filtros_Y_Limpia_Busqueda()
    {
        var repo = new Mock<IContabilidadRepository>();
        FiltroMovimientos? recibido = null;
        repo.Setup(r => r.ListarMovimientosAsync(It.IsAny<FiltroMovimientos>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .Callback<FiltroMovimientos, int, int, CancellationToken>((f, _, _, _) => recibido = f)
            .ReturnsAsync(new ListaMovimientosDto());
        Guid cuenta = Guid.NewGuid(), prog = Guid.NewGuid();

        await new ContabilidadService(repo.Object).ListarMovimientosAsync("egreso", cuenta, prog, 3, 2026, "   ", 1, 25);

        Assert.Equal(new FiltroMovimientos("egreso", cuenta, prog, 3, 2026, null), recibido);
    }

    // ── Empleados ────────────────────────────────────────────────────────────

    [Theory]
    [InlineData(0, 0, 1, 1)]
    [InlineData(-1, 200, 1, 100)]   // el organigrama pide 100 por página y recorre las páginas
    [InlineData(5, 30, 5, 30)]
    public async Task Empleados_Ajusta_Pagina_Y_PorPagina(int pagina, int porPagina, int pEsperada, int ppEsperado)
    {
        var repo = new Mock<ITalentoHumanoRepository>();
        repo.Setup(r => r.ListarAsync(It.IsAny<FiltroEmpleados>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ListaPaginada<EmpleadoResumenDto>());

        await new TalentoHumanoService(repo.Object).ListarAsync(true, null, null, null, pagina, porPagina);

        repo.Verify(r => r.ListarAsync(It.IsAny<FiltroEmpleados>(), pEsperada, ppEsperado, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Empleados_Conserva_Filtros_Y_Limpia_Busqueda()
    {
        var repo = new Mock<ITalentoHumanoRepository>();
        FiltroEmpleados? recibido = null;
        repo.Setup(r => r.ListarAsync(It.IsAny<FiltroEmpleados>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .Callback<FiltroEmpleados, int, int, CancellationToken>((f, _, _, _) => recibido = f)
            .ReturnsAsync(new ListaPaginada<EmpleadoResumenDto>());
        var sede = Guid.NewGuid();

        await new TalentoHumanoService(repo.Object).ListarAsync(false, sede, " ", " coordinadora ", 1, 20);

        Assert.Equal(new FiltroEmpleados(false, sede, null, "coordinadora"), recibido);
    }

    // ── Forma JSON única de los listados paginados ───────────────────────────

    private static readonly System.Text.Json.JsonSerializerOptions Web = new(System.Text.Json.JsonSerializerDefaults.Web);

    [Fact]
    public void ListaPaginada_Serializa_Con_La_Forma_Del_Frontend()
    {
        var json = System.Text.Json.JsonSerializer.Serialize(
            new ListaPaginada<string> { Data = ["a", "b"], Total = 12, Pagina = 2, PorPagina = 2 }, Web);
        Assert.Equal("""{"data":["a","b"],"total":12,"pagina":2,"porPagina":2}""", json);
    }

    [Fact]
    public void ListaMovimientos_Agrega_Totales_A_La_Misma_Forma()
    {
        var json = System.Text.Json.JsonSerializer.Serialize(
            new ListaMovimientosDto { Total = 3, Pagina = 1, PorPagina = 50, TotalIngresos = 100m, CantidadEgresos = 1 }, Web);
        using var doc = System.Text.Json.JsonDocument.Parse(json);
        foreach (var campo in new[] { "data", "total", "pagina", "porPagina", "totalIngresos", "totalEgresos", "cantidadIngresos", "cantidadEgresos" })
            Assert.True(doc.RootElement.TryGetProperty(campo, out _), $"falta {campo}");
    }
}
