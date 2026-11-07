using FundacionPanorama.Application.Features.Sedes;
using FundacionPanorama.Application.Features.Sedes.DTOs;
using FundacionPanorama.Application.Features.Sedes.Interfaces;
using Moq;

namespace FundacionPanorama.Tests.Features;

public class SedesServiceTests
{
    private readonly Mock<ISedesRepository> _repo = new(MockBehavior.Strict);
    private readonly SedesService           _sut;

    public SedesServiceTests() => _sut = new(_repo.Object);

    private static CrearCampoDto Campo(string? seccion) => new("Etiqueta", "texto", false, null, 1, seccion, null);

    [Fact]
    public async Task ActualizarAsync_NoEncontrado_Si_No_Afecta_Filas()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.ActualizarAsync(id, It.IsAny<CrearSedeDto>(), default)).ReturnsAsync(0);

        var res = await _sut.ActualizarAsync(id, new CrearSedeDto("Sede", null, null, null));

        Assert.Equal(EstadoResultadoSede.NoEncontrado, res.Estado);
        Assert.Null(res.Mensaje);
    }

    [Fact]
    public async Task CrearProgramaAsync_Invalido_Si_La_Sede_No_Existe()
    {
        var dto = new CrearProgramaDto(Guid.NewGuid(), "Programa", null, null);
        _repo.Setup(r => r.ExisteSedeAsync(dto.SedeId, default)).ReturnsAsync(false);

        var res = await _sut.CrearProgramaAsync(dto);

        Assert.Equal(EstadoResultadoSede.Invalido, res.Estado);
        Assert.Equal("Sede no encontrada.", res.Mensaje);
    }

    [Fact]
    public async Task AutorizarRepLegalAsync_Invalido_Sin_Configuracion_Antes_De_Tocar_El_Programa()
    {
        _repo.Setup(r => r.ObtenerRepLegalConfigAsync(default)).ReturnsAsync((RepLegalConfig?)null);

        var res = await _sut.AutorizarRepLegalAsync(Guid.NewGuid());

        Assert.Equal(EstadoResultadoSede.Invalido, res.Estado);
        Assert.StartsWith("No hay configuración de representante legal", res.Mensaje);
    }

    [Theory]
    [InlineData(null, "123")]
    [InlineData("  ", "123")]
    [InlineData("Ana", null)]
    [InlineData("Ana", "")]
    public async Task AutorizarRepLegalAsync_Invalido_Si_Faltan_Nombre_O_Documento(string? nombre, string? documento)
    {
        _repo.Setup(r => r.ObtenerRepLegalConfigAsync(default))
             .ReturnsAsync(new RepLegalConfig(nombre, documento, "Directora", "firma"));

        var res = await _sut.AutorizarRepLegalAsync(Guid.NewGuid());

        Assert.Equal(EstadoResultadoSede.Invalido, res.Estado);
        Assert.StartsWith("Completa el nombre y el documento", res.Mensaje);
    }

    [Fact]
    public async Task AutorizarRepLegalAsync_Copia_Datos_De_Configuracion()
    {
        var id  = Guid.NewGuid();
        var rep = new RepLegalConfig("Ana", "123", "Directora", "firma");
        _repo.Setup(r => r.ObtenerRepLegalConfigAsync(default)).ReturnsAsync(rep);
        _repo.Setup(r => r.AutorizarRepAsync(id, rep, default)).ReturnsAsync(0);

        var res = await _sut.AutorizarRepLegalAsync(id);

        Assert.Equal(EstadoResultadoSede.NoEncontrado, res.Estado);
        _repo.Verify(r => r.AutorizarRepAsync(id, rep, default), Times.Once);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public async Task CrearCampoAsync_Exige_Seccion_Sin_Ir_A_Bd(string? seccion)
    {
        var res = await _sut.CrearCampoAsync(Guid.NewGuid(), Campo(seccion));

        Assert.Equal(EstadoResultadoSede.Invalido, res.Estado);
        Assert.Equal("La sección del campo es obligatoria.", res.Mensaje);
    }

    [Fact]
    public async Task CrearCampoAsync_NoEncontrado_Con_Mensaje_Si_No_Existe_El_Programa()
    {
        var pid = Guid.NewGuid();
        _repo.Setup(r => r.ExisteProgramaAsync(pid, default)).ReturnsAsync(false);

        var res = await _sut.CrearCampoAsync(pid, Campo("Datos"));

        Assert.Equal(EstadoResultadoSede.NoEncontrado, res.Estado);
        Assert.Equal("Programa no encontrado.", res.Mensaje);
    }

    [Fact]
    public async Task ActualizarCampoAsync_NoEncontrado_Sin_Mensaje()
    {
        var pid = Guid.NewGuid(); var cid = Guid.NewGuid();
        _repo.Setup(r => r.ActualizarCampoAsync(pid, cid, It.IsAny<CrearCampoDto>(), default)).ReturnsAsync((CampoDto?)null);

        var res = await _sut.ActualizarCampoAsync(pid, cid, Campo("Datos"));

        Assert.Equal(EstadoResultadoSede.NoEncontrado, res.Estado);
        Assert.Null(res.Mensaje);
    }

    [Fact]
    public async Task EliminarAsync_False_Si_No_Existe()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.EliminarAsync(id, default)).ReturnsAsync(0);
        Assert.False(await _sut.EliminarAsync(id));
    }
}
