using System.Reflection;
using FundacionPanorama.API.Controllers;
using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.TalentoHumano;
using FundacionPanorama.Application.Features.TalentoHumano.Interfaces;
using FundacionPanorama.Application.Features.Voluntarios;
using FundacionPanorama.Application.Features.Voluntarios.Interfaces;
using FundacionPanorama.Application.Shared;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace FundacionPanorama.Tests.Controllers;

/// <summary>
/// POST api/voluntarios/verificar-documento y POST api/talento-humano/verificar-documento:
/// contrato { existe, id, nombre }, número normalizado, excluirId y permiso "ver".
/// </summary>
public class VerificarDocumentoPersonalTests
{
    private readonly Mock<IVoluntariosRepository>   _repoVol = new();
    private readonly Mock<ITalentoHumanoRepository> _repoEmp = new();
    private readonly VoluntariosController          _vol;
    private readonly TalentoHumanoController        _emp;

    public VerificarDocumentoPersonalTests()
    {
        _vol = new(new VoluntariosService(_repoVol.Object));
        _emp = new(new TalentoHumanoService(_repoEmp.Object));
    }

    private static T? Prop<T>(object? o, string nombre) => (T?)o?.GetType().GetProperty(nombre)?.GetValue(o);

    // ── Voluntarios ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Voluntario_Existente_Devuelve_Id_Y_Nombre_Con_Numero_Normalizado()
    {
        var id = Guid.NewGuid();
        _repoVol.Setup(r => r.BuscarDocumentoAsync("1144123456", null, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new PersonaConDocumento(id, "Laura Martínez"));

        var res = Assert.IsType<OkObjectResult>(
            await _vol.VerificarDocumento(new VoluntariosController.VerificarDocumentoDto(" 1.144.123 456 ")));

        Assert.True(Prop<bool>(res.Value, "existe"));
        Assert.Equal(id, Prop<Guid?>(res.Value, "id"));
        Assert.Equal("Laura Martínez", Prop<string>(res.Value, "nombre"));
    }

    [Fact]
    public async Task Voluntario_Libre_Devuelve_Existe_False_Y_Excluye_El_Propio()
    {
        var propio = Guid.NewGuid();
        _repoVol.Setup(r => r.BuscarDocumentoAsync("AB123456", propio, It.IsAny<CancellationToken>()))
                .ReturnsAsync((PersonaConDocumento?)null);

        var res = Assert.IsType<OkObjectResult>(
            await _vol.VerificarDocumento(new VoluntariosController.VerificarDocumentoDto("ab-123456", propio)));

        Assert.False(Prop<bool>(res.Value, "existe"));
        Assert.Null(Prop<Guid?>(res.Value, "id"));
        Assert.Null(Prop<string>(res.Value, "nombre"));
        _repoVol.Verify(r => r.BuscarDocumentoAsync("AB123456", propio, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    [InlineData(" .-. ")]
    public async Task Voluntario_Sin_Numero_Responde_400_Sin_Consultar(string? numero)
    {
        var res = await _vol.VerificarDocumento(new VoluntariosController.VerificarDocumentoDto(numero));
        Assert.IsType<BadRequestObjectResult>(res);
        _repoVol.VerifyNoOtherCalls();
    }

    // ── Empleados ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Empleado_Existente_Devuelve_Id_Y_Nombre()
    {
        var id = Guid.NewGuid();
        _repoEmp.Setup(r => r.BuscarDocumentoAsync("52123456", null, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new PersonaConDocumento(id, "María José Rodríguez"));

        var res = Assert.IsType<OkObjectResult>(
            await _emp.VerificarDocumento(new TalentoHumanoController.VerificarDocumentoDto("52.123.456")));

        Assert.True(Prop<bool>(res.Value, "existe"));
        Assert.Equal(id, Prop<Guid?>(res.Value, "id"));
        Assert.Equal("María José Rodríguez", Prop<string>(res.Value, "nombre"));
    }

    [Fact]
    public async Task Empleado_Libre_Excluye_El_Propio()
    {
        var propio = Guid.NewGuid();
        _repoEmp.Setup(r => r.BuscarDocumentoAsync("52123456", propio, It.IsAny<CancellationToken>()))
                .ReturnsAsync((PersonaConDocumento?)null);

        var res = Assert.IsType<OkObjectResult>(
            await _emp.VerificarDocumento(new TalentoHumanoController.VerificarDocumentoDto("52123456", propio)));

        Assert.False(Prop<bool>(res.Value, "existe"));
        _repoEmp.Verify(r => r.BuscarDocumentoAsync("52123456", propio, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Empleado_Sin_Numero_Responde_400_Sin_Consultar()
    {
        var res = await _emp.VerificarDocumento(new TalentoHumanoController.VerificarDocumentoDto(""));
        Assert.IsType<BadRequestObjectResult>(res);
        _repoEmp.VerifyNoOtherCalls();
    }

    // ── Permisos y normalización ──────────────────────────────────────────────

    [Theory]
    [InlineData(typeof(VoluntariosController),   "voluntarios")]
    [InlineData(typeof(TalentoHumanoController), "talento_humano")]
    public void Exige_Permiso_Ver_Del_Modulo(Type controlador, string modulo)
    {
        var m = controlador.GetMethod("VerificarDocumento")!;
        var p = Assert.Single(m.GetCustomAttributes<RequierePermisoAttribute>());
        Assert.Equal((modulo, "ver"), (p.Modulo, p.Accion));
        Assert.Equal("verificar-documento", Assert.Single(m.GetCustomAttributes<HttpPostAttribute>()).Template);
    }

    [Theory]
    [InlineData("1.144.123.456", "1144123456")]
    [InlineData(" ab-12 34 ", "AB1234")]
    [InlineData("900123456-8", "9001234568")]
    [InlineData(null, "")]
    [InlineData("  ", "")]
    public void Normalizar_Quita_Puntos_Espacios_Y_Guiones(string? entrada, string esperado)
        => Assert.Equal(esperado, DocumentoIdentidad.Normalizar(entrada));
}
