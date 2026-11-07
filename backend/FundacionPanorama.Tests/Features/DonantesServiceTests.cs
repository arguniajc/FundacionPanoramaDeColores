using FundacionPanorama.Application.Features.Donantes;
using FundacionPanorama.Application.Features.Donantes.DTOs;
using FundacionPanorama.Application.Features.Donantes.Interfaces;
using Moq;

namespace FundacionPanorama.Tests.Features;

public class DonantesServiceTests
{
    private readonly Mock<IDonantesRepository> _repo = new();
    private readonly DonantesService           _sut;

    public DonantesServiceTests() => _sut = new(_repo.Object);

    [Theory]
    [InlineData(0, 0, 1, 1)]
    [InlineData(-3, 10000, 1, 500)]
    [InlineData(2, 50, 2, 50)]
    public async Task ListarAsync_Ajusta_Pagina_Y_PorPagina(int pagina, int porPagina, int pEsperada, int ppEsperado)
    {
        _repo.Setup(r => r.ListarAsync(It.IsAny<string?>(), It.IsAny<bool>(), It.IsAny<int>(), It.IsAny<int>(), default))
             .ReturnsAsync([]);

        await _sut.ListarAsync("ana", true, pagina, porPagina);

        _repo.Verify(r => r.ListarAsync("ana", true, pEsperada, ppEsperado, default), Times.Once);
    }

    [Fact]
    public async Task ToggleAsync_Devuelve_Null_Si_No_Existe()
    {
        _repo.Setup(r => r.ToggleAsync(It.IsAny<Guid>(), default)).ReturnsAsync((bool?)null);
        Assert.Null(await _sut.ToggleAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task EliminarAsync_Delega_En_Repositorio()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.EliminarAsync(id, default)).ReturnsAsync(true);

        Assert.True(await _sut.EliminarAsync(id));
        _repo.Verify(r => r.EliminarAsync(id, default), Times.Once);
    }
}
