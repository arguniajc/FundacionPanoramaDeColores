using System.Reflection;
using System.Security.Claims;
using FundacionPanorama.API.Controllers;
using FundacionPanorama.API.Filters;
using FundacionPanorama.API.Services;
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

public class RequiereAlgunPermisoAttributeTests
{
    private readonly Mock<IPermisosRepository> _repo = new();
    private readonly RequiereAlgunPermisoAttribute _sut = new("configuracion:ver", "donaciones:ver");

    private AuthorizationFilterContext Contexto(string? rol, bool autenticado = true)
    {
        var services = new ServiceCollection()
            .AddSingleton<IMemoryCache>(new MemoryCache(Options.Create(new MemoryCacheOptions())))
            .AddSingleton(_repo.Object)
            .AddSingleton<PermisosService>()
            .BuildServiceProvider();
        var claims = rol is null ? new List<Claim>() : [new Claim(ClaimTypes.Role, rol)];
        var user = new ClaimsPrincipal(new ClaimsIdentity(claims, autenticado ? "Test" : null));
        var http = new DefaultHttpContext { User = user, RequestServices = services };
        return new AuthorizationFilterContext(new ActionContext(http, new RouteData(), new ActionDescriptor()), []);
    }

    private void Permisos(string rol, Dictionary<string, List<string>> p) =>
        _repo.Setup(r => r.ObtenerPorRolAsync(rol, It.IsAny<CancellationToken>())).ReturnsAsync(p);

    [Fact]
    public async Task No_Autenticado_Retorna_401()
    {
        var ctx = Contexto("tesorero", autenticado: false);
        await _sut.OnAuthorizationAsync(ctx);
        Assert.IsType<UnauthorizedResult>(ctx.Result);
    }

    [Fact]
    public async Task Basta_Con_Uno_De_Los_Permisos()
    {
        Permisos("tesorero", new() { ["donaciones"] = ["ver"] });
        var ctx = Contexto("tesorero");
        await _sut.OnAuthorizationAsync(ctx);
        Assert.Null(ctx.Result);
    }

    [Fact]
    public async Task Sin_Ninguno_Retorna_403()
    {
        Permisos("trabajador_social", new() { ["beneficiarios"] = ["ver"] });
        var ctx = Contexto("trabajador_social");
        await _sut.OnAuthorizationAsync(ctx);
        Assert.Equal(403, Assert.IsType<ObjectResult>(ctx.Result).StatusCode);
    }

    [Fact]
    public async Task Administrador_Pasa()
    {
        var ctx = Contexto("administrador");
        await _sut.OnAuthorizationAsync(ctx);
        Assert.Null(ctx.Result);
    }
}

public class PermisosArchivosTests
{
    [Theory]
    [InlineData("web", "configuracion:editar")]
    [InlineData("fotos", "beneficiarios:crear")]
    [InlineData("documentos-institucionales", "documentos:crear")]
    [InlineData("inscripciones", "inscripciones:crear")]
    [InlineData("organigrama", "talento_humano:editar")]
    public void Subir_Exige_El_Permiso_Del_Modulo(string carpeta, string esperado) =>
        Assert.Contains(esperado, PermisosArchivos.ParaSubir(carpeta));

    [Theory]
    [InlineData("fotos/abc.jpg")]
    [InlineData("documentos/abc.pdf")]
    [InlineData("documentos-beneficiarios/0f8fad5b-d9cb-469f-a165-70867728950e/abc.pdf")]
    public void Archivos_De_Menores_Solo_Con_Beneficiarios_Ver(string ruta) =>
        Assert.Equal(["beneficiarios:ver"], PermisosArchivos.ParaLeer(ruta));

    [Theory]
    [InlineData("fotos/../organigrama/x.jpg")]
    [InlineData("/fotos/x.jpg")]
    [InlineData("fotos\\x.jpg")]
    [InlineData("")]
    public void Rutas_Peligrosas_No_Tienen_Permiso(string ruta) =>
        Assert.Empty(PermisosArchivos.ParaLeer(ruta));

    [Fact]
    public void Carpeta_Desconocida_Queda_Solo_Para_Administrador()
    {
        Assert.Empty(PermisosArchivos.ParaSubir("otra"));
        Assert.Empty(PermisosArchivos.ParaLeer("otra/x.pdf"));
    }
}

/// <summary>
/// Protección contra regresiones: todo endpoint de estos controladores (datos personales)
/// debe exigir un permiso de módulo, no solo tener sesión.
/// </summary>
public class EndpointsConDatosPersonalesTests
{
    public static TheoryData<Type> Controladores => new()
    {
        typeof(BeneficiariosController), typeof(DonacionesController), typeof(DonantesController),
        typeof(VoluntariosController), typeof(DocumentosController), typeof(EquipoController),
    };

    // Agregados sin datos personales que muestra el Inicio a todos los roles
    static readonly HashSet<string> Excepciones = ["BeneficiariosController.Stats", "BeneficiariosController.StatsNinos"];

    [Theory]
    [MemberData(nameof(Controladores))]
    public void Todos_Los_Endpoints_Exigen_Permiso(Type controlador)
    {
        var sinPermiso = controlador.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Where(m => m.GetCustomAttributes<Microsoft.AspNetCore.Mvc.Routing.HttpMethodAttribute>().Any())
            .Where(m => !m.GetCustomAttributes<RequierePermisoAttribute>().Any()
                     && !m.GetCustomAttributes<RequiereAlgunPermisoAttribute>().Any())
            .Select(m => $"{controlador.Name}.{m.Name}")
            .Where(n => !Excepciones.Contains(n))
            .ToList();
        Assert.Empty(sinPermiso);
    }

    [Fact]
    public void Log_De_Descargas_Exige_Su_Permiso()
    {
        var m = typeof(ArchivosController).GetMethod(nameof(ArchivosController.ObtenerLog))!;
        var p = Assert.Single(m.GetCustomAttributes<RequierePermisoAttribute>());
        Assert.NotNull(p);
    }
}
