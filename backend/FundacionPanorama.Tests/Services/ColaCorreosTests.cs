using FundacionPanorama.API.Services;
using FundacionPanorama.Application.Features.Alertas;
using FundacionPanorama.Application.Features.Alertas.DTOs;
using FundacionPanorama.Application.Features.Alertas.Interfaces;
using FundacionPanorama.Application.Features.Configuracion.DTOs;
using FundacionPanorama.Application.Features.Configuracion.Interfaces;
using FundacionPanorama.Application.Features.Correos;
using FundacionPanorama.Application.Features.Correos.DTOs;
using FundacionPanorama.Application.Features.Correos.Interfaces;
using FundacionPanorama.Application.Features.Permisos;
using FundacionPanorama.Application.Features.Permisos.Interfaces;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;

namespace FundacionPanorama.Tests.Services;

/// <summary>Cola persistente de correos: encolar, reintentos con espera exponencial y no reenviar.</summary>
public class ColaCorreosTests
{
    static readonly SmtpConfig Smtp = new("smtp.ejemplo.org", 587, "u", "c", "", "", true);

    static Mock<IConfiguracionRepository> Cfg(bool conSmtp = true)
    {
        var cfg = new Mock<IConfiguracionRepository>();
        cfg.Setup(c => c.ObtenerSmtpAsync(It.IsAny<CancellationToken>())).ReturnsAsync(conSmtp ? Smtp : null);
        return cfg;
    }

    // ── Encolar ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task NotificarAdmins_Encola_Uno_Por_Destinatario_Sin_Duplicados_Ni_Otros_Roles()
    {
        var cola = new Mock<IColaCorreosRepository>();
        cola.Setup(c => c.ObtenerUsuariosActivosAsync(It.IsAny<CancellationToken>())).ReturnsAsync(
        [
            new UsuarioDestinatario("rep@ejemplo.org", "Rep", "representante_legal"),
            new UsuarioDestinatario("REP@ejemplo.org", "Rep 2", "sistemas"),
            new UsuarioDestinatario("vol@ejemplo.org", "Vol", "voluntario"),
        ]);
        List<CorreoNuevo>? encolados = null;
        cola.Setup(c => c.EncolarAsync(It.IsAny<IEnumerable<CorreoNuevo>>(), It.IsAny<CancellationToken>()))
            .Callback<IEnumerable<CorreoNuevo>, CancellationToken>((c, _) => encolados = c.ToList())
            .Returns(Task.CompletedTask);
        var sut = new EmailService(Cfg().Object, cola.Object, Mock.Of<ILogger<EmailService>>());

        await sut.NotificarAdminsAsync("Asunto", "<p>x</p>");

        var c = Assert.Single(encolados!);
        Assert.Equal("rep@ejemplo.org", c.Destinatarios);
        Assert.Equal("<p>x</p>", c.Html);
    }

