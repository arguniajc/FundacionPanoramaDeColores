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

    private static CrearCampoDto Campo(string? seccion) => new("Etiqueta", "text", false, null, 1, seccion, null);

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

    // ── Validación de datos ──────────────────────────────────────────────────

    [Theory]
    [InlineData("", "nombre de la sede es obligatorio")]
    [InlineData("SEDE_LARGA", "150 caracteres")]
    public async Task Sede_Nombre_Obligatorio_Y_Maximo_150(string nombre, string fragmento)
    {
        if (nombre == "SEDE_LARGA") nombre = new string('a', 151);
        var ex = await Assert.ThrowsAsync<FundacionPanorama.Domain.Shared.DatoInvalidoException>(
            () => _sut.CrearAsync(new CrearSedeDto(nombre, null, null, null)));
        Assert.Contains(fragmento, ex.Message);

        var res = await _sut.ActualizarAsync(Guid.NewGuid(), new CrearSedeDto(nombre, null, null, null));
        Assert.Equal(EstadoResultadoSede.Invalido, res.Estado);
        Assert.Contains(fragmento, res.Mensaje);
    }

    [Theory]
    [InlineData(0, null, null, "cupo máximo")]
    [InlineData(-5, null, null, "cupo máximo")]
    [InlineData(null, "CEDULA_DE_CIUDADANIA_X", null, "20 caracteres")]
    [InlineData(null, null, "https://x.com/firma.png", "imagen válida")]
    public async Task Programa_Invalido_No_Va_A_Bd(int? cupo, string? tipoDoc, string? firma, string fragmento)
    {
        var dto = new CrearProgramaDto(Guid.NewGuid(), "Escuela de fútbol", null, cupo,
            TerceroRepTipoDoc: tipoDoc, TerceroRepFirma: firma);

        var res = await _sut.CrearProgramaAsync(dto); // mock estricto: si fuera a la BD, fallaría

        Assert.Equal(EstadoResultadoSede.Invalido, res.Estado);
        Assert.Contains(fragmento, res.Mensaje);
    }

    [Fact]
    public async Task Programa_Sin_Nombre()
    {
        var res = await _sut.CrearProgramaAsync(new CrearProgramaDto(Guid.NewGuid(), "  ", null, null));
        Assert.Equal(EstadoResultadoSede.Invalido, res.Estado);
        Assert.Contains("nombre del programa es obligatorio", res.Mensaje);
    }

    [Theory]
    [InlineData("texto", null, 6, "tipo de campo")]
    [InlineData("select", new[] { "Única" }, 6, "al menos 2 opciones")]
    [InlineData("select", new[] { "A", " " }, 6, "al menos 2 opciones")]
    [InlineData("text", null, 0, "entre 1 y 12")]
    [InlineData("text", null, 13, "entre 1 y 12")]
    public async Task Campo_Invalido_No_Va_A_Bd(string tipo, string[]? opciones, int columnas, string fragmento)
    {
        var res = await _sut.CrearCampoAsync(Guid.NewGuid(), new CrearCampoDto("Talla", tipo, false, opciones, 1, "Datos", columnas));
        Assert.Equal(EstadoResultadoSede.Invalido, res.Estado);
        Assert.Contains(fragmento, res.Mensaje);
    }

    [Fact]
    public async Task Campo_Etiqueta_Obligatoria_Y_Maximo_100()
    {
        var vacia = await _sut.CrearCampoAsync(Guid.NewGuid(), new CrearCampoDto(" ", "text", false, null, 1, "Datos", 6));
        Assert.Contains("etiqueta del campo es obligatoria", vacia.Mensaje);

        var larga = await _sut.ActualizarCampoAsync(Guid.NewGuid(), Guid.NewGuid(),
            new CrearCampoDto(new string('a', 101), "text", false, null, 1, "Datos", 6));
        Assert.Contains("100 caracteres", larga.Mensaje);
    }

    [Fact]
    public async Task Campo_Select_Con_Dos_Opciones_Es_Valido()
    {
        var pid = Guid.NewGuid();
        var dto = new CrearCampoDto("Talla", "select", true, ["S", "M"], 1, "Datos", 12);
        _repo.Setup(r => r.ExisteProgramaAsync(pid, default)).ReturnsAsync(true);
        _repo.Setup(r => r.CrearCampoAsync(pid, dto, default))
             .ReturnsAsync(new CampoDto(Guid.NewGuid(), pid, "Talla", "select", true, ["S", "M"], 1, true, "Datos", 12, DateTime.UtcNow, DateTime.UtcNow));

        var res = await _sut.CrearCampoAsync(pid, dto);

        Assert.Equal(EstadoResultadoSede.Ok, res.Estado);
    }
}
