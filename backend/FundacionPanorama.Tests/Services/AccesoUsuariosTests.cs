using FundacionPanorama.API.Services;
using FundacionPanorama.Application.Features.Configuracion;
using FundacionPanorama.Application.Features.Usuarios;
using FundacionPanorama.Application.Features.Usuarios.DTOs;
using FundacionPanorama.Application.Features.Usuarios.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Moq;

namespace FundacionPanorama.Tests.Services;

public class AccesoUsuariosTests
{
    private readonly Mock<IUsuariosRepository> _repo = new();
    private readonly AccesoUsuarios _sut;

    const string AdminArranque = "admin@fundacion.org";

    public AccesoUsuariosTests()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Admin:EmailsAutorizados:0"] = AdminArranque })
            .Build();
        _sut = new AccesoUsuarios(new UsuariosService(_repo.Object), new AuthService(config),
                                  new MemoryCache(Options.Create(new MemoryCacheOptions())));
    }

    void Usuario(string email, string rol, bool activo) =>
        _repo.Setup(r => r.BuscarPorEmailAsync(email, It.IsAny<CancellationToken>()))
             .ReturnsAsync(new UsuarioDto(Guid.NewGuid(), email, "X", null, rol, activo, DateTime.UtcNow));

    [Fact]
    public async Task Usuario_Activo_Tiene_Su_Rol()
    {
        Usuario("ana@x.org", "tesorero", activo: true);
        Assert.Equal("tesorero", await _sut.RolVigenteAsync("ana@x.org"));
    }

    [Fact]
    public async Task Usuario_Desactivado_No_Tiene_Acceso()
    {
        Usuario("ana@x.org", "tesorero", activo: false);
        Assert.Null(await _sut.RolVigenteAsync("ana@x.org"));
    }

    [Fact]
    public async Task Admin_De_Arranque_Desactivado_Tampoco_Entra()
    {
        Usuario(AdminArranque, "administrador", activo: false);
        Assert.Null(await _sut.RolVigenteAsync(AdminArranque));
    }

    [Fact]
    public async Task Admin_De_Arranque_Sin_Fila_En_BD_Es_Administrador()
        => Assert.Equal("administrador", await _sut.RolVigenteAsync(AdminArranque));

    [Fact]
    public async Task Correo_Desconocido_No_Tiene_Acceso()
        => Assert.Null(await _sut.RolVigenteAsync("nadie@x.org"));

    [Fact]
    public async Task Usa_Cache_Y_Invalidar_Refleja_El_Cambio()
    {
        Usuario("ana@x.org", "tesorero", activo: true);
        await _sut.RolVigenteAsync("ana@x.org");
        Usuario("ana@x.org", "tesorero", activo: false);

        Assert.Equal("tesorero", await _sut.RolVigenteAsync("ana@x.org"));   // caché
        _sut.Invalidar("ana@x.org");
        Assert.Null(await _sut.RolVigenteAsync("ana@x.org"));                // tras invalidar
    }
}

public class WebContenidoTests
{
    [Theory]
    [InlineData("""{"slider":[{"ctaHref":"javascript:alert(1)"}]}""")]
    [InlineData("""{"contacto":{"instagram":"JaVaScRiPt:alert(1)"}}""")]
    [InlineData("""{"galeria":[{"imagen":"java\tscript:alert(1)"}]}""")]
    [InlineData("""{"slider":[{"imagen":"data:text/html,<script>alert(1)</script>"}]}""")]
    public void Rechaza_Enlaces_Ejecutables(string json)
        => Assert.NotNull(ConfiguracionService.ValidarWebContenido(json));

    [Theory]
    [InlineData(null)]
    [InlineData("""{"slider":[{"ctaHref":"#donar","imagen":"https://x.supabase.co/a.jpg"}],"quienesSomos":{"mision":"Misión: educar"}}""")]
    [InlineData("""{"contacto":{"email":"mailto:info@x.org"}}""")]
    public void Acepta_Contenido_Normal(string? json)
        => Assert.Null(ConfiguracionService.ValidarWebContenido(json));

    [Fact]
    public void Rechaza_Json_Mal_Formado()
        => Assert.NotNull(ConfiguracionService.ValidarWebContenido("{ no es json"));
}
