using FundacionPanorama.Application.Features.Inscripciones;
using FundacionPanorama.Application.Features.Inscripciones.DTOs;
using FundacionPanorama.Application.Features.Inscripciones.Interfaces;
using FundacionPanorama.Application.Shared;
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
        _repo.Setup(r => r.CambiarEstadoAsync(id, "baja", default))
             .ReturnsAsync(new CambiarEstadoInscripcionResultado(null, ErrorCambiarEstadoInscripcion.NoEncontrada));

        var res = await _sut.CambiarEstadoAsync(id, "baja");

        Assert.Equal(ErrorCambiarEstadoInscripcion.NoEncontrada, res.Error);
        Assert.Null(res.Inscripcion);
        _repo.Verify(r => r.CambiarEstadoAsync(id, "baja", default), Times.Once);
    }

    [Fact]
    public async Task CambiarEstadoAsync_Reactivar_Con_Cupo_Lleno_Devuelve_El_Error()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.CambiarEstadoAsync(id, "activa", default))
             .ReturnsAsync(new CambiarEstadoInscripcionResultado(null, ErrorCambiarEstadoInscripcion.CupoLleno));

        var res = await _sut.CambiarEstadoAsync(id, "activa");

        Assert.Equal(ErrorCambiarEstadoInscripcion.CupoLleno, res.Error);
        Assert.Null(res.Inscripcion);
    }

    // ── Listar (paginación en servidor) ──────────────────────────────────────

    [Theory]
    [InlineData(0, 0, 1, 1)]
    [InlineData(-5, 500, 1, 100)]
    [InlineData(3, 25, 3, 25)]
    [InlineData(int.MaxValue, 100, 100_000, 100)]
    public async Task ListarAsync_Ajusta_Pagina_Y_PorPagina(int pagina, int porPagina, int pEsperada, int ppEsperado)
    {
        _repo.Setup(r => r.ListarAsync(It.IsAny<FiltroInscripciones>(), It.IsAny<int>(), It.IsAny<int>(), default))
             .ReturnsAsync(new ListaPaginada<InscripcionDto>());

        await _sut.ListarAsync(null, null, null, null, pagina, porPagina);

        _repo.Verify(r => r.ListarAsync(It.IsAny<FiltroInscripciones>(), pEsperada, ppEsperado, default), Times.Once);
    }

    [Fact]
    public async Task ListarAsync_Limpia_Busqueda_Y_Estado()
    {
        var pid = Guid.NewGuid();
        FiltroInscripciones? recibido = null;
        _repo.Setup(r => r.ListarAsync(It.IsAny<FiltroInscripciones>(), It.IsAny<int>(), It.IsAny<int>(), default))
             .Callback<FiltroInscripciones, int, int, CancellationToken>((f, _, _, _) => recibido = f)
             .ReturnsAsync(new ListaPaginada<InscripcionDto>());

        await _sut.ListarAsync(pid, null, "  ", "  ana  ", 1, 20);

        Assert.Equal(new FiltroInscripciones(pid, null, null, "ana"), recibido);
    }
}
