using FundacionPanorama.API.Controllers;
using FundacionPanorama.API.Services;
using FundacionPanorama.Application.Features.Actividades;
using FundacionPanorama.Application.Features.Actividades.DTOs;
using FundacionPanorama.Application.Features.Actividades.Interfaces;
using FundacionPanorama.Application.Features.Configuracion.DTOs;
using FundacionPanorama.Application.Features.Configuracion.Interfaces;
using FundacionPanorama.Application.Features.Correos.DTOs;
using FundacionPanorama.Application.Features.Correos.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace FundacionPanorama.Tests.Services;

/// <summary>
/// El aviso por correo se ejecuta después de responder: debe usar un scope propio (no los
/// servicios ya liberados del request) y registrar en el log cualquier error en vez de tragarlo.
/// </summary>
public class TrabajoEnSegundoPlanoTests
{
    sealed class Recurso : IDisposable
    {
        public bool Desechado { get; private set; }
        public void Dispose() => Desechado = true;
    }

    static void VerificarError(Mock<ILogger> logger, Exception? ex = null)
        => logger.Verify(l => l.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.Is<Exception>(e => ex == null || e == ex),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);

    [Fact]
    public async Task Usa_Un_Scope_Propio_Aunque_El_Del_Request_Ya_Se_Libero()
    {
        var raiz = new ServiceCollection().AddScoped<Recurso>().BuildServiceProvider();
        var scopes = raiz.GetRequiredService<IServiceScopeFactory>();

        Recurso delRequest;
        using (var request = scopes.CreateScope())
            delRequest = request.ServiceProvider.GetRequiredService<Recurso>();
        Assert.True(delRequest.Desechado); // el request terminó y liberó sus servicios

        Recurso? usado = null;
        var vivoAlUsarlo = false;
        await TrabajoEnSegundoPlano.Lanzar<Recurso>(scopes, Mock.Of<ILogger>(), "prueba", (r, _) =>
        {
            usado        = r;
            vivoAlUsarlo = !r.Desechado;
            return Task.CompletedTask;
        });

        Assert.NotNull(usado);
        Assert.NotSame(delRequest, usado);
        Assert.True(vivoAlUsarlo);
        Assert.True(usado!.Desechado); // el scope propio también se libera al terminar
    }

    [Fact]
    public async Task Un_Error_Del_Trabajo_Queda_En_El_Log_Y_No_Se_Propaga()
    {
        var raiz   = new ServiceCollection().AddScoped<Recurso>().BuildServiceProvider();
        var logger = new Mock<ILogger>();
        var error  = new InvalidOperationException("SMTP caído");

        await TrabajoEnSegundoPlano.Lanzar<Recurso>(raiz.GetRequiredService<IServiceScopeFactory>(), logger.Object,
            "prueba", (_, _) => throw error);

        VerificarError(logger, error);
    }

    [Fact]
    public async Task Si_No_Puede_Resolver_El_Servicio_Tambien_Lo_Registra()
    {
        var raiz   = new ServiceCollection().BuildServiceProvider();
        var logger = new Mock<ILogger>();

        await TrabajoEnSegundoPlano.Lanzar<Recurso>(raiz.GetRequiredService<IServiceScopeFactory>(), logger.Object,
            "prueba", (_, _) => Task.CompletedTask);

        VerificarError(logger);
    }

