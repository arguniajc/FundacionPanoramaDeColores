using FundacionPanorama.Application.Features.Inscripciones;
using FundacionPanorama.Application.Features.Inscripciones.DTOs;
using FundacionPanorama.Application.Features.Inscripciones.Interfaces;
using Moq;

namespace FundacionPanorama.Tests.Features;

public class InscripcionesServiceTests
{
    private readonly Mock<IInscripcionesRepository> _repo = new();
    private readonly InscripcionesService           _sut;

    public InscripcionesServiceTests() => _sut = new(_repo.Object);

    [Theory]
    [InlineData("activa")]
    [InlineData("suspendida")]
    [InlineData("completada")]
    [InlineData("baja")]
    public void EsEstadoValido_Estados_Conocidos(string estado)
        => Assert.True(InscripcionesService.EsEstadoValido(estado));

    [Theory]
    [InlineData("")]
    [InlineData("Activa")]   // distingue mayúsculas
    [InlineData(" activa")]
    [InlineData("cancelada")]
    public void EsEstadoValido_Rechaza_Otros(string estado)
        => Assert.False(InscripcionesService.EsEstadoValido(estado));

    [Theory]
    [InlineData("{}")]
    [InlineData("{\"talla\":\"M\",\"n\":3}")]
    [InlineData("[]")]
    [InlineData("\"texto\"")]
    public void EsJsonValido_Acepta_Json(string json)
        => Assert.True(InscripcionesService.EsJsonValido(json));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("{talla:M}")]
    [InlineData("{\"a\":1")]
    public void EsJsonValido_Rechaza_Invalido_O_Vacio(string? json)
        => Assert.False(InscripcionesService.EsJsonValido(json));

    [Fact]
    public async Task CrearAsync_Devuelve_El_Error_Del_Repositorio()
    {
        var dto = new CrearInscripcionDto(Guid.NewGuid(), Guid.NewGuid(), "{}", null);
        _repo.Setup(r => r.CrearAsync(dto, default))
             .ReturnsAsync(new CrearInscripcionResultado(null, ErrorCrearInscripcion.YaInscritoActivo));

        var res = await _sut.CrearAsync(dto);

        Assert.Equal(ErrorCrearInscripcion.YaInscritoActivo, res.Error);
        Assert.Null(res.Inscripcion);
    }

    [Fact]
    public async Task CambiarEstadoAsync_Delega_En_Repositorio()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.CambiarEstadoAsync(id, "baja", default)).ReturnsAsync((InscripcionDto?)null);

        Assert.Null(await _sut.CambiarEstadoAsync(id, "baja"));
        _repo.Verify(r => r.CambiarEstadoAsync(id, "baja", default), Times.Once);
    }
}
