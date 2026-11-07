using FundacionPanorama.Application.Features.Inventario;
using FundacionPanorama.Application.Features.Inventario.DTOs;
using FundacionPanorama.Application.Features.Inventario.Interfaces;
using Moq;

namespace FundacionPanorama.Tests.Features;

public class InventarioServiceTests
{
    private readonly Mock<IInventarioRepository> _repo = new();
    private readonly InventarioService           _sut;

    public InventarioServiceTests() => _sut = new(_repo.Object);

    private static CrearItemDto NuevoItem(string nombre = "Cuaderno", string categoria = "Material escolar",
        decimal stock = 10, decimal minimo = 2)
        => new(null, nombre, null, "unidad", categoria, stock, minimo);

    private static ItemInventarioDto Item(Guid id) => new(
        id, null, "", "MAT-26-0001", "Cuaderno", null, "unidad", "Material escolar", 10, 2, true,
        DateTime.UtcNow, DateTime.UtcNow, "propio", null, null, null, null);

    // ── Reglas puras ─────────────────────────────────────────────────────────

    [Theory]
    [InlineData("Material escolar", "MAT")]
    [InlineData("Equipos electrónicos", "EQU")]
    [InlineData("Deportivo", "DEP")]
    [InlineData("Ropa y calzado", "ROP")]
    [InlineData("Alimentos", "ALI")]
    [InlineData("Medicamentos", "MED")]
    [InlineData("Muebles y enseres", "MUE")]
    [InlineData("Herramientas", "HER")]
    [InlineData("Otros", "OTR")]
    [InlineData("algo nuevo", "OTR")]
    [InlineData("material escolar", "OTR")] // distingue mayúsculas
    [InlineData("", "OTR")]
    public void CatPrefix_Mapea_Categorias(string categoria, string esperado)
        => Assert.Equal(esperado, InventarioReglas.CatPrefix(categoria));

    [Theory]
    [InlineData("MAT", "26", 1, "MAT-26-0001")]
    [InlineData("OTR", "25", 42, "OTR-25-0042")]
    [InlineData("EQU", "26", 9999, "EQU-26-9999")]
    [InlineData("EQU", "26", 12345, "EQU-26-12345")]
    public void GenerarCodigo_Formato_Prefijo_Anio_Secuencia(string prefijo, string anio, int seq, string esperado)
        => Assert.Equal(esperado, InventarioReglas.GenerarCodigo(prefijo, anio, seq));

    [Theory]
    [InlineData("+", 10, 5, 15)]   // entrada
    [InlineData("-", 10, 4, 6)]    // salida
    [InlineData("-", 10, 10, 0)]
    [InlineData("=", 10, 3, 7)]    // cualquier signo distinto de "+" resta
    [InlineData("+", 0, 2.5, 2.5)]
    public void CalcularNuevoStock_Suma_O_Resta_Segun_Signo(string signo, decimal actual, decimal cant, decimal esperado)
        => Assert.Equal(esperado, InventarioReglas.CalcularNuevoStock(signo, actual, cant));

    [Fact]
    public void CalcularNuevoStock_No_Valida_Negativos_Lo_Hace_El_Repositorio()
    {
        // La regla pura devuelve stock negativo; el rechazo ("Stock insuficiente") está en InventarioRepository.
        Assert.Equal(-5m, InventarioReglas.CalcularNuevoStock("-", 5, 10));
    }