    [Fact]
    public async Task NotificarAdmins_Sin_Smtp_No_Encola()
    {
        var cola = new Mock<IColaCorreosRepository>();
        var sut  = new EmailService(Cfg(conSmtp: false).Object, cola.Object, Mock.Of<ILogger<EmailService>>());

        await sut.NotificarAdminsAsync("Asunto", "<p>x</p>");

        cola.Verify(c => c.EncolarAsync(It.IsAny<IEnumerable<CorreoNuevo>>(), It.IsAny<CancellationToken>()), Times.Never);
        cola.Verify(c => c.ObtenerUsuariosActivosAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    // ── Procesar: reintentos y no reenviar ───────────────────────────────────

    static CorreoEnCola Correo(int intentos) => new(Guid.NewGuid(), "a@ejemplo.org, b@ejemplo.org", "Asunto", "<p>x</p>", intentos);

    static (ProcesadorColaCorreos Sut, Mock<IColaCorreosRepository> Cola, Mock<IEnviadorCorreo> Enviador)
        Procesador(IReadOnlyList<CorreoEnCola> lote, ResultadoEnvio resultado, bool conSmtp = true)
    {
        var cola = new Mock<IColaCorreosRepository>();
        cola.SetupSequence(c => c.TomarPendientesAsync(It.IsAny<int>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(lote)
            .ReturnsAsync([]);
        var enviador = new Mock<IEnviadorCorreo>();
        enviador.Setup(e => e.EnviarAhoraAsync(It.IsAny<IReadOnlyList<string>>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(resultado);
        return (new ProcesadorColaCorreos(cola.Object, enviador.Object, Cfg(conSmtp).Object), cola, enviador);
    }

    [Theory]
    [InlineData(1, 2)]
    [InlineData(2, 4)]
    [InlineData(3, 8)]
    [InlineData(4, 16)]
    [InlineData(20, 120)] // tope de 2 horas
    public void Espera_Es_Exponencial_Con_Tope(int intentos, int minutos)
        => Assert.Equal(TimeSpan.FromMinutes(minutos), ProcesadorColaCorreos.Espera(intentos));

    [Fact]
    public async Task Envio_Correcto_Marca_Enviado_Y_Separa_Destinatarios()
    {
        var correo = Correo(1);
        var (sut, cola, enviador) = Procesador([correo], new ResultadoEnvio(true));

        var r = await sut.ProcesarAsync();

        Assert.Equal(1, r.Enviados);
        enviador.Verify(e => e.EnviarAhoraAsync(
            It.Is<IReadOnlyList<string>>(d => d.SequenceEqual(new[] { "a@ejemplo.org", "b@ejemplo.org" })),
            "Asunto", "<p>x</p>", It.IsAny<CancellationToken>()), Times.Once);
        cola.Verify(c => c.MarcarEnviadoAsync(correo.Id, It.IsAny<CancellationToken>()), Times.Once);
        cola.Verify(c => c.ReprogramarAsync(It.IsAny<Guid>(), It.IsAny<TimeSpan>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Un_Correo_Enviado_No_Se_Vuelve_A_Enviar_En_El_Siguiente_Ciclo()
    {
        var (sut, _, enviador) = Procesador([Correo(1)], new ResultadoEnvio(true));

        await sut.ProcesarAsync();
        var segundo = await sut.ProcesarAsync(); // la cola ya no lo devuelve: está enviado

        Assert.Equal(0, segundo.Enviados);
        enviador.Verify(e => e.EnviarAhoraAsync(It.IsAny<IReadOnlyList<string>>(), It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(4)]
    public async Task Fallo_Antes_Del_Maximo_Reprograma_Con_Espera_Y_Solo_El_Tipo_De_Error(int intentos)
    {
        var correo = Correo(intentos);
        var (sut, cola, _) = Procesador([correo], new ResultadoEnvio(false, "SmtpCommandException (RecipientNotAccepted, 550)"));

        var r = await sut.ProcesarAsync();

        Assert.Equal(1, r.Reprogramados);
        cola.Verify(c => c.ReprogramarAsync(correo.Id, ProcesadorColaCorreos.Espera(intentos),
            "SmtpCommandException (RecipientNotAccepted, 550)", It.IsAny<CancellationToken>()), Times.Once);
        cola.Verify(c => c.MarcarEnviadoAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        cola.Verify(c => c.MarcarFallidoAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Al_Quinto_Intento_Fallido_Queda_Como_Fallido()
    {
        var correo = Correo(ProcesadorColaCorreos.MaxIntentos);
        var (sut, cola, _) = Procesador([correo], new ResultadoEnvio(false, "SocketException"));

        var r = await sut.ProcesarAsync();

        Assert.Equal(1, r.Fallidos);
        cola.Verify(c => c.MarcarFallidoAsync(correo.Id, "SocketException", It.IsAny<CancellationToken>()), Times.Once);
        cola.Verify(c => c.ReprogramarAsync(It.IsAny<Guid>(), It.IsAny<TimeSpan>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Sin_Smtp_No_Toma_Correos_Ni_Gasta_Intentos()
    {
        var (sut, cola, enviador) = Procesador([Correo(1)], new ResultadoEnvio(true), conSmtp: false);

        var r = await sut.ProcesarAsync();

        Assert.True(r.SinSmtp);
        cola.Verify(c => c.TomarPendientesAsync(It.IsAny<int>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()), Times.Never);
        enviador.VerifyNoOtherCalls();
    }

    [Fact]
    public void Tipo_De_Error_No_Incluye_El_Mensaje_Con_Datos()
    {
        var ex = new SmtpCommandException(SmtpErrorCode.RecipientNotAccepted, SmtpStatusCode.MailboxUnavailable,
            "550 ana.perez@ejemplo.org no existe en smtp.interno.local");

        var tipo = EmailService.TipoError(ex);

        Assert.Equal("SmtpCommandException (RecipientNotAccepted, 550)", tipo);
        Assert.DoesNotContain("@", tipo);
        Assert.Equal("InvalidOperationException", EmailService.TipoError(new InvalidOperationException("clave: secreta")));
    }
}

/// <summary>Resumen diario de alertas: horario Colombia, deduplicación, escape del HTML y permisos.</summary>
public class ResumenDiarioTests
{
    static readonly SmtpConfig Smtp = new("smtp.ejemplo.org", 587, "u", "c", "", "", true);

    // ── ¿Toca enviar hoy? (Colombia = UTC-5) ─────────────────────────────────

    [Theory]
    // 11:59 UTC = 6:59 a. m. en Colombia → aún no
    [InlineData("2026-11-07T11:59:00", 7, null, false)]
    // 12:00 UTC = 7:00 a. m. en Colombia → sí
    [InlineData("2026-11-07T12:00:00", 7, null, true)]
    // Ya se envió hoy (fecha Colombia) → no
    [InlineData("2026-11-07T15:00:00", 7, "2026-11-07", false)]
    // El último fue ayer → sí
    [InlineData("2026-11-07T15:00:00", 7, "2026-11-06", true)]
    // 03:00 UTC del 8 = 10:00 p. m. del 7 en Colombia: "hoy" sigue siendo el 7, ya enviado → no
    [InlineData("2026-11-08T03:00:00", 7, "2026-11-07", false)]
    // 04:30 UTC del 8 = 11:30 p. m. del 7 en Colombia, sin enviar el 7 → sí (servidor dormido a las 7)
    [InlineData("2026-11-08T04:30:00", 7, "2026-11-06", true)]
    // 05:00 UTC del 8 = medianoche del 8 en Colombia, hora configurada 7 → aún no
    [InlineData("2026-11-08T05:00:00", 7, "2026-11-07", false)]
    public void Toca_Enviar_Usa_La_Hora_De_Colombia(string utc, int hora, string? ultimo, bool esperado)
    {
        var ahora = DateTime.SpecifyKind(DateTime.Parse(utc, System.Globalization.CultureInfo.InvariantCulture), DateTimeKind.Utc);
        DateOnly? ult = ultimo is null ? null : DateOnly.Parse(ultimo, System.Globalization.CultureInfo.InvariantCulture);
        Assert.Equal(esperado, ResumenDiarioService.TocaEnviar(ahora, hora, ult));
    }

    [Fact]
    public void Hoy_Colombia_Cambia_A_Las_5_UTC()
    {
        Assert.Equal(new DateOnly(2026, 11, 7), ResumenDiarioService.HoyColombia(new DateTime(2026, 11, 8, 4, 59, 0, DateTimeKind.Utc)));
        Assert.Equal(new DateOnly(2026, 11, 8), ResumenDiarioService.HoyColombia(new DateTime(2026, 11, 8, 5, 0, 0, DateTimeKind.Utc)));
    }

    [Theory]
    [InlineData(-1, false)]
    [InlineData(0, true)]
    [InlineData(23, true)]
    [InlineData(24, false)]
    public void Valida_La_Hora(int hora, bool ok)
        => Assert.Equal(ok, ResumenDiarioService.ValidarConfig(new GuardarResumenDiarioDto(true, hora)).IsSuccess);

    [Theory]
    [InlineData(null, ResumenDiarioService.PanelPorDefecto)]
    [InlineData("", ResumenDiarioService.PanelPorDefecto)]
    [InlineData("javascript:alert(1)", ResumenDiarioService.PanelPorDefecto)]
    [InlineData("https://www.fundacion.org/inicio", "https://www.fundacion.org/gestion/")]
    [InlineData("fundacion.org", "https://fundacion.org/gestion/")]
    public void Enlace_Al_Panel_Solo_Http_Y_Dominio_Configurado(string? sitio, string esperado)
        => Assert.Equal(esperado, ResumenDiarioService.EnlacePanel(sitio));

    // ── Contenido escapado ────────────────────────────────────────────────────

    [Fact]
    public void Html_Del_Resumen_Codifica_Todo_Texto_Variable()
    {
        var html = ResumenDiarioService.HtmlResumen("<b>Fundación</b>", "<script>x</script>", new DateOnly(2026, 11, 7),
            [new AlertaDto("t", "<img src=x>", "3 <i>items</i> sin stock", "error", 3)],
            "https://f.org/gestion/?a=1&b=\"2\"");

        Assert.DoesNotContain("<script>", html);
        Assert.DoesNotContain("<img", html);
        Assert.DoesNotContain("<i>", html);
        Assert.DoesNotContain("<b>Fundación</b>", html);
        Assert.Contains("&lt;script&gt;x&lt;/script&gt;", html);
        Assert.Contains("3 &lt;i&gt;items&lt;/i&gt; sin stock", html);
        Assert.Contains("href=\"https://f.org/gestion/?a=1&amp;b=&quot;2&quot;\"", html);
        Assert.Contains("07/11/2026", html);
    }

    // ── Filtrado por permisos ─────────────────────────────────────────────────

    static readonly AlertaDto[] Alertas =
    [
        new("contrato_vencimiento", "talento_humano", "2 contratos vencen", "warning", 2),
        new("sin_stock", "inventario", "1 artículo sin stock", "error", 1),
        new("presupuesto_sobre_ejecutado", "contabilidad", "1 rubro superó", "error", 1),
    ];

    static PermisosService Permisos()
    {
        var repo = new Mock<IPermisosRepository>();
        repo.Setup(r => r.ObtenerPorRolAsync("coordinador", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, List<string>> { ["talento_humano"] = ["ver"], ["inventario"] = ["crear"] });
        repo.Setup(r => r.ObtenerPorRolAsync("voluntario", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, List<string>> { ["actividades"] = ["ver"] });
        return new PermisosService(repo.Object, new MemoryCache(new MemoryCacheOptions()));
    }

    [Fact]
    public async Task Cada_Destinatario_Recibe_Solo_Las_Alertas_De_Los_Modulos_Que_Puede_Ver()
    {
        var permisos = Permisos();
        var correos = await ResumenDiarioService.ConstruirCorreosAsync(
            [
                new UsuarioDestinatario("admin@ejemplo.org", "Admin", "administrador"),
                new UsuarioDestinatario("coord@ejemplo.org", "Coord", "coordinador"),
                new UsuarioDestinatario("vol@ejemplo.org", "Vol", "voluntario"),
                new UsuarioDestinatario("ADMIN@ejemplo.org", "Duplicado", "administrador"),
            ],
            Alertas, (rol, modulo) => permisos.TienePermisoAsync(rol, modulo, "ver"),
            new DateOnly(2026, 11, 7), "Fundación", ResumenDiarioService.PanelPorDefecto);

        Assert.Equal(["admin@ejemplo.org", "coord@ejemplo.org"], correos.Select(c => c.Destinatarios));
        var admin = correos[0];
        Assert.Contains("3 alertas", admin.Asunto);
        Assert.Contains("1 artículo sin stock", System.Net.WebUtility.HtmlDecode(admin.Html));
        Assert.Contains("1 rubro superó", System.Net.WebUtility.HtmlDecode(admin.Html));
        var coord = correos[1];
        Assert.Contains("1 alerta)", coord.Asunto);
        Assert.Contains("2 contratos vencen", coord.Html);
        Assert.DoesNotContain("sin stock", coord.Html);      // inventario: solo "crear", no "ver"
        Assert.DoesNotContain("rubro", coord.Html);
    }

    // ── Ejecución diaria ──────────────────────────────────────────────────────

    static (ResumenDiarioService Sut, Mock<IColaCorreosRepository> Cola) Servicio(
        ResumenDiarioConfigDto conf, bool conSmtp = true, ConteosAlertas? conteos = null, bool ganaElDia = true)
    {
        var cola = new Mock<IColaCorreosRepository>();
        cola.Setup(c => c.ObtenerResumenDiarioAsync(It.IsAny<CancellationToken>())).ReturnsAsync(conf);
        cola.Setup(c => c.ObtenerUsuariosActivosAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([new UsuarioDestinatario("admin@ejemplo.org", "Admin", "administrador")]);
        cola.Setup(c => c.EncolarResumenDelDiaAsync(It.IsAny<DateOnly>(), It.IsAny<IEnumerable<CorreoNuevo>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ganaElDia);
        var cfg = new Mock<IConfiguracionRepository>();
        cfg.Setup(c => c.ObtenerSmtpAsync(It.IsAny<CancellationToken>())).ReturnsAsync(conSmtp ? Smtp : null);
        var alertasRepo = new Mock<IAlertasRepository>();
        alertasRepo.Setup(a => a.ObtenerConteosAsync(It.IsAny<CancellationToken>()))
                   .ReturnsAsync(conteos ?? new ConteosAlertas(2, 0, 0, 1));
        var sut = new ResumenDiarioService(cola.Object, cfg.Object, new AlertasService(alertasRepo.Object), Permisos());
        return (sut, cola);
    }

    static readonly DateTime Ahora8amCol = new(2026, 11, 7, 13, 0, 0, DateTimeKind.Utc);

    [Fact]
    public async Task A_La_Hora_Encola_El_Resumen_Del_Dia_De_Colombia()
    {
        var (sut, cola) = Servicio(new ResumenDiarioConfigDto(true, 7, new DateOnly(2026, 11, 6)));

        var (r, n) = await sut.EjecutarSiTocaAsync(Ahora8amCol);

        Assert.Equal(ResultadoResumen.Encolado, r);
        Assert.Equal(1, n);
        cola.Verify(c => c.EncolarResumenDelDiaAsync(new DateOnly(2026, 11, 7),
            It.Is<IEnumerable<CorreoNuevo>>(l => l.Single().Destinatarios == "admin@ejemplo.org"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Si_Otro_Ciclo_Ya_Gano_El_Dia_No_Duplica()
    {
        var (sut, _) = Servicio(new ResumenDiarioConfigDto(true, 7, null), ganaElDia: false);
        Assert.Equal(ResultadoResumen.YaEnviado, (await sut.EjecutarSiTocaAsync(Ahora8amCol)).Resultado);
    }

    [Fact]
    public async Task Ya_Enviado_Hoy_No_Consulta_Alertas_Ni_Encola()
    {
        var (sut, cola) = Servicio(new ResumenDiarioConfigDto(true, 7, new DateOnly(2026, 11, 7)));

        Assert.Equal(ResultadoResumen.NoToca, (await sut.EjecutarSiTocaAsync(Ahora8amCol)).Resultado);
        cola.Verify(c => c.EncolarResumenDelDiaAsync(It.IsAny<DateOnly>(), It.IsAny<IEnumerable<CorreoNuevo>>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Desactivado_No_Hace_Nada()
    {
        var (sut, cola) = Servicio(new ResumenDiarioConfigDto(false, 7, null));

        Assert.Equal(ResultadoResumen.Desactivado, (await sut.EjecutarSiTocaAsync(Ahora8amCol)).Resultado);
        cola.Verify(c => c.EncolarResumenDelDiaAsync(It.IsAny<DateOnly>(), It.IsAny<IEnumerable<CorreoNuevo>>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Sin_Smtp_No_Encola_Ni_Marca_El_Dia()
    {
        var (sut, cola) = Servicio(new ResumenDiarioConfigDto(true, 7, null), conSmtp: false);

        Assert.Equal(ResultadoResumen.SinSmtp, (await sut.EjecutarSiTocaAsync(Ahora8amCol)).Resultado);
        cola.Verify(c => c.EncolarResumenDelDiaAsync(It.IsAny<DateOnly>(), It.IsAny<IEnumerable<CorreoNuevo>>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Sin_Alertas_Marca_El_Dia_Sin_Correos()
    {
        var (sut, cola) = Servicio(new ResumenDiarioConfigDto(true, 7, null), conteos: new ConteosAlertas(0, 0, 0, 0));

        Assert.Equal(ResultadoResumen.SinAlertas, (await sut.EjecutarSiTocaAsync(Ahora8amCol)).Resultado);
        cola.Verify(c => c.EncolarResumenDelDiaAsync(new DateOnly(2026, 11, 7),
            It.Is<IEnumerable<CorreoNuevo>>(l => !l.Any()), It.IsAny<CancellationToken>()), Times.Once);
    }
}
