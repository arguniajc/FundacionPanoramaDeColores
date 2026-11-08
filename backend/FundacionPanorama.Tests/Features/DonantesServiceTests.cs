using FundacionPanorama.Application.Features.Donantes;
using FundacionPanorama.Application.Features.Donantes.DTOs;
using FundacionPanorama.Application.Features.Donantes.Interfaces;
using Moq;

namespace FundacionPanorama.Tests.Features;

public class DonantesServiceTests
{
    private readonly Mock<IDonantesRepository> _repo = new();
    private readonly DonantesService           _sut;

    public DonantesServiceTests() => _sut = new(_repo.Object);

    [Theory]
    [InlineData(0, 0, 1, 1)]
    [InlineData(-3, 10000, 1, 500)]
    [InlineData(2, 50, 2, 50)]
    public async Task ListarAsync_Ajusta_Pagina_Y_PorPagina(int pagina, int porPagina, int pEsperada, int ppEsperado)
    {
        _repo.Setup(r => r.ListarAsync(It.IsAny<string?>(), It.IsAny<bool>(), It.IsAny<int>(), It.IsAny<int>(), default))
             .ReturnsAsync([]);

        await _sut.ListarAsync("ana", true, pagina, porPagina);

        _repo.Verify(r => r.ListarAsync("ana", true, pEsperada, ppEsperado, default), Times.Once);
    }

    [Fact]
    public async Task ToggleAsync_Devuelve_Null_Si_No_Existe()
    {
        _repo.Setup(r => r.ToggleAsync(It.IsAny<Guid>(), default)).ReturnsAsync((bool?)null);
        Assert.Null(await _sut.ToggleAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task EliminarAsync_Delega_En_Repositorio()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.EliminarAsync(id, default)).ReturnsAsync(true);

        Assert.True(await _sut.EliminarAsync(id));
        _repo.Verify(r => r.EliminarAsync(id, default), Times.Once);
    }

    static CrearDonanteDto Donante(string nombre = "Ferretería El Tornillo", string tipo = "empresa", string? email = null)
        => new(nombre, tipo, null, null, email, null, null, null, null, null);

    [Theory]
    [InlineData("fundacion")]
    [InlineData("Persona")]
    public async Task Tipo_Fuera_De_La_Lista(string tipo)
    {
        var ex = await Assert.ThrowsAsync<FundacionPanorama.Domain.Shared.DatoInvalidoException>(() => _sut.CrearAsync(Donante(tipo: tipo)));
        Assert.Contains("persona o empresa", ex.Message);
        _repo.Verify(r => r.CrearAsync(It.IsAny<CrearDonanteDto>(), default), Times.Never);
    }

    [Theory]
    [InlineData("persona")]
    [InlineData("empresa")]
    [InlineData("")] // vacío: el repositorio guarda "persona"
    public async Task Tipos_Validos(string tipo)
    {
        await _sut.ActualizarAsync(Guid.NewGuid(), Donante(tipo: tipo));
        _repo.Verify(r => r.ActualizarAsync(It.IsAny<Guid>(), It.IsAny<CrearDonanteDto>(), default), Times.Once);
    }

    [Fact]
    public async Task Nombre_Obligatorio_Y_Correo_Valido()
    {
        await Assert.ThrowsAsync<FundacionPanorama.Domain.Shared.DatoInvalidoException>(() => _sut.CrearAsync(Donante(nombre: " ")));
        var ex = await Assert.ThrowsAsync<FundacionPanorama.Domain.Shared.DatoInvalidoException>(() => _sut.CrearAsync(Donante(email: "sin-arroba")));
        Assert.Contains("correo no es válido", ex.Message);
    }

    [Fact]
    public void Longitudes_Del_Dto_Coinciden_Con_La_Bd()
    {
        static int Max(string prop) => typeof(CrearDonanteDto).GetConstructors()[0].GetParameters()
            .Single(p => p.Name == prop).GetCustomAttributes(typeof(System.ComponentModel.DataAnnotations.StringLengthAttribute), false)
            .Cast<System.ComponentModel.DataAnnotations.StringLengthAttribute>().Single().MaximumLength;

        Assert.Equal(20,  Max("Tipo"));          // donantes.tipo VARCHAR(20)
        Assert.Equal(50,  Max("Documento"));     // donantes.documento VARCHAR(50)
        Assert.Equal(30,  Max("TipoDocumento")); // donantes.tipo_documento VARCHAR(30)
        Assert.Equal(150, Max("Email"));         // esquema base VARCHAR(150)
        Assert.Equal(20,  Max("Telefono"));      // esquema base VARCHAR(20)
    }
}
