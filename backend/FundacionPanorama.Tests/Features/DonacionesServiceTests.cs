using FundacionPanorama.Application.Features.Donaciones;
using FundacionPanorama.Application.Features.Donaciones.DTOs;
using FundacionPanorama.Application.Features.Donaciones.Interfaces;
using Moq;

namespace FundacionPanorama.Tests.Features;

public class DonacionesServiceTests
{
    private readonly Mock<IDonacionesRepository> _repo = new();
    private readonly DonacionesService           _sut;

    public DonacionesServiceTests() => _sut = new(_repo.Object);

    private static CrearDonacionDto Crear(string tipo, decimal? monto = null, decimal? cantidad = null,
        Guid? itemId = null, string? nombreItem = null)
        => new(Guid.NewGuid(), tipo, monto, itemId, nombreItem, cantidad, "unidad", null, null, null, null, null);

    private static DonacionDto Donacion(
        string tipo = "dinero", decimal? monto = 50000m, string nombreDonante = "Juan Pérez",
        string? recibo = "REC-2026-0001", string? nombreItem = null, decimal? cantidad = null,
        string programa = "", string sede = "", string? tipoDoc = null, string? doc = null)
        => new(Guid.NewGuid(), Guid.NewGuid(), nombreDonante, "persona", tipo, monto, null, nombreItem, cantidad,
               "unidad", null, programa, null, sede, null, new DateTime(2026, 3, 15), recibo, true,
               DateTime.UtcNow, tipoDoc, doc, null, "emitido");

    // ── Validación ───────────────────────────────────────────────────────────

    [Theory]
    [InlineData(null)]
    [InlineData(0)]
    public void ValidarCrear_Dinero_Sin_Monto_Positivo(int? monto)
        => Assert.Equal("El monto es obligatorio para donaciones en dinero.",
                        DonacionesService.ValidarCrear(Crear("dinero", monto: monto)));

    [Fact]
    public void ValidarCrear_Dinero_Con_Monto_Es_Valido()
        => Assert.Null(DonacionesService.ValidarCrear(Crear("dinero", monto: 1000m)));

    [Theory]
    [InlineData(null)]
    [InlineData(0)]
    public void ValidarCrear_Especie_Sin_Cantidad_Positiva(int? cantidad)
        => Assert.Equal("La cantidad es obligatoria para donaciones en especie.",
                        DonacionesService.ValidarCrear(Crear("especie", cantidad: cantidad, nombreItem: "Balón")));

