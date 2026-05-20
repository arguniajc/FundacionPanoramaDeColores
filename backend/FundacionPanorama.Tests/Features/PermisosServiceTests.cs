using FundacionPanorama.Application.Features.Permisos;
using FundacionPanorama.Application.Features.Permisos.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Moq;

namespace FundacionPanorama.Tests.Features;

public class PermisosServiceTests
{
    private readonly Mock<IPermisosRepository> _repo = new();
    private readonly IMemoryCache              _cache;
    private readonly PermisosService           _sut;

    public PermisosServiceTests()
    {
        _cache = new MemoryCache(Options.Create(new MemoryCacheOptions()));
        _sut   = new(_repo.Object, _cache);
    }

    [Fact]
    public async Task TienePermisoAsync_Administrador_Siempre_True()
    {
        var result = await _sut.TienePermisoAsync("administrador", "cualquier_modulo", "ver");
        Assert.True(result);
        _repo.Verify(r => r.ObtenerPorRolAsync(It.IsAny<string>(), default), Times.Never);
    }

    [Fact]
    public async Task TienePermisoAsync_Rol_Sin_Permiso_Retorna_False()
    {
        _repo.Setup(r => r.ObtenerPorRolAsync("coordinador", default))
             .ReturnsAsync(new Dictionary<string, List<string>>
             {
                 ["beneficiarios"] = ["ver", "crear"],
             });

        var result = await _sut.TienePermisoAsync("coordinador", "donaciones", "ver");

        Assert.False(result);
    }

    [Fact]
    public async Task TienePermisoAsync_Rol_Con_Permiso_Retorna_True()
    {
        _repo.Setup(r => r.ObtenerPorRolAsync("coordinador", default))
             .ReturnsAsync(new Dictionary<string, List<string>>
             {
                 ["beneficiarios"] = ["ver", "crear"],
             });

        var result = await _sut.TienePermisoAsync("coordinador", "beneficiarios", "ver");

        Assert.True(result);
    }

    [Fact]
    public async Task ObtenerPorRolAsync_Usa_Cache_En_Segunda_Llamada()
    {
        _repo.Setup(r => r.ObtenerPorRolAsync("colaborador", default))
             .ReturnsAsync(new Dictionary<string, List<string>>());

        await _sut.ObtenerPorRolAsync("colaborador");
        await _sut.ObtenerPorRolAsync("colaborador");

        _repo.Verify(r => r.ObtenerPorRolAsync("colaborador", default), Times.Once);
    }

    [Fact]
    public async Task GuardarPermisosRolAsync_Invalida_Cache()
    {
        _repo.Setup(r => r.ObtenerPorRolAsync("colaborador", default))
             .ReturnsAsync(new Dictionary<string, List<string>>());
        _repo.Setup(r => r.GuardarPermisosRolAsync(It.IsAny<string>(),
             It.IsAny<List<FundacionPanorama.Application.Features.Permisos.DTOs.PermisoDto>>(), default))
             .Returns(Task.CompletedTask);

        await _sut.ObtenerPorRolAsync("colaborador");
        await _sut.GuardarPermisosRolAsync("colaborador", []);
        await _sut.ObtenerPorRolAsync("colaborador");

        _repo.Verify(r => r.ObtenerPorRolAsync("colaborador", default), Times.Exactly(2));
    }
}
