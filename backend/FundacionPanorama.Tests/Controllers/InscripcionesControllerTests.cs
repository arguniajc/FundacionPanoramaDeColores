using FundacionPanorama.API.Controllers;
using FundacionPanorama.Application.Features.Inscripciones;
using FundacionPanorama.Application.Features.Inscripciones.DTOs;
using FundacionPanorama.Application.Features.Inscripciones.Interfaces;
using FundacionPanorama.Application.Shared;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace FundacionPanorama.Tests.Controllers;

/// <summary>Traducción a HTTP del listado paginado y del cambio de estado (cupo al reactivar).</summary>
public class InscripcionesControllerTests
{
    private readonly Mock<IInscripcionesRepository> _repo = new();
    private readonly InscripcionesController        _sut;

    public InscripcionesControllerTests() => _sut = new(new InscripcionesService(_repo.Object));

    private static InscripcionDto Inscripcion(Guid id, string estado = "activa") => new(
        id, Guid.NewGuid(), "Ana Pérez", "123", Guid.NewGuid(), "Fútbol", "Sede Norte",
        estado, DateTime.UtcNow, "{}", null, estado == "activa", DateTime.UtcNow);

    private static string? Mensaje(object? valor)
        => valor?.GetType().GetProperty("mensaje")?.GetValue(valor) as string;

    [Fact]
    public async Task CambiarEstado_Reactivar_Con_Cupo_Lleno_Responde_409_Con_Mensaje()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.CambiarEstadoAsync(id, "activa", default))
             .ReturnsAsync(new CambiarEstadoInscripcionResultado(null, ErrorCambiarEstadoInscripcion.CupoLleno));

        var res = await _sut.CambiarEstado(id, new CambiarEstadoDto("activa"));

        var conflicto = Assert.IsType<ConflictObjectResult>(res);
        Assert.Contains("cupo máximo", Mensaje(conflicto.Value));
    }

    [Fact]
    public async Task CambiarEstado_Reactivar_Con_Otra_Activa_Responde_409()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.CambiarEstadoAsync(id, "activa", default))
             .ReturnsAsync(new CambiarEstadoInscripcionResultado(null, ErrorCambiarEstadoInscripcion.YaInscritoActivo));

        var res = await _sut.CambiarEstado(id, new CambiarEstadoDto("activa"));

        var conflicto = Assert.IsType<ConflictObjectResult>(res);
        Assert.Contains("otra inscripción activa", Mensaje(conflicto.Value));
    }

    [Fact]
    public async Task CambiarEstado_Inexistente_Responde_404()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.CambiarEstadoAsync(id, "baja", default))
             .ReturnsAsync(new CambiarEstadoInscripcionResultado(null, ErrorCambiarEstadoInscripcion.NoEncontrada));

        Assert.IsType<NotFoundObjectResult>(await _sut.CambiarEstado(id, new CambiarEstadoDto("baja")));
    }

    [Fact]
    public async Task CambiarEstado_Correcto_Devuelve_La_Inscripcion()
    {
        var id   = Guid.NewGuid();
        var insc = Inscripcion(id);
        _repo.Setup(r => r.CambiarEstadoAsync(id, "activa", default))
             .ReturnsAsync(new CambiarEstadoInscripcionResultado(insc, ErrorCambiarEstadoInscripcion.Ninguno));

        var ok = Assert.IsType<OkObjectResult>(await _sut.CambiarEstado(id, new CambiarEstadoDto("activa")));
        Assert.Same(insc, ok.Value);
    }

    [Fact]
    public async Task CambiarEstado_Estado_Invalido_Responde_400_Sin_Tocar_El_Repositorio()
    {
        Assert.IsType<BadRequestObjectResult>(await _sut.CambiarEstado(Guid.NewGuid(), new CambiarEstadoDto("cancelada")));
        _repo.Verify(r => r.CambiarEstadoAsync(It.IsAny<Guid>(), It.IsAny<string>(), default), Times.Never);
    }

    [Fact]
    public async Task Listar_Aplica_Topes_Y_Devuelve_La_Pagina()
    {
        var pagina = new ListaPaginada<InscripcionDto> { Data = [Inscripcion(Guid.NewGuid())], Total = 41, Pagina = 1, PorPagina = 100 };
        _repo.Setup(r => r.ListarAsync(It.IsAny<FiltroInscripciones>(), 1, 100, It.IsAny<CancellationToken>()))
             .ReturnsAsync(pagina);

        var ok = Assert.IsType<OkObjectResult>(await _sut.Listar(pagina: -2, porPagina: 5000, buscar: "  ana "));

        Assert.Same(pagina, ok.Value);
        _repo.Verify(r => r.ListarAsync(
            It.Is<FiltroInscripciones>(f => f.Buscar == "ana"), 1, 100, It.IsAny<CancellationToken>()), Times.Once);
    }
}
