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

/// <summary>
/// Protección contra regresiones: cada endpoint exige la acción que corresponde a lo que hace.
/// Un DELETE con "editar" dejaba borrar a quien solo debía modificar.
/// </summary>
public class AccionesDePermisoTests
{
    static IEnumerable<MethodInfo> Endpoints() =>
        typeof(BaseController).Assembly.GetTypes()
            .Where(t => typeof(ControllerBase).IsAssignableFrom(t) && !t.IsAbstract)
            .SelectMany(t => t.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
            .Where(m => m.GetCustomAttributes<Microsoft.AspNetCore.Mvc.Routing.HttpMethodAttribute>().Any());

    static IEnumerable<string> Acciones(MethodInfo m) =>
        m.GetCustomAttributes<RequierePermisoAttribute>().Select(p => p.Accion)
         .Concat(m.GetCustomAttributes<RequiereAlgunPermisoAttribute>()
                  .SelectMany(p => p.PermisosAceptados).Select(p => p.Split(':', 2)[^1]));

    static string Nombre(MethodInfo m) => $"{m.DeclaringType!.Name}.{m.Name}";

    // Borrados que en realidad editan la configuración de otro registro (no eliminan la entidad
    // del módulo). Pasarlos a "eliminar" le quitaría la capacidad al coordinador de programas
    // (tiene programas:editar pero no programas:eliminar).
    static readonly HashSet<string> DeleteQueEditan =
    [
        "SedesController.EliminarCampo",         // quitar un campo del formulario de un programa
        "VoluntariosController.EliminarAsignacion", // quitar a un voluntario de una actividad
    ];

    [Fact]
    public void Ningun_Delete_Usa_Ver_Ni_Editar()
    {
        var malos = Endpoints()
            .Where(m => m.GetCustomAttributes<HttpDeleteAttribute>().Any())
            .Where(m => Acciones(m).Any(a => a is "ver" or "editar"))
            .Select(Nombre)
            .Where(n => !DeleteQueEditan.Contains(n))
            .ToList();
        Assert.Empty(malos);
    }

    [Theory]
    [InlineData(typeof(ContabilidadController))]
    [InlineData(typeof(NominaController))]
    public void Delete_De_Contabilidad_Y_Nomina_Exigen_Eliminar(Type controlador)
    {
        var deletes = controlador.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Where(m => m.GetCustomAttributes<HttpDeleteAttribute>().Any()).ToList();
        Assert.NotEmpty(deletes);
        Assert.All(deletes, m => Assert.Equal("eliminar", Assert.Single(m.GetCustomAttributes<RequierePermisoAttribute>()).Accion));
    }

    [Fact]
    public void Ninguna_Escritura_Exige_Solo_Ver()
    {
        // log-emision solo registra que alguien imprimió/envió un recibo: basta con poder verlo
        // verificar-documento es una CONSULTA (¿ya existe ese número?) que va por POST solo para
        // que el número de documento no quede en la URL ni en el log de peticiones.
        HashSet<string> excepciones = [
            "DonacionesController.LogEmision",
            "VoluntariosController.VerificarDocumento",
            "TalentoHumanoController.VerificarDocumento",
            "DonantesController.VerificarDocumento",
        ];
        var malos = Endpoints()
            .Where(m => m.GetCustomAttributes<HttpPostAttribute>().Any()
                     || m.GetCustomAttributes<HttpPutAttribute>().Any()
                     || m.GetCustomAttributes<HttpPatchAttribute>().Any())
            .Where(m => Acciones(m).Any() && Acciones(m).All(a => a == "ver"))
            .Select(Nombre)
            .Where(n => !excepciones.Contains(n))
            .ToList();
        Assert.Empty(malos);
    }

    [Fact]
    public void Exportar_Beneficiarios_Exige_Su_Permiso()
    {
        var m = typeof(BeneficiariosController).GetMethod(nameof(BeneficiariosController.Exportar))!;
        var p = Assert.Single(m.GetCustomAttributes<RequierePermisoAttribute>());
        Assert.Equal(("beneficiarios", "exportar"), (p.Modulo, p.Accion));
    }
}

/// <summary>Editar documentos y leer los parámetros de nómina exigen el permiso que les corresponde.</summary>
public class PermisosEdicionDocumentosYNominaTests
{
    static RequierePermisoAttribute Permiso(Type controlador, string metodo)
        => Assert.Single(controlador.GetMethod(metodo)!.GetCustomAttributes<RequierePermisoAttribute>());

    [Theory]
    [InlineData(nameof(DocumentosController.Editar))]
    [InlineData(nameof(DocumentosController.EditarArchivo))]
    public void Put_De_Documentos_Exige_Documentos_Editar(string metodo)
    {
        var p = Permiso(typeof(DocumentosController), metodo);
        Assert.Equal(("documentos", "editar"), (p.Modulo, p.Accion));
        Assert.NotNull(typeof(DocumentosController).GetMethod(metodo)!.GetCustomAttribute<HttpPutAttribute>());
    }

    [Fact]
    public void Parametros_De_Nomina_Exigen_Talento_Humano_Ver()
    {
        var p = Permiso(typeof(NominaController), nameof(NominaController.ObtenerParametros));
        Assert.Equal(("talento_humano", "ver"), (p.Modulo, p.Accion));
    }
}
