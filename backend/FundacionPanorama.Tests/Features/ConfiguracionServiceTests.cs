using FundacionPanorama.Application.Features.Configuracion;
using FundacionPanorama.Application.Features.Configuracion.DTOs;
using FundacionPanorama.Application.Features.Configuracion.Interfaces;
using Moq;

namespace FundacionPanorama.Tests.Features;

public class ConfiguracionServiceTests
{
    private readonly Mock<IConfiguracionRepository> _repo = new();
    private readonly ConfiguracionService _sut;

    public ConfiguracionServiceTests() => _sut = new(_repo.Object);

    // Fábricas con argumentos por nombre: agregar campos al DTO no rompe los tests
    private static ConfiguracionDto Config(string? nombre = null, string? colorPrimario = null,
        string? colorSidebar = null, DateTime? updatedAt = null) => new(
        NombreFundacion: nombre, Nit: null, Direccion: null, Telefono: null,
        NombreRepLegal: null, TipoDocRep: null, DocumentoRep: null, CargoRep: null, FirmaRep: null,
        ColorPrimario: colorPrimario, ColorSidebar: colorSidebar, ColorSecundario: null,
        ColorGradiente: null, ColorOscuroFondo: null, ColorOscuroPaper: null,
        ColorOscuroSidebar: null, ColorAccento: null, FontFamily: null, Tagline: null,
        Mision: null, Vision: null, EmailContacto: null, SitioWeb: null,
        MensajeBienvenida: null, FooterTexto: null, WebContenido: null,
        SmtpHost: null, SmtpPuerto: null, SmtpUsuario: null, SmtpClaveGuardada: false,
        SmtpDeNombre: null, SmtpDeEmail: null, SmtpSsl: false, UpdatedAt: updatedAt);

    private static GuardarConfiguracionDto Guardar(string? nombre = null, string? colorPrimario = null,
        string? colorSidebar = null) => new(
        NombreFundacion: nombre, Nit: null, Direccion: null, Telefono: null,
        NombreRepLegal: null, TipoDocRep: null, DocumentoRep: null, CargoRep: null, FirmaRep: null,
        ColorPrimario: colorPrimario, ColorSidebar: colorSidebar, ColorSecundario: null,
        ColorGradiente: null, ColorOscuroFondo: null, ColorOscuroPaper: null,
        ColorOscuroSidebar: null, ColorAccento: null, FontFamily: null, Tagline: null,
        Mision: null, Vision: null, EmailContacto: null, SitioWeb: null,
        MensajeBienvenida: null, FooterTexto: null, WebContenido: null,
        SmtpHost: null, SmtpPuerto: null, SmtpUsuario: null, SmtpClave: null,
        SmtpDeNombre: null, SmtpDeEmail: null, SmtpSsl: false);

    [Fact]
    public async Task ObtenerAsync_Delega_Al_Repositorio()
    {
        var dto = Config("Fundación", "#6200ea", "#150830");
        _repo.Setup(r => r.ObtenerAsync(default)).ReturnsAsync(dto);

        var result = await _sut.ObtenerAsync();

        Assert.Equal(dto, result);
        _repo.Verify(r => r.ObtenerAsync(default), Times.Once);
    }

    [Fact]
    public async Task ObtenerPublicaAsync_Devuelve_Null_Cuando_No_Hay_Config()
    {
        _repo.Setup(r => r.ObtenerPublicaAsync(default)).ReturnsAsync((ConfiguracionPublicaDto?)null);

        var result = await _sut.ObtenerPublicaAsync();

        Assert.Null(result);
    }

    [Fact]
    public async Task GuardarAsync_Retorna_Success_Con_Config_Guardada()
    {
        var guardarDto = Guardar("Fundación", "#6200ea", "#150830");
        var savedDto   = Config("Fundación", "#6200ea", "#150830", DateTime.UtcNow);
        _repo.Setup(r => r.GuardarAsync(guardarDto, default)).ReturnsAsync(savedDto);

        var result = await _sut.GuardarAsync(guardarDto);

        Assert.True(result.IsSuccess);
        Assert.Equal("Fundación", result.Value?.NombreFundacion);
    }

    [Fact]
    public async Task GuardarAsync_Propaga_Excepcion_Del_Repositorio()
    {
        var guardarDto = Guardar();
        _repo.Setup(r => r.GuardarAsync(guardarDto, default))
             .ThrowsAsync(new InvalidOperationException("BD no disponible"));

        await Assert.ThrowsAsync<InvalidOperationException>(() => _sut.GuardarAsync(guardarDto));
    }

    // ── Validación de campos ─────────────────────────────────────────────────

    [Theory]
    [InlineData("rojo")]
    [InlineData("#12345")]
    [InlineData("#1234567")]
    [InlineData("#GGGGGG")]
    public async Task GuardarAsync_Color_Con_Formato_Invalido(string color)
    {
        var result = await _sut.GuardarAsync(Guardar(colorPrimario: color));

        Assert.True(result.IsFailure);
        Assert.Contains("#RRGGBB", result.Error);
        _repo.Verify(r => r.GuardarAsync(It.IsAny<GuardarConfiguracionDto>(), default), Times.Never);
    }

