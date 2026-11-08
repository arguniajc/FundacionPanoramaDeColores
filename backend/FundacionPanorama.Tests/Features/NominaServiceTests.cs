using FundacionPanorama.Application.Features.Nomina;
using FundacionPanorama.Application.Features.Nomina.DTOs;
using FundacionPanorama.Application.Features.Nomina.Interfaces;
using FundacionPanorama.Domain.Shared;
using Moq;

namespace FundacionPanorama.Tests.Features;

public class NominaServiceTests
{
    private readonly Mock<INominaRepository> _repo = new();
    private readonly NominaService           _sut;

    public NominaServiceTests() => _sut = new(_repo.Object);

    static NominaPeriodoDto Periodo(int id, string estado, int mes = 5, int anio = 2026) =>
        new(id, mes, "Mayo", anio, null, estado, null, 0, 0, DateTime.UtcNow);

    static LiquidarEmpleadoDto Liq(int dias = 30, decimal extras = 0, decimal? salario = null) =>
        new(Guid.NewGuid(), dias, salario, extras, 0, 0, 0, null);

    [Fact]
    public async Task No_Se_Liquida_Un_Periodo_Cerrado()
    {
        _repo.Setup(r => r.ObtenerPeriodoAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(Periodo(1, "cerrado"));

        var ex = await Assert.ThrowsAsync<DatoInvalidoException>(() => _sut.LiquidarEmpleadoAsync(1, Liq()));
        Assert.Contains("cerrado", ex.Message);
        await Assert.ThrowsAsync<DatoInvalidoException>(() => _sut.AutoLiquidarAsync(1, new()));
        _repo.Verify(r => r.AutoLiquidarAsync(It.IsAny<int>(), It.IsAny<AutoLiquidarDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Periodo_En_Borrador_Si_Se_Liquida()
    {
        _repo.Setup(r => r.ObtenerPeriodoAsync(2, It.IsAny<CancellationToken>())).ReturnsAsync(Periodo(2, "borrador"));
        await _sut.AutoLiquidarAsync(2, new());
        _repo.Verify(r => r.AutoLiquidarAsync(2, It.IsAny<AutoLiquidarDto>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(31)]
    public void Dias_Fuera_De_Rango(int dias)
        => Assert.Contains("entre 0 y 30", NominaService.ValidarLiquidacion(Liq(dias: dias)));

    [Fact]
    public void Valores_Negativos_Y_Salario_Cero()
    {
        Assert.Contains("negativas", NominaService.ValidarLiquidacion(Liq(extras: -5)));
        Assert.Contains("mayor que cero", NominaService.ValidarLiquidacion(Liq(salario: 0)));
        Assert.Null(NominaService.ValidarLiquidacion(Liq()));
    }

    [Theory]
    [InlineData(0, 2026)]
    [InlineData(13, 2026)]
    [InlineData(5, 2019)]
    public async Task Periodo_Con_Mes_O_Anio_Invalido(int mes, int anio)
        => await Assert.ThrowsAsync<DatoInvalidoException>(() => _sut.CrearPeriodoAsync(new(mes, anio, null, null)));

    // ── Edición de liquidaciones ─────────────────────────────────────────────

    static readonly Guid EmpleadoId = Guid.NewGuid();

    static NominaLiquidacionDto LiqGuardada(int id = 10, int periodoId = 1) =>
        new(id, periodoId, EmpleadoId, "Ana Pérez", "Docente", "123", 30,
            2_000_000, 200_000, 0, 0, 80_000, 80_000, 0, 0, 2_200_000, 160_000, 2_040_000, null);

    static EditarLiquidacionDto Edicion(int dias = 15, decimal? salario = 1_500_000, decimal extras = 50_000,
        decimal otras = 0, string? obs = null) =>
        new(dias, salario, extras, 0, 0, otras, obs);

    void ConLiquidacionEnPeriodo(string estado)
    {
        _repo.Setup(r => r.ObtenerLiquidacionAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(LiqGuardada());
        _repo.Setup(r => r.ObtenerPeriodoAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(Periodo(1, estado));
    }

    [Fact]
    public async Task Editar_Liquidacion_De_Periodo_Cerrado_Se_Rechaza()
    {
        ConLiquidacionEnPeriodo("cerrado");

        var ex = await Assert.ThrowsAsync<DatoInvalidoException>(() => _sut.EditarLiquidacionAsync(10, Edicion()));
        Assert.Contains("cerrado", ex.Message);
        _repo.Verify(r => r.ActualizarLiquidacionAsync(It.IsAny<int>(), It.IsAny<LiquidarEmpleadoDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Editar_Liquidacion_Inexistente_Devuelve_Null()
    {
        Assert.Null(await _sut.EditarLiquidacionAsync(99, Edicion()));
        _repo.Verify(r => r.ActualizarLiquidacionAsync(It.IsAny<int>(), It.IsAny<LiquidarEmpleadoDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(31, null, 0, "entre 0 y 30")]
    [InlineData(-1, null, 0, "entre 0 y 30")]
    [InlineData(30, 0, 0, "mayor que cero")]
    [InlineData(30, null, -100, "negativas")]
    public async Task Editar_Liquidacion_Aplica_Las_Mismas_Validaciones(int dias, int? salario, int extras, string mensaje)
    {
        ConLiquidacionEnPeriodo("borrador");

        var ex = await Assert.ThrowsAsync<DatoInvalidoException>(() =>
            _sut.EditarLiquidacionAsync(10, Edicion(dias, salario, extras)));
        Assert.Contains(mensaje, ex.Message);
        _repo.Verify(r => r.ActualizarLiquidacionAsync(It.IsAny<int>(), It.IsAny<LiquidarEmpleadoDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Editar_Liquidacion_Observacion_Demasiado_Larga()
    {
        ConLiquidacionEnPeriodo("borrador");
        var ex = await Assert.ThrowsAsync<DatoInvalidoException>(() =>
            _sut.EditarLiquidacionAsync(10, Edicion(obs: new string('x', 501))));
        Assert.Contains("500", ex.Message);
    }

    [Fact]
    public async Task Editar_Liquidacion_En_Borrador_Conserva_El_Empleado()
    {
        ConLiquidacionEnPeriodo("borrador");
        var editada = LiqGuardada() with { DiasTrabajados = 15, NetoPagar = 1_500_000 };
        _repo.Setup(r => r.ActualizarLiquidacionAsync(10, It.IsAny<LiquidarEmpleadoDto>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(editada);

        var res = await _sut.EditarLiquidacionAsync(10, Edicion(dias: 15, salario: 1_500_000, extras: 50_000, otras: 10_000, obs: "Ajuste"));

        Assert.Same(editada, res);
        _repo.Verify(r => r.ActualizarLiquidacionAsync(10,
            It.Is<LiquidarEmpleadoDto>(d =>
                d.EmpleadoId == EmpleadoId && d.DiasTrabajados == 15 && d.SalarioOverride == 1_500_000 &&
                d.HorasExtras == 50_000 && d.OtrasDeducciones == 10_000 && d.Observacion == "Ajuste"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Editar_Liquidacion_Si_El_Periodo_Se_Cerro_Al_Guardar_Se_Rechaza()
    {
        ConLiquidacionEnPeriodo("borrador");
        // El UPDATE no afecta filas: el período se cerró entre la consulta y el guardado
        _repo.Setup(r => r.ActualizarLiquidacionAsync(10, It.IsAny<LiquidarEmpleadoDto>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync((NominaLiquidacionDto?)null);

        var ex = await Assert.ThrowsAsync<DatoInvalidoException>(() => _sut.EditarLiquidacionAsync(10, Edicion()));
        Assert.Contains("cerrado", ex.Message);
    }

    [Fact]
    public async Task Periodo_Duplicado_Del_Mismo_Mes()
    {
        _repo.Setup(r => r.ListarPeriodosAsync(2026, It.IsAny<CancellationToken>())).ReturnsAsync([Periodo(1, "borrador", mes: 5)]);
        var ex = await Assert.ThrowsAsync<DatoInvalidoException>(() => _sut.CrearPeriodoAsync(new(5, 2026, null, null)));
        Assert.Contains("Ya existe", ex.Message);
    }
}
