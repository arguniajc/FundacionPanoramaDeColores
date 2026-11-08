using FundacionPanorama.Application.Features.TalentoHumano;
using FundacionPanorama.Application.Features.TalentoHumano.DTOs;
using FundacionPanorama.Application.Features.TalentoHumano.Interfaces;
using FundacionPanorama.Domain.Shared;
using Moq;

namespace FundacionPanorama.Tests.Features;

public class TalentoHumanoServiceTests
{
    private readonly Mock<ITalentoHumanoRepository> _repo = new();
    private readonly TalentoHumanoService           _sut;

    public TalentoHumanoServiceTests() => _sut = new(_repo.Object);

    static CrearEmpleadoDto Empleado(string nombres = "María José", string apellidos = "Rodríguez", string? email = null,
        string? documento = null, DateOnly? ingreso = null, DateOnly? fin = null, decimal? salario = null, string? telefono = null)
        => new(nombres, apellidos, "CC", documento, email, telefono, null, null, null, null, "indefinido",
            ingreso, fin, salario, null, null, null);

    static CrearNovedadDto Novedad(string tipo = "vacaciones", int? dias = 5, DateOnly? fin = null)
        => new(tipo, new DateOnly(2026, 7, 1), fin, dias, null);

    static ActualizarNovedadDto EditarNovedad(string estado)
        => new("vacaciones", new DateOnly(2026, 7, 1), null, 5, null, estado);

    static EmpleadoDto EmpleadoExistente(Guid id) => new(
        id, "Ana", "Pérez", null, null, null, null, null, null, null, null, null, null, null, null,
        null, null, null, true, null, null, DateTime.UtcNow);

    async Task<string> Falla(Func<Task> accion) => (await Assert.ThrowsAsync<DatoInvalidoException>(accion)).Message;

    [Theory]
    [InlineData("", "Pérez", "nombres son obligatorios")]
    [InlineData("Ana", "  ", "apellidos son obligatorios")]
    public async Task Nombres_Y_Apellidos_Obligatorios(string nombres, string apellidos, string fragmento)
    {
        Assert.Contains(fragmento, await Falla(() => _sut.CrearAsync(Empleado(nombres, apellidos))));
        _repo.Verify(r => r.CrearAsync(It.IsAny<CrearEmpleadoDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Email_Con_Formato_Invalido()
        => Assert.Contains("Ejemplo", await Falla(() => _sut.CrearAsync(Empleado(email: "maria@"))));

    [Fact]
    public async Task Longitudes_Segun_Columnas()
    {
        Assert.Contains("200 caracteres", await Falla(() => _sut.CrearAsync(Empleado(nombres: new string('a', 201)))));
        Assert.Contains("30 caracteres",  await Falla(() => _sut.CrearAsync(Empleado(documento: new string('1', 31)))));
        Assert.Contains("20 caracteres",  await Falla(() => _sut.CrearAsync(Empleado(telefono: new string('3', 21)))));
    }

    [Fact]
    public async Task Fin_De_Contrato_Antes_Del_Ingreso()
        => Assert.Contains("fin de contrato", await Falla(() =>
            _sut.CrearAsync(Empleado(ingreso: new DateOnly(2026, 2, 1), fin: new DateOnly(2026, 1, 31)))));

    [Fact]
    public async Task Salario_Negativo()
        => Assert.Contains("negativo", await Falla(() => _sut.CrearAsync(Empleado(salario: -1))));

    [Fact]
    public async Task Empleado_Valido_Se_Guarda()
    {
        var dto = Empleado(email: "ana@fundacion.org", ingreso: new DateOnly(2026, 2, 1), fin: new DateOnly(2026, 12, 31), salario: 1_423_500);
        await _sut.CrearAsync(dto);
        _repo.Verify(r => r.CrearAsync(dto, It.IsAny<CancellationToken>()), Times.Once);
    }

    // ── Novedades ────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("vacacion")]
    [InlineData("")]
    public async Task Tipo_De_Novedad_Fuera_De_La_Lista(string tipo)
        => Assert.Contains("tipo de novedad", await Falla(() => _sut.CrearNovedadAsync(Guid.NewGuid(), Novedad(tipo))));

    [Fact]
    public async Task Novedad_Con_Fechas_O_Dias_Invalidos()
    {
        Assert.Contains("fecha fin", await Falla(() => _sut.CrearNovedadAsync(Guid.NewGuid(), Novedad(fin: new DateOnly(2026, 6, 30)))));
        Assert.Contains("días", await Falla(() => _sut.CrearNovedadAsync(Guid.NewGuid(), Novedad(dias: -1))));
    }

    [Fact]
    public async Task Novedad_De_Empleado_Inexistente()
    {
        _repo.Setup(r => r.ObtenerAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((EmpleadoDto?)null);
        Assert.Contains("empleado no existe", await Falla(() => _sut.CrearNovedadAsync(Guid.NewGuid(), Novedad())));
    }

    [Fact]
    public async Task Novedad_Valida_Se_Guarda()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.ObtenerAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(EmpleadoExistente(id));
        await _sut.CrearNovedadAsync(id, Novedad("incapacidad"));
        _repo.Verify(r => r.CrearNovedadAsync(id, It.Is<CrearNovedadDto>(n => n.Tipo == "incapacidad"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData("aprobado")]
    [InlineData("")]
    public async Task Estado_De_Novedad_Fuera_De_La_Lista(string estado)
        => Assert.Contains("estado de la novedad", await Falla(() => _sut.ActualizarNovedadAsync(Guid.NewGuid(), EditarNovedad(estado))));

    [Theory]
    [InlineData("pendiente")]
    [InlineData("aprobada")]
    [InlineData("rechazada")]
    public async Task Estados_De_Novedad_Del_Panel(string estado)
    {
        await _sut.ActualizarNovedadAsync(Guid.NewGuid(), EditarNovedad(estado));
        _repo.Verify(r => r.ActualizarNovedadAsync(It.IsAny<Guid>(), It.IsAny<ActualizarNovedadDto>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
