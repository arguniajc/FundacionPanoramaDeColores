using FundacionPanorama.Application.Features.Configuracion;
using FundacionPanorama.Application.Features.Configuracion.DTOs;
using FundacionPanorama.Application.Features.Configuracion.Interfaces;
using Moq;

namespace FundacionPanorama.Tests.Features;

public class ConfiguracionServiceTests
{
    private readonly Mock<IConfiguracionRepository> _repo = new();
    private readonly ConfiguracionService _sut;

    public ConfiguracionServiceTests() => _sut = new(_repo.Object);

    [Fact]
    public async Task ObtenerAsync_Delega_Al_Repositorio()
    {
        var dto = new ConfiguracionDto("Fundación", null, null, null, null, null, null, null,
            null, "#6200ea", "#150830", null, null, null, null, null, null, null, null, null);
        _repo.Setup(r => r.ObtenerAsync(default)).ReturnsAsync(dto);

        var result = await _sut.ObtenerAsync();

        Assert.Equal(dto, result);
        _repo.Verify(r => r.ObtenerAsync(default), Times.Once);
    }

    [Fact]
    public async Task ObtenerPublicaAsync_Devuelve_Null_Cuando_No_Hay_Config()
    {
        _repo.Setup(r => r.ObtenerPublicaAsync(default)).ReturnsAsync((ConfiguracionPublicaDto?)null);

        var result = await _sut.ObtenerPublicaAsync();

        Assert.Null(result);
    }

    [Fact]
    public async Task GuardarAsync_Retorna_Success_Con_Config_Guardada()
    {
        var guardarDto = new GuardarConfiguracionDto("Fundación", null, null, null, null, null,
            null, null, null, "#6200ea", "#150830", null, null, null, null, null, null, null, null);
        var savedDto   = new ConfiguracionDto("Fundación", null, null, null, null, null, null,
            null, null, "#6200ea", "#150830", null, null, null, null, null, null, null, null, DateTime.UtcNow);
        _repo.Setup(r => r.GuardarAsync(guardarDto, default)).ReturnsAsync(savedDto);

        var result = await _sut.GuardarAsync(guardarDto);

        Assert.True(result.IsSuccess);
        Assert.Equal("Fundación", result.Value?.NombreFundacion);
    }

    [Fact]
    public async Task GuardarAsync_Retorna_Failure_Cuando_Repositorio_Lanza_Excepcion()
    {
        var guardarDto = new GuardarConfiguracionDto(null, null, null, null, null, null,
            null, null, null, null, null, null, null, null, null, null, null, null, null);
        _repo.Setup(r => r.GuardarAsync(guardarDto, default))
             .ThrowsAsync(new InvalidOperationException("BD no disponible"));

        var result = await _sut.GuardarAsync(guardarDto);

        Assert.False(result.IsSuccess);
        Assert.Contains("BD no disponible", result.Error);
    }
}
