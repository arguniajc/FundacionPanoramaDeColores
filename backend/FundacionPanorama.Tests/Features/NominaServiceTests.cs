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

    [Fact]
    public async Task Periodo_Duplicado_Del_Mismo_Mes()
    {
        _repo.Setup(r => r.ListarPeriodosAsync(2026, It.IsAny<CancellationToken>())).ReturnsAsync([Periodo(1, "borrador", mes: 5)]);
        var ex = await Assert.ThrowsAsync<DatoInvalidoException>(() => _sut.CrearPeriodoAsync(new(5, 2026, null, null)));
        Assert.Contains("Ya existe", ex.Message);
    }
}
