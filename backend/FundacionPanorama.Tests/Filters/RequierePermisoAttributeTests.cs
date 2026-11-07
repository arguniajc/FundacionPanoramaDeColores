using System.Security.Claims;
using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Permisos;
using FundacionPanorama.Application.Features.Permisos.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;

namespace FundacionPanorama.Tests.Filters;

public class RequierePermisoAttributeTests
{
    private readonly Mock<IPermisosRepository> _repo = new();
    private readonly RequierePermisoAttribute  _sut  = new("beneficiarios", "crear");

    private AuthorizationFilterContext Contexto(ClaimsPrincipal user)
    {
        var services = new ServiceCollection()
            .AddSingleton<IMemoryCache>(new MemoryCache(Options.Create(new MemoryCacheOptions())))
            .AddSingleton(_repo.Object)
            .AddSingleton<PermisosService>()
            .BuildServiceProvider();
        var http = new DefaultHttpContext { User = user, RequestServices = services };
        var action = new ActionContext(http, new RouteData(), new ActionDescriptor());
        return new AuthorizationFilterContext(action, new List<IFilterMetadata>());
    }

    private static ClaimsPrincipal Usuario(string? rol)
    {
        var claims = new List<Claim> { new(ClaimTypes.Email, "u@x.com") };
        if (rol is not null) claims.Add(new Claim(ClaimTypes.Role, rol));
        return new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "Test"));
    }

    private static string? Mensaje(IActionResult? r) =>
        (r as ObjectResult)?.Value?.GetType().GetProperty("mensaje")?.GetValue(((ObjectResult)r!).Value) as string;

    [Fact]
    public async Task No_Autenticado_Retorna_401()
    {
        var ctx = Contexto(new ClaimsPrincipal(new ClaimsIdentity())); // sin authenticationType
        await _sut.OnAuthorizationAsync(ctx);
        Assert.IsType<UnauthorizedResult>(ctx.Result);
    }

    [Theory]
    [InlineData("administrador")]
    [InlineData("Admin")]
    public async Task Administrador_Pasa_Sin_Consultar_Permisos(string rol)
    {
        var ctx = Contexto(Usuario(rol));
        await _sut.OnAuthorizationAsync(ctx);
        Assert.Null(ctx.Result);
        _repo.Verify(r => r.ObtenerPorRolAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public async Task Sin_Rol_Retorna_403_Con_Mensaje(string? rol)
    {
        var ctx = Contexto(Usuario(rol));
        await _sut.OnAuthorizationAsync(ctx);
        var r = Assert.IsType<ObjectResult>(ctx.Result);
        Assert.Equal(403, r.StatusCode);
        Assert.Equal("Tu sesión no tiene un rol asignado. Vuelve a iniciar sesión.", Mensaje(r));
    }

    [Fact]
    public async Task Rol_Sin_Permiso_Retorna_403_Con_Mensaje()
    {
        _repo.Setup(r => r.ObtenerPorRolAsync("colaborador", It.IsAny<CancellationToken>()))
             .ReturnsAsync(new Dictionary<string, List<string>> { ["beneficiarios"] = ["ver"] });
        var ctx = Contexto(Usuario("colaborador"));

        await _sut.OnAuthorizationAsync(ctx);

        var r = Assert.IsType<ObjectResult>(ctx.Result);
        Assert.Equal(403, r.StatusCode);
        Assert.Equal("No tienes permiso para crear en beneficiarios. Pide acceso a un administrador.", Mensaje(r));
    }

    [Fact]
    public async Task Rol_Con_Permiso_Pasa()
    {
        _repo.Setup(r => r.ObtenerPorRolAsync("coordinador", It.IsAny<CancellationToken>()))
             .ReturnsAsync(new Dictionary<string, List<string>> { ["beneficiarios"] = ["ver", "crear"] });
        var ctx = Contexto(Usuario("coordinador"));

        await _sut.OnAuthorizationAsync(ctx);

        Assert.Null(ctx.Result);
    }
}
