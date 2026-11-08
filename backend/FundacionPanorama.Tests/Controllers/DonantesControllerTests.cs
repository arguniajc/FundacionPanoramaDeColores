using System.Reflection;
using FundacionPanorama.API.Controllers;
using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Donantes;
using FundacionPanorama.Application.Features.Donantes.DTOs;
using FundacionPanorama.Application.Features.Donantes.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace FundacionPanorama.Tests.Controllers;

/// <summary>POST api/donantes/verificar-documento: contrato { existe, id, nombre } y normalización.</summary>
public class DonantesControllerTests
{
    private readonly Mock<IDonantesRepository> _repo = new();
    private readonly DonantesController        _sut;

    public DonantesControllerTests() => _sut = new(new DonantesService(_repo.Object));

    private static T? Prop<T>(object? o, string nombre) => (T?)o?.GetType().GetProperty(nombre)?.GetValue(o);

    [Fact]
    public async Task VerificarDocumento_Existente_Devuelve_Id_Y_Nombre()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.BuscarDocumentoAsync("900123456", null, default))
             .ReturnsAsync(new DonanteExistente(id, "Ferretería El Tornillo"));

        // Con puntos y DV: se compara solo la base del NIT
        var res = Assert.IsType<OkObjectResult>(
            await _sut.VerificarDocumento(new DonantesController.VerificarDocumentoDto(" 900.123.456-8 ", "NIT")));

        Assert.True(Prop<bool>(res.Value, "existe"));
        Assert.Equal(id, Prop<Guid?>(res.Value, "id"));
        Assert.Equal("Ferretería El Tornillo", Prop<string>(res.Value, "nombre"));
    }

    [Fact]
    public async Task VerificarDocumento_Libre_Devuelve_Existe_False_Y_Excluye_El_Propio_Registro()
    {
        var propio = Guid.NewGuid();
        _repo.Setup(r => r.BuscarDocumentoAsync("1144123456", propio, default)).ReturnsAsync((DonanteExistente?)null);

        var res = Assert.IsType<OkObjectResult>(
            await _sut.VerificarDocumento(new DonantesController.VerificarDocumentoDto("1144123456", "CC", propio)));

        Assert.False(Prop<bool>(res.Value, "existe"));
        Assert.Null(Prop<Guid?>(res.Value, "id"));
        Assert.Null(Prop<string>(res.Value, "nombre"));
        _repo.Verify(r => r.BuscarDocumentoAsync("1144123456", propio, default), Times.Once);
    }

    [Theory]
    [InlineData("  ")]
    [InlineData(null)]
    public async Task VerificarDocumento_Sin_Numero_Responde_400(string? numero)
    {
        var res = await _sut.VerificarDocumento(new DonantesController.VerificarDocumentoDto(numero));
        Assert.IsType<BadRequestObjectResult>(res);
        _repo.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task VerificarDocumento_Solo_Simbolos_No_Consulta_La_Bd()
    {
        var res = Assert.IsType<OkObjectResult>(
            await _sut.VerificarDocumento(new DonantesController.VerificarDocumentoDto("--.")));
        Assert.False(Prop<bool>(res.Value, "existe"));
        _repo.VerifyNoOtherCalls();
    }

    [Fact]
    public void VerificarDocumento_Pide_Ver_Donantes_O_Donaciones()
    {
        var attr = typeof(DonantesController).GetMethod(nameof(DonantesController.VerificarDocumento))!
            .GetCustomAttribute<RequiereAlgunPermisoAttribute>();
        Assert.NotNull(attr);
        Assert.Equal(["donantes:ver", "donaciones:ver"], attr.PermisosAceptados);
    }

    [Theory]
    [InlineData("900123456-8", "900123456")]
    [InlineData("900.123.456-8", "900123456")]
    [InlineData("900123456", "900123456")]
    [InlineData(" 1.144.123.456 ", "1144123456")]
    [InlineData("AB-123456", "ab123456")]   // pasaporte con guion: no es un DV, se conserva
    [InlineData("12345-67", "1234567")]      // guion que no es DV (más de un dígito después)
    [InlineData("", "")]
    [InlineData(null, "")]
    public void NormalizarDocumento(string? entrada, string esperado)
        => Assert.Equal(esperado, DonantesService.NormalizarDocumento(entrada));
}
