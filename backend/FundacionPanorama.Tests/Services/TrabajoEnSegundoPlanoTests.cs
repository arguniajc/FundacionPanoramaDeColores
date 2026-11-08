using FundacionPanorama.API.Controllers;
using FundacionPanorama.API.Services;
using FundacionPanorama.Application.Features.Actividades;
using FundacionPanorama.Application.Features.Actividades.DTOs;
using FundacionPanorama.Application.Features.Actividades.Interfaces;
using FundacionPanorama.Application.Features.Configuracion.DTOs;
using FundacionPanorama.Application.Features.Configuracion.Interfaces;
using FundacionPanorama.Infrastructure.Persistence;
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

    [Fact]
    public async Task Actividades_Actualizar_Con_Cambio_De_Estado_Avisa_Desde_Un_Scope_Nuevo()
    {
        var id   = Guid.NewGuid();
        var hoy  = DateTime.UtcNow.AddDays(10);
        var repo = new Mock<IActividadesRepository>();
        ActividadDto Dto(string estado) => new(id, "Taller", null, null, null, hoy, hoy.AddHours(2), null,
            estado, 0, 0, DateTime.UtcNow, []);
        repo.Setup(r => r.ObtenerAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(Dto("programada"));
        repo.Setup(r => r.ActualizarAsync(id, It.IsAny<ActualizarActividadDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Dto("cancelada"));

        // El scope nuevo se pide desde el trabajo en segundo plano; el proveedor simulado no tiene
        // EmailService, así que el trabajo falla y el error debe llegar al log del controller.
        var scopeCreado = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var logueado    = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var scope = new Mock<IServiceScope>();
        scope.Setup(s => s.ServiceProvider).Returns(new ServiceCollection().BuildServiceProvider());
        var scopes = new Mock<IServiceScopeFactory>();
        scopes.Setup(s => s.CreateScope()).Callback(() => scopeCreado.TrySetResult()).Returns(scope.Object);
        var logger = new Mock<ILogger<ActividadesController>>();
        logger.Setup(l => l.Log(LogLevel.Error, It.IsAny<EventId>(), It.IsAny<It.IsAnyType>(), It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()))
              .Callback(() => logueado.TrySetResult());

        var sut = new ActividadesController(new ActividadesService(repo.Object), scopes.Object, logger.Object);
        var res = await sut.Actualizar(id,
            new ActualizarActividadDto("Taller", null, null, hoy, hoy.AddHours(2), null, "cancelada", null), default);

        Assert.IsType<OkObjectResult>(res);
        await scopeCreado.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await logueado.Task.WaitAsync(TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task Actividades_Actualizar_Sin_Cambios_No_Lanza_Aviso()
    {
        var id   = Guid.NewGuid();
        var hoy  = DateTime.UtcNow.AddDays(10);
        var repo = new Mock<IActividadesRepository>();
        var dto  = new ActividadDto(id, "Taller", null, null, null, hoy, hoy.AddHours(2), null,
            "programada", 0, 0, DateTime.UtcNow, []);
        repo.Setup(r => r.ObtenerAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(dto);
        repo.Setup(r => r.ActualizarAsync(id, It.IsAny<ActualizarActividadDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(dto with { Titulo = "Taller de pintura" });
        var scopes = new Mock<IServiceScopeFactory>();

        var sut = new ActividadesController(new ActividadesService(repo.Object), scopes.Object,
            Mock.Of<ILogger<ActividadesController>>());
        await sut.Actualizar(id,
            new ActualizarActividadDto("Taller de pintura", null, null, hoy, hoy.AddHours(2), null, "programada", null), default);

        await Task.Delay(100);
        scopes.Verify(s => s.CreateScope(), Times.Never);
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
        var sut = new EmailService(cfg.Object, new DbConnectionFactory("Host=localhost"), logger.Object);

        var (ok, detalle) = await sut.EnviarPruebaAsync("ana@ejemplo.org");

        Assert.False(ok);
        Assert.StartsWith(EmailService.MensajeErrorEnvio, detalle);
        Assert.Matches("Código: [0-9A-F]{8}$", detalle);
        Assert.DoesNotContain("127.0.0.1", detalle);
        logger.Verify(l => l.Log(LogLevel.Error, It.IsAny<EventId>(), It.IsAny<It.IsAnyType>(), It.IsNotNull<Exception>(),
            It.IsAny<Func<It.IsAnyType, Exception?, string>>()), Times.Once);
    }
}
