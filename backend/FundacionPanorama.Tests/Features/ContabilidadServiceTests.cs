using FundacionPanorama.Application.Features.Contabilidad;
using FundacionPanorama.Application.Features.Contabilidad.DTOs;
using FundacionPanorama.Application.Features.Contabilidad.Interfaces;
using FundacionPanorama.Domain.Shared;
using Moq;

namespace FundacionPanorama.Tests.Features;

public class ContabilidadServiceTests
{
    private readonly Mock<IContabilidadRepository> _repo = new();
    private readonly ContabilidadService           _sut;

    static readonly Guid Caja  = Guid.NewGuid();
    static readonly Guid Banco = Guid.NewGuid();
    static DateOnly Hoy => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-5));

    public ContabilidadServiceTests()
    {
        _sut = new(_repo.Object);
        _repo.Setup(r => r.ListarCuentasAsync(It.IsAny<CancellationToken>())).ReturnsAsync(
        [
            new CuentaCajaDto(Caja,  "Caja menor", "caja_menor",      null, null, 0, 100_000, true),
            new CuentaCajaDto(Banco, "Bancolombia", "cuenta_bancaria", "Bancolombia", "123", 0, 5_000_000, true),
        ]);
        _repo.Setup(r => r.ListarCategoriasAsync(null, It.IsAny<CancellationToken>())).ReturnsAsync(
        [
            new CategoriaContableDto(1, "ingreso", "4120", "Donaciones en dinero", null, null),
            new CategoriaContableDto(2, "egreso",  "5105", "Gastos de personal",   null, null),
        ]);
    }

    static CrearMovimientoDto Mov(string tipo = "egreso", decimal monto = 50_000, int categoria = 2,
        Guid? cuenta = null, DateOnly? fecha = null, decimal? retencion = null, decimal? tarifa = null)
        => new(tipo, fecha ?? Hoy, "Compra de mercados", monto, cuenta ?? Caja, categoria, null,
               null, null, null, null, null, retencion, tarifa, null);

    async Task<string> Rechazo(Func<Task> accion) =>
        (await Assert.ThrowsAsync<DatoInvalidoException>(accion)).Message;

    // ── Movimientos ──────────────────────────────────────────────────────────

    [Theory]
    [InlineData(0)]
    [InlineData(-1000)]
    public async Task Movimiento_Rechaza_Monto_No_Positivo(decimal monto)
    {
        Assert.Contains("mayor que cero", await Rechazo(() => _sut.CrearMovimientoAsync(Mov(monto: monto))));
        _repo.Verify(r => r.CrearMovimientoAsync(It.IsAny<CrearMovimientoDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Movimiento_Rechaza_Tipo_Invalido()
        => Assert.Contains("ingreso o egreso", await Rechazo(() => _sut.CrearMovimientoAsync(Mov(tipo: "traslado"))));

    [Fact]
    public async Task Movimiento_Rechaza_Cuenta_Inexistente()
        => Assert.Contains("no existe", await Rechazo(() => _sut.CrearMovimientoAsync(Mov(cuenta: Guid.NewGuid()))));

    [Fact]
    public async Task Movimiento_Rechaza_Categoria_De_Otro_Tipo()
        => Assert.Contains("es de ingreso", await Rechazo(() => _sut.CrearMovimientoAsync(Mov(tipo: "egreso", categoria: 1))));

    [Fact]
    public async Task Movimiento_Rechaza_Fecha_Futura()
        => Assert.Contains("futura", await Rechazo(() => _sut.CrearMovimientoAsync(Mov(fecha: Hoy.AddDays(2)))));

    [Fact]
    public async Task Movimiento_Rechaza_Retencion_Mayor_Que_El_Monto()
        => Assert.Contains("retención", await Rechazo(() => _sut.CrearMovimientoAsync(Mov(monto: 100, retencion: 200))));

    [Fact]
    public async Task Movimiento_Valido_Se_Guarda()
    {
        await _sut.CrearMovimientoAsync(Mov());
        _repo.Verify(r => r.CrearMovimientoAsync(It.IsAny<CrearMovimientoDto>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Editar_Movimiento_Aplica_Las_Mismas_Reglas()
    {
        var dto = new ActualizarMovimientoDto("egreso", Hoy, "X", -5, Caja, 2, null, null, null, null, null, null, null, null, null);
        Assert.Contains("mayor que cero", await Rechazo(() => _sut.ActualizarMovimientoAsync(Guid.NewGuid(), dto)));
    }

    static MovimientoDto Guardado(Guid id, bool anulado) =>
        new(id, "egreso", Hoy, "Compra", 50_000, Caja, "Caja menor", 2, "Gastos de personal", "5105",
            null, null, null, null, null, null, DateTime.UtcNow, 1, null, null, null, null, anulado);

    [Fact]
    public async Task Editar_Movimiento_Anulado_Se_Rechaza_Sin_Tocar_La_Bd()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.ObtenerMovimientoAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(Guardado(id, anulado: true));
        var dto = new ActualizarMovimientoDto("egreso", Hoy, "X", 10_000, Caja, 2, null, null, null, null, null, null, null, null, null);

        Assert.Equal("Este movimiento está anulado: no se puede editar.", await Rechazo(() => _sut.ActualizarMovimientoAsync(id, dto)));
        _repo.Verify(r => r.ActualizarMovimientoAsync(It.IsAny<Guid>(), It.IsAny<ActualizarMovimientoDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Eliminar_Movimiento_Anulado_Se_Rechaza_Sin_Tocar_La_Bd()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.ObtenerMovimientoAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(Guardado(id, anulado: true));

        Assert.Equal("Este movimiento está anulado: no se puede eliminar; ya no afecta el saldo.",
            await Rechazo(() => _sut.EliminarMovimientoAsync(id)));
        _repo.Verify(r => r.EliminarMovimientoAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Editar_Y_Eliminar_Movimiento_Vigente_Llegan_Al_Repositorio()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.ObtenerMovimientoAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(Guardado(id, anulado: false));
        _repo.Setup(r => r.EliminarMovimientoAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        var dto = new ActualizarMovimientoDto("egreso", Hoy, "X", 10_000, Caja, 2, null, null, null, null, null, null, null, null, null);

        await _sut.ActualizarMovimientoAsync(id, dto);
        Assert.True(await _sut.EliminarMovimientoAsync(id));
        _repo.Verify(r => r.ActualizarMovimientoAsync(id, dto, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Eliminar_Movimiento_Inexistente_Devuelve_False()
    {
        Assert.False(await _sut.EliminarMovimientoAsync(Guid.NewGuid()));
        _repo.Verify(r => r.EliminarMovimientoAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ── Cuentas, presupuesto y caja menor ────────────────────────────────────

    [Fact]
    public async Task Cuenta_Rechaza_Tipo_Y_Saldo_Negativo()
    {
        Assert.Contains("tipo de cuenta", await Rechazo(() => _sut.CrearCuentaAsync(new("Caja", "tarjeta", null, null, 0))));
        Assert.Contains("negativo", await Rechazo(() => _sut.CrearCuentaAsync(new("Caja", "caja", null, null, -1))));
    }

    [Fact]
    public async Task Presupuesto_Rechaza_Duplicado_De_Categoria_Y_Proyecto()
    {
        var anio = Hoy.Year;
        _repo.Setup(r => r.ListarPresupuestosAsync(anio, It.IsAny<CancellationToken>())).ReturnsAsync(
            [new PresupuestoDto(Guid.NewGuid(), anio, null, null, 2, "Gastos de personal", "5105", 1_000_000, 0, 1_000_000)]);

        Assert.Contains("Ya hay un presupuesto", await Rechazo(() => _sut.CrearPresupuestoAsync(new(anio, null, 2, 500_000))));
    }

    [Fact]
    public async Task Presupuesto_Editado_No_Choca_Consigo_Mismo()
    {
        var anio = Hoy.Year;
        var id = Guid.NewGuid();
        _repo.Setup(r => r.ListarPresupuestosAsync(anio, It.IsAny<CancellationToken>())).ReturnsAsync(
            [new PresupuestoDto(id, anio, null, null, 2, "Gastos de personal", "5105", 1_000_000, 0, 1_000_000)]);

        await _sut.ActualizarPresupuestoAsync(id, new(anio, null, 2, 2_000_000));

        _repo.Verify(r => r.ActualizarPresupuestoAsync(id, It.IsAny<CrearPresupuestoDto>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Reposicion_Rechaza_Misma_Cuenta_Y_Monto_No_Positivo()
    {
        Assert.Contains("distinta", await Rechazo(() => _sut.ReponerCajaAsync(new(Caja, Caja, Hoy, 1000, null, null))));
        Assert.Contains("mayor que cero", await Rechazo(() => _sut.ReponerCajaAsync(new(Caja, Banco, Hoy, 0, null, null))));
    }

    [Fact]
    public async Task Arqueo_Rechaza_Cuenta_Inexistente_Y_Saldo_Negativo()
    {
        Assert.Contains("no existe", await Rechazo(() => _sut.CrearArqueoAsync(new(Guid.NewGuid(), Hoy, 10, null, null))));
        Assert.Contains("negativo", await Rechazo(() => _sut.CrearArqueoAsync(new(Caja, Hoy, -10, null, null))));
    }
}
