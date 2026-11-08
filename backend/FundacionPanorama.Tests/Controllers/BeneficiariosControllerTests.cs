using FundacionPanorama.API.Controllers;
using FundacionPanorama.Application.Features.Beneficiarios;
using FundacionPanorama.Application.Features.Beneficiarios.DTOs;
using FundacionPanorama.Application.Features.Beneficiarios.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Moq;

namespace FundacionPanorama.Tests.Controllers;

/// <summary>POST api/beneficiarios/verificar-documento: contrato { existe, id, nombre }.</summary>
public class BeneficiariosControllerTests
{
    private readonly Mock<IBeneficiariosRepository> _repo = new();
    private readonly BeneficiariosController        _sut;

    public BeneficiariosControllerTests()
        => _sut = new(new BeneficiariosService(_repo.Object), new MemoryCache(new MemoryCacheOptions()));

    private static T? Prop<T>(object? o, string nombre) => (T?)o?.GetType().GetProperty(nombre)?.GetValue(o);

    [Fact]
    public async Task VerificarDocumento_Existente_Devuelve_Id_Y_Nombre()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.BuscarDocumentoAsync("1144123456", null, default))
             .ReturnsAsync(new DocumentoExistente(id, "Ana Pérez Gómez"));

        var res = Assert.IsType<OkObjectResult>(
            await _sut.VerificarDocumento(new BeneficiariosController.VerificarDocumentoDto(" 1144123456 ")));

        Assert.True(Prop<bool>(res.Value, "existe"));
        Assert.Equal(id, Prop<Guid?>(res.Value, "id"));
        Assert.Equal("Ana Pérez Gómez", Prop<string>(res.Value, "nombre"));
    }

    [Fact]
    public async Task VerificarDocumento_Libre_Devuelve_Existe_False_Y_Excluye_El_Propio_Registro()
    {
        var propio = Guid.NewGuid();
        _repo.Setup(r => r.BuscarDocumentoAsync("1144123456", propio, default)).ReturnsAsync((DocumentoExistente?)null);

        var res = Assert.IsType<OkObjectResult>(
            await _sut.VerificarDocumento(new BeneficiariosController.VerificarDocumentoDto("1144123456", propio)));

        Assert.False(Prop<bool>(res.Value, "existe"));
        Assert.Null(Prop<Guid?>(res.Value, "id"));
        Assert.Null(Prop<string>(res.Value, "nombre"));
        _repo.Verify(r => r.BuscarDocumentoAsync("1144123456", propio, default), Times.Once);
    }

    [Fact]
    public async Task VerificarDocumento_Sin_Numero_Responde_400()
    {
        var res = await _sut.VerificarDocumento(new BeneficiariosController.VerificarDocumentoDto("  "));
        Assert.IsType<BadRequestObjectResult>(res);
        _repo.VerifyNoOtherCalls();
    }
}