    [Fact]
    public async Task GuardarAsync_Longitudes_Correos_Puerto_Y_Firma()
    {
        async Task<string?> Error(GuardarConfiguracionDto dto) => (await _sut.GuardarAsync(dto)).Error;

        Assert.Contains("200 caracteres", await Error(Guardar(nombre: new string('a', 201))));
        Assert.Contains("50 caracteres", await Error(Guardar() with { Nit = new string('9', 51) }));
        Assert.Contains("500 caracteres", await Error(Guardar() with { FooterTexto = new string('a', 501) }));
        Assert.Contains("correo de contacto no es válido", await Error(Guardar() with { EmailContacto = "contacto@" }));
        Assert.Contains("correo del remitente no es válido", await Error(Guardar() with { SmtpDeEmail = "x" }));
        Assert.Contains("entre 1 y 65535", await Error(Guardar() with { SmtpPuerto = 0 }));
        Assert.Contains("entre 1 y 65535", await Error(Guardar() with { SmtpPuerto = 70000 }));
        Assert.Contains("imagen válida", await Error(Guardar() with { FirmaRep = "javascript:alert(1)" }));
        Assert.Contains("demasiado pesada", await Error(Guardar() with { FirmaRep = "data:image/png;base64," + new string('A', 500_001) }));
        Assert.Contains("sitio web", await Error(Guardar() with { SitioWeb = "javascript:alert(1)" }));
    }

    [Fact]
    public async Task GuardarAsync_Valores_Validos_Se_Guardan()
    {
        var dto = Guardar("Fundación", "#4E1B95", "#150830") with
        {
            EmailContacto = "contacto@fundacion.org", SmtpPuerto = 587, SitioWeb = "www.fundacion.org",
            FirmaRep = "data:image/png;base64,iVBORw0KGgo=",
        };
        _repo.Setup(r => r.GuardarAsync(dto, default)).ReturnsAsync(Config("Fundación"));

        var result = await _sut.GuardarAsync(dto);

        Assert.True(result.IsSuccess);
    }

    // ── Parámetros de nómina ─────────────────────────────────────────────────

    [Theory]
    [InlineData(0, 200_000, 0.04, 0.04, "salario mínimo")]
    [InlineData(-1, 200_000, 0.04, 0.04, "salario mínimo")]
    [InlineData(1_423_500, 0, 0.04, 0.04, "auxilio de transporte")]
    [InlineData(1_423_500, 200_000, -0.01, 0.04, "tasa de salud")]
    [InlineData(1_423_500, 200_000, 0.21, 0.04, "tasa de salud")]
    [InlineData(1_423_500, 200_000, 0.04, 0.5, "tasa de pensión")]
    public async Task GuardarAsync_Parametros_De_Nomina_Invalidos(
        double smlmv, double auxilio, double salud, double pension, string mensaje)
    {
        var dto = Guardar() with
        {
            NominaSmlmv = (decimal)smlmv, NominaAuxilioTransporte = (decimal)auxilio,
            NominaTasaSalud = (decimal)salud, NominaTasaPension = (decimal)pension,
        };

        var result = await _sut.GuardarAsync(dto);

        Assert.True(result.IsFailure);
        Assert.Contains(mensaje, result.Error);
        _repo.Verify(r => r.GuardarAsync(It.IsAny<GuardarConfiguracionDto>(), default), Times.Never);
    }

    [Fact]
    public async Task GuardarAsync_Parametros_De_Nomina_Validos_Y_Limites()
    {
        var dto = Guardar() with
        {
            NominaSmlmv = 1_600_000, NominaAuxilioTransporte = 220_000, NominaTasaSalud = 0.2m, NominaTasaPension = 0,
        };
        _repo.Setup(r => r.GuardarAsync(dto, default)).ReturnsAsync(Config());

        Assert.True((await _sut.GuardarAsync(dto)).IsSuccess);
    }

    [Fact]
    public void Sin_Parametros_De_Nomina_No_Se_Validan_Y_El_Dto_Trae_Los_Predeterminados()
    {
        // Un cliente que no los envía (null) conserva lo guardado; la lectura sin datos usa los valores históricos
        Assert.Null(Validar(Guardar()));
        var cfg = Config();
        Assert.Equal(1_423_500m, cfg.NominaSmlmv);
        Assert.Equal(200_000m, cfg.NominaAuxilioTransporte);
        Assert.Equal(0.04m, cfg.NominaTasaSalud);
        Assert.Equal(0.04m, cfg.NominaTasaPension);

        static string? Validar(GuardarConfiguracionDto d)
            => FundacionPanorama.Application.Shared.Validar.PrimerError(() => ConfiguracionService.ValidarCampos(d));
    }
}