    [Fact]
    public void ValidarCrear_Negativos_Dicen_Que_No_Pueden_Ser_Negativos()
    {
        Assert.Equal("El monto no puede ser negativo.", DonacionesService.ValidarCrear(Crear("dinero", monto: -10)));
        Assert.Equal("La cantidad no puede ser negativa.",
                     DonacionesService.ValidarCrear(Crear("especie", cantidad: -1, nombreItem: "Balón")));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ValidarCrear_Especie_Sin_Item_Ni_Nombre(string? nombre)
        => Assert.Equal("Debe indicar el artículo o su nombre.",
                        DonacionesService.ValidarCrear(Crear("especie", cantidad: 2, nombreItem: nombre)));

    [Fact]
    public void ValidarCrear_Especie_Con_ItemId_O_Nombre_Es_Valida()
    {
        Assert.Null(DonacionesService.ValidarCrear(Crear("especie", cantidad: 2, itemId: Guid.NewGuid())));
        Assert.Null(DonacionesService.ValidarCrear(Crear("especie", cantidad: 2, nombreItem: "Balón")));
    }

    [Fact]
    public void ValidarCrear_Especie_Ignora_Monto_Y_Dinero_Ignora_Cantidad()
    {
        Assert.Null(DonacionesService.ValidarCrear(Crear("especie", cantidad: 1, nombreItem: "X", monto: null)));
        Assert.Null(DonacionesService.ValidarCrear(Crear("dinero", monto: 5, cantidad: null)));
    }

    [Fact]
    public void ValidarCrear_Rechaza_Tipo_Desconocido()
        => Assert.Equal("El tipo de donación debe ser dinero o especie.",
                        DonacionesService.ValidarCrear(Crear("servicio")));

    [Fact]
    public void ValidarCrear_Rechaza_Negativos_Y_Fecha_Futura()
    {
        Assert.NotNull(DonacionesService.ValidarCrear(Crear("especie", cantidad: 2, nombreItem: "X", monto: -1)));
        Assert.NotNull(DonacionesService.ValidarCrear(Crear("dinero", monto: 5, cantidad: -1)));
        var futura = Crear("dinero", monto: 5) with { FechaDonacion = DateTime.UtcNow.AddDays(3) };
        Assert.Equal("La fecha de la donación no puede ser futura.", DonacionesService.ValidarCrear(futura));
    }

    [Fact]
    public void ValidarCrear_Exige_Donante()
        => Assert.Equal("Selecciona el donante.",
                        DonacionesService.ValidarCrear(Crear("dinero", monto: 5) with { DonanteId = Guid.Empty }));

    // ── Delegación ───────────────────────────────────────────────────────────

    [Fact]
    public async Task CrearAsync_Delega_En_Repositorio_Con_Usuario()
    {
        var dto = Crear("dinero", monto: 1000);
        var don = Donacion();
        _repo.Setup(r => r.CrearAsync(dto, "u@x.com", default)).ReturnsAsync(don);

        Assert.Same(don, await _sut.CrearAsync(dto, "u@x.com"));
    }

    // ── Recibo HTML ──────────────────────────────────────────────────────────

    [Fact]
    public void GenerarHtmlRecibo_Dinero_Incluye_Recibo_Donante_Y_Monto_Formateado()
    {
        var html = DonacionesService.GenerarHtmlRecibo(Donacion(monto: 1250000m), null);

        Assert.Contains("REC-2026-0001", html);
        Assert.Contains(System.Net.WebUtility.HtmlEncode("Juan Pérez"), html); // HtmlEncode convierte "é" en &#233;
        Assert.Contains("Valor donado", html);
        Assert.Contains("1.250.000", html); // formato es-CO: separador de miles con punto
        Assert.Contains("$", html);
        Assert.DoesNotContain("1250000", html);
    }

    [Fact]
    public void GenerarHtmlRecibo_Sin_Configuracion_Usa_Nombre_Por_Defecto()
    {
        var html = DonacionesService.GenerarHtmlRecibo(Donacion(), null);
        Assert.Contains(System.Net.WebUtility.HtmlEncode("Fundación Panorama de Colores"), html);
    }

    [Fact]
    public void GenerarHtmlRecibo_Sin_Numero_De_Recibo_Muestra_Guion()
    {
        var html = DonacionesService.GenerarHtmlRecibo(Donacion(recibo: null), null);
        Assert.Contains(System.Net.WebUtility.HtmlEncode("—"), html);
    }

    [Fact]
    public void GenerarHtmlRecibo_Especie_Muestra_Articulo_Y_Cantidad()
    {
        var html = DonacionesService.GenerarHtmlRecibo(
            Donacion(tipo: "especie", monto: null, nombreItem: "Balón", cantidad: 3), null);

        Assert.Contains("Artículo", html);
        // HtmlEncode escribe la ó como entidad (&#243;); se compara el texto que ve el lector
        Assert.Contains("3 unidad — Balón", System.Net.WebUtility.HtmlDecode(html));
        Assert.DoesNotContain("Valor donado", html);
    }

    [Fact]
    public void GenerarHtmlRecibo_Programa_Sede_Y_Documento_Opcionales()
    {
        var sin = DonacionesService.GenerarHtmlRecibo(Donacion(), null);
        Assert.DoesNotContain(">Programa<", sin);
        Assert.DoesNotContain(">Sede<", sin);

        var con = DonacionesService.GenerarHtmlRecibo(
            Donacion(programa: "Arte", sede: "Norte", tipoDoc: "cc", doc: "16123456"), null);
        Assert.Contains(">Programa<", con);
        Assert.Contains("Arte", con);
        Assert.Contains(">Sede<", con);
        Assert.Contains("Norte", con);
        Assert.Contains("CC: 16123456", con);
    }

    [Fact]
    public void GenerarHtmlRecibo_Escapa_Nombre_Del_Donante()
    {
        var html = DonacionesService.GenerarHtmlRecibo(Donacion(nombreDonante: "<script>alert(1)</script>"), null);

        Assert.DoesNotContain("<script>", html);
        Assert.Contains("&lt;script&gt;alert(1)&lt;/script&gt;", html);
    }

    [Fact]
    public void GenerarHtmlRecibo_Escapa_Nombre_Del_Articulo()
    {
        var html = DonacionesService.GenerarHtmlRecibo(
            Donacion(tipo: "especie", monto: null, cantidad: 1, nombreItem: "<a href='http://evil'>clic</a>"), null);

        Assert.DoesNotContain("<a href=", html);
    }

    [Fact]
    public void GenerarHtmlRecibo_Escapa_Documento_Del_Donante()
    {
        var html = DonacionesService.GenerarHtmlRecibo(Donacion(tipoDoc: "cc", doc: "<img src=x>"), null);

        Assert.DoesNotContain("<img src=x>", html);
    }
}