    static (ActividadesController Sut, Mock<IColaCorreosRepository> Cola, Mock<ILogger<ActividadesController>> Logger)
        ControllerConCola(Guid id, ActividadDto anterior, ActividadDto nueva)
    {
        var repo = new Mock<IActividadesRepository>();
        repo.Setup(r => r.ObtenerAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(anterior);
        repo.Setup(r => r.ActualizarAsync(id, It.IsAny<ActualizarActividadDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(nueva);
        var cfg = new Mock<IConfiguracionRepository>();
        cfg.Setup(c => c.ObtenerSmtpAsync(It.IsAny<CancellationToken>()))
           .ReturnsAsync(new SmtpConfig("smtp.ejemplo.org", 587, "u", "c", "", "", true));
        var cola = new Mock<IColaCorreosRepository>();
        cola.Setup(c => c.ObtenerUsuariosActivosAsync(It.IsAny<CancellationToken>())).ReturnsAsync(
        [
            new UsuarioDestinatario("rep@ejemplo.org", "Rep", "representante_legal"),
            new UsuarioDestinatario("sis@ejemplo.org", "Sis", "sistemas"),
            new UsuarioDestinatario("coord@ejemplo.org", "Coord", "coordinador"),
        ]);
        var email  = new EmailService(cfg.Object, cola.Object, Mock.Of<ILogger<EmailService>>());
        var logger = new Mock<ILogger<ActividadesController>>();
        return (new ActividadesController(new ActividadesService(repo.Object), email, logger.Object), cola, logger);
    }

    [Fact]
    public async Task Actividades_Actualizar_Con_Cambio_De_Estado_Encola_Un_Aviso_Por_Administrador()
    {
        var id  = Guid.NewGuid();
        var hoy = DateTime.UtcNow.AddDays(10);
        ActividadDto Dto(string estado) => new(id, "Taller", null, null, null, hoy, hoy.AddHours(2), null,
            estado, 0, 0, DateTime.UtcNow, []);
        var (sut, cola, _) = ControllerConCola(id, Dto("programada"), Dto("cancelada"));
        List<CorreoNuevo>? encolados = null;
        cola.Setup(c => c.EncolarAsync(It.IsAny<IEnumerable<CorreoNuevo>>(), It.IsAny<CancellationToken>()))
            .Callback<IEnumerable<CorreoNuevo>, CancellationToken>((c, _) => encolados = c.ToList())
            .Returns(Task.CompletedTask);

        var res = await sut.Actualizar(id,
            new ActualizarActividadDto("Taller", null, null, hoy, hoy.AddHours(2), null, "cancelada", null), default);

        Assert.IsType<OkObjectResult>(res);
        Assert.NotNull(encolados);
        Assert.Equal(["rep@ejemplo.org", "sis@ejemplo.org"], encolados!.Select(c => c.Destinatarios));
        Assert.All(encolados, c => Assert.Equal("[Actividad] Cambio en: Taller", c.Asunto));
    }

    [Fact]
    public async Task Actividades_Si_Falla_Encolar_Responde_Ok_Y_Lo_Registra()
    {
        var id  = Guid.NewGuid();
        var hoy = DateTime.UtcNow.AddDays(10);
        ActividadDto Dto(string estado) => new(id, "Taller", null, null, null, hoy, hoy.AddHours(2), null,
            estado, 0, 0, DateTime.UtcNow, []);
        var (sut, cola, logger) = ControllerConCola(id, Dto("programada"), Dto("cancelada"));
        cola.Setup(c => c.EncolarAsync(It.IsAny<IEnumerable<CorreoNuevo>>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("BD caída"));

        var res = await sut.Actualizar(id,
            new ActualizarActividadDto("Taller", null, null, hoy, hoy.AddHours(2), null, "cancelada", null), default);

        Assert.IsType<OkObjectResult>(res);
        logger.Verify(l => l.Log(LogLevel.Error, It.IsAny<EventId>(), It.IsAny<It.IsAnyType>(),
            It.IsAny<InvalidOperationException>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()), Times.Once);
    }

    [Fact]
    public async Task Actividades_Actualizar_Sin_Cambios_No_Encola_Aviso()
    {
        var id  = Guid.NewGuid();
        var hoy = DateTime.UtcNow.AddDays(10);
        var dto = new ActividadDto(id, "Taller", null, null, null, hoy, hoy.AddHours(2), null,
            "programada", 0, 0, DateTime.UtcNow, []);
        var (sut, cola, _) = ControllerConCola(id, dto, dto with { Titulo = "Taller de pintura" });

        await sut.Actualizar(id,
            new ActualizarActividadDto("Taller de pintura", null, null, hoy, hoy.AddHours(2), null, "programada", null), default);

        cola.Verify(c => c.EncolarAsync(It.IsAny<IEnumerable<CorreoNuevo>>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public void Html_Del_Aviso_Codifica_Los_Datos_Del_Usuario()
    {
        var html = EmailService.HtmlCambioActividad(
            "<script>alert(1)</script>", "programada", "<b>cancelada</b>", "2026-03-15 08:00", "<i>x</i>");

        Assert.DoesNotContain("<script>", html);
        Assert.DoesNotContain("<b>cancelada</b>", html);
        Assert.DoesNotContain("<i>x</i>", html);
        Assert.Contains("&lt;script&gt;alert(1)&lt;/script&gt;", html);
        Assert.Contains("&lt;b&gt;cancelada&lt;/b&gt;", html);
    }

    [Fact]
    public async Task Error_SMTP_Devuelve_Mensaje_Generico_Y_Detalle_Solo_En_Log()
    {
        var cfg = new Mock<IConfiguracionRepository>();
        // Puerto 1 en localhost: la conexión se rechaza y MailKit lanza una excepción técnica
        cfg.Setup(c => c.ObtenerSmtpAsync(It.IsAny<CancellationToken>()))
           .ReturnsAsync(new SmtpConfig("127.0.0.1", 1, "usuario-secreto", "clave", "", "", false));
        var logger = new Mock<ILogger<EmailService>>();
        var sut = new EmailService(cfg.Object, Mock.Of<IColaCorreosRepository>(), logger.Object);

        var (ok, detalle) = await sut.EnviarPruebaAsync("ana@ejemplo.org");

        Assert.False(ok);
        Assert.StartsWith(EmailService.MensajeErrorEnvio, detalle);
        Assert.Matches("Código: [0-9A-F]{8}$", detalle);
        Assert.DoesNotContain("127.0.0.1", detalle);
        logger.Verify(l => l.Log(LogLevel.Error, It.IsAny<EventId>(), It.IsAny<It.IsAnyType>(), It.IsNotNull<Exception>(),
            It.IsAny<Func<It.IsAnyType, Exception?, string>>()), Times.Once);
    }
}
