using System.ComponentModel.DataAnnotations;
using FundacionPanorama.Application.Features.Voluntarios;
using FundacionPanorama.Application.Features.Voluntarios.DTOs;
using FundacionPanorama.Application.Features.Voluntarios.Interfaces;
using FundacionPanorama.Domain.Shared;
using Moq;

namespace FundacionPanorama.Tests.Features;

public class VoluntariosServiceTests
{
    private readonly Mock<IVoluntariosRepository> _repo = new();
    private readonly VoluntariosService           _sut;

    public VoluntariosServiceTests() => _sut = new(_repo.Object);

    static IEnumerable<ValidationAttribute> Atributos(string? prop = null) =>
        typeof(CrearVoluntarioDto).GetConstructors()[0].GetParameters()
            .Where(p => prop is null || p.Name == prop)
            .SelectMany(p => p.GetCustomAttributes(typeof(ValidationAttribute), false).Cast<ValidationAttribute>());

    [Theory]
    [InlineData(-1)]
    [InlineData(169)]
    public async Task Horas_Semanales_Fuera_De_Rango(decimal horas)
    {
        var ex = await Assert.ThrowsAsync<DatoInvalidoException>(
            () => _sut.AgregarAsignacionAsync(Guid.NewGuid(), new CrearAsignacionVolDto(null, null, horas, null)));
        Assert.Contains("horas semanales", ex.Message);
        await Assert.ThrowsAsync<DatoInvalidoException>(
            () => _sut.EditarAsignacionAsync(Guid.NewGuid(), new EditarAsignacionVolDto(null, null, horas, null)));
        _repo.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(8.5)]
    [InlineData(168)]
    public async Task Horas_Semanales_Validas(decimal horas)
    {
        await _sut.AgregarAsignacionAsync(Guid.NewGuid(), new CrearAsignacionVolDto(null, null, horas, null));
        _repo.Verify(r => r.AgregarAsignacionAsync(It.IsAny<Guid>(), It.IsAny<CrearAsignacionVolDto>(), default), Times.Once);
    }

    [Fact]
    public void Longitudes_Del_Dto_Coinciden_Con_La_Bd()
    {
        static int Max(string prop) => Atributos(prop).OfType<StringLengthAttribute>().Single().MaximumLength;

        Assert.Equal(150, Max("Nombre"));        // esquema base VARCHAR(150)
        Assert.Equal(20,  Max("TipoDocumento")); // voluntarios.tipo_documento VARCHAR(20)
        Assert.Equal(50,  Max("Documento"));     // voluntarios.documento VARCHAR(50)
        Assert.Equal(20,  Max("Telefono"));      // esquema base VARCHAR(20)
        Assert.Equal(100, Max("Profesion"));     // voluntarios.profesion VARCHAR(100)
    }

    [Fact]
    public void Todos_Los_Atributos_Tienen_Mensaje_En_Espanol()
        => Assert.All(Atributos(), a => Assert.False(string.IsNullOrWhiteSpace(a.ErrorMessage)));
}