    // ── Crear item ───────────────────────────────────────────────────────────

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CrearItemAsync_Sin_Nombre_Es_Invalido(string nombre)
    {
        var res = await _sut.CrearItemAsync(NuevoItem(nombre: nombre));

        Assert.Equal(EstadoResultadoInventario.Invalido, res.Estado);
        Assert.Equal("El nombre es obligatorio.", res.Mensaje);
        _repo.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(-1, 0)]
    [InlineData(0, -1)]
    public async Task CrearItemAsync_Stock_Negativo_Es_Invalido(decimal stock, decimal minimo)
    {
        var res = await _sut.CrearItemAsync(NuevoItem(stock: stock, minimo: minimo));

        Assert.Equal(EstadoResultadoInventario.Invalido, res.Estado);
        Assert.Equal("El stock no puede ser negativo.", res.Mensaje);
        _repo.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CrearItemAsync_Valido_Pasa_Categoria_Prefijo_Y_Anio()
    {
        var item = Item(Guid.NewGuid());
        var dto  = NuevoItem(categoria: " Deportivo ");
        _repo.Setup(r => r.CrearItemAsync(dto, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(item);

        var res = await _sut.CrearItemAsync(dto);

        Assert.Equal(EstadoResultadoInventario.Ok, res.Estado);
        Assert.Same(item, res.Valor);
        var yy = DateTime.UtcNow.ToString("yy");
        _repo.Verify(r => r.CrearItemAsync(dto, "Deportivo", "DEP", yy), Times.Once);
    }

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    public async Task CrearItemAsync_Sin_Categoria_Usa_Otros(string categoria)
    {
        _repo.Setup(r => r.CrearItemAsync(It.IsAny<CrearItemDto>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
             .ReturnsAsync(Item(Guid.NewGuid()));

        await _sut.CrearItemAsync(NuevoItem(categoria: categoria));

        _repo.Verify(r => r.CrearItemAsync(It.IsAny<CrearItemDto>(), "Otros", "OTR", It.IsAny<string>()), Times.Once);
    }

    // ── Actualizar item ──────────────────────────────────────────────────────

    [Fact]
    public async Task ActualizarItemAsync_Sin_Nombre_Es_Invalido()
    {
        var res = await _sut.ActualizarItemAsync(Guid.NewGuid(), new ActualizarItemDto(" ", null, "unidad", "Otros", 0));

        Assert.Equal(EstadoResultadoInventario.Invalido, res.Estado);
        Assert.Equal("El nombre es obligatorio.", res.Mensaje);
        _repo.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ActualizarItemAsync_Minimo_Negativo_Es_Invalido()
    {
        var res = await _sut.ActualizarItemAsync(Guid.NewGuid(), new ActualizarItemDto("X", null, "unidad", "Otros", -1));

        Assert.Equal(EstadoResultadoInventario.Invalido, res.Estado);
        Assert.Equal("El stock mínimo no puede ser negativo.", res.Mensaje);
        _repo.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ActualizarItemAsync_No_Existe_Devuelve_NoEncontrado()
    {
        _repo.Setup(r => r.ActualizarItemAsync(It.IsAny<Guid>(), It.IsAny<ActualizarItemDto>()))
             .ReturnsAsync((ItemInventarioDto?)null);

        var res = await _sut.ActualizarItemAsync(Guid.NewGuid(), new ActualizarItemDto("X", null, "unidad", "Otros", 0));

        Assert.Equal(EstadoResultadoInventario.NoEncontrado, res.Estado);
        Assert.Null(res.Mensaje);
    }

    [Fact]
    public async Task ActualizarItemAsync_Ok()
    {
        var id   = Guid.NewGuid();
        var item = Item(id);
        _repo.Setup(r => r.ActualizarItemAsync(id, It.IsAny<ActualizarItemDto>())).ReturnsAsync(item);

        var res = await _sut.ActualizarItemAsync(id, new ActualizarItemDto("X", null, "unidad", "Otros", 0));

        Assert.Equal(EstadoResultadoInventario.Ok, res.Estado);
        Assert.Same(item, res.Valor);
    }

    // ── Movimientos / transferencias / ingreso desde donación ────────────────

    [Theory]
    [InlineData(0)]
    [InlineData(-3)]
    public async Task RegistrarMovimientoAsync_Cantidad_No_Positiva_Es_Invalida(decimal cantidad)
    {
        var res = await _sut.RegistrarMovimientoAsync(new RegistrarMovimientoDto(Guid.NewGuid(), 1, cantidad, null, null, null), "u@x.com");

        Assert.Equal(EstadoResultadoInventario.Invalido, res.Estado);
        Assert.Equal("La cantidad debe ser mayor a cero.", res.Mensaje);
        _repo.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task RegistrarMovimientoAsync_Valido_Delega_En_Repositorio()
    {
        var dto      = new RegistrarMovimientoDto(Guid.NewGuid(), 1, 5, "compra", null, null);
        var esperado = ResultadoInventario<MovimientoRegistradoResultado>.Exito(new(Guid.NewGuid(), 15));
        _repo.Setup(r => r.RegistrarMovimientoAsync(dto, "u@x.com")).ReturnsAsync(esperado);

        var res = await _sut.RegistrarMovimientoAsync(dto, "u@x.com");

        Assert.Same(esperado, res);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task TransferirAsync_Cantidad_No_Positiva_Es_Invalida(decimal cantidad)
    {
        var res = await _sut.TransferirAsync(new TransferenciaDto(Guid.NewGuid(), Guid.NewGuid(), cantidad, null), null);

        Assert.Equal(EstadoResultadoInventario.Invalido, res.Estado);
        Assert.Equal("La cantidad debe ser mayor a cero.", res.Mensaje);
        _repo.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task TransferirAsync_Valido_Delega_En_Repositorio()
    {
        // La validación "sede destino distinta de la origen" vive en el repositorio (necesita leer la sede del ítem).
        var dto      = new TransferenciaDto(Guid.NewGuid(), Guid.NewGuid(), 2, null);
        var esperado = ResultadoInventario<TransferenciaResultado>.Invalido("La sede destino debe ser diferente a la sede origen.");
        _repo.Setup(r => r.TransferirAsync(dto, null)).ReturnsAsync(esperado);

        var res = await _sut.TransferirAsync(dto, null);

        Assert.Same(esperado, res);
    }

    private static IngresarDesdeDonacionDto Ingreso(decimal cantidad = 3, string nombre = "Balón")
        => new(null, nombre, "Deportivo", "unidad", 0, null, cantidad, null, null, null);

    [Theory]
    [InlineData(0)]
    [InlineData(-2)]
    public async Task IngresarDesdeDonacionAsync_Cantidad_No_Positiva_Es_Invalida(decimal cantidad)
    {
        var res = await _sut.IngresarDesdeDonacionAsync(Ingreso(cantidad: cantidad), null);

        Assert.Equal(EstadoResultadoInventario.Invalido, res.Estado);
        Assert.Equal("La cantidad debe ser mayor a cero.", res.Mensaje);
        _repo.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task IngresarDesdeDonacionAsync_Sin_Nombre_Es_Invalido()
    {
        var res = await _sut.IngresarDesdeDonacionAsync(Ingreso(nombre: "   "), null);

        Assert.Equal(EstadoResultadoInventario.Invalido, res.Estado);
        Assert.Equal("El nombre del artículo es obligatorio.", res.Mensaje);
        _repo.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task IngresarDesdeDonacionAsync_Pasa_Nombre_Recortado()
    {
        var dto = Ingreso(nombre: "  Balón  ");
        _repo.Setup(r => r.IngresarDesdeDonacionAsync(dto, "Balón", "u@x.com"))
             .ReturnsAsync(ResultadoInventario<IngresoDonacionResultado>.Exito(new(Guid.NewGuid(), 3)));

        var res = await _sut.IngresarDesdeDonacionAsync(dto, "u@x.com");

        Assert.Equal(EstadoResultadoInventario.Ok, res.Estado);
        _repo.Verify(r => r.IngresarDesdeDonacionAsync(dto, "Balón", "u@x.com"), Times.Once);
    }
}
