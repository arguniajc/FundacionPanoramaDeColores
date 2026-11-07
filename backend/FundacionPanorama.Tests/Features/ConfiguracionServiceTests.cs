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
}
