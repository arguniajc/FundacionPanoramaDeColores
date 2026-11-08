using System.Text.Json;
using FundacionPanorama.Application.Features.Beneficiarios;
using FundacionPanorama.Application.Features.Beneficiarios.DTOs;
using FundacionPanorama.Application.Features.Beneficiarios.Interfaces;
using FundacionPanorama.Application.Shared;
using Moq;

namespace FundacionPanorama.Tests.Features;

/// <summary>
/// El listado de beneficiarios (GET api/beneficiarios) devuelve un resumen: sin salud,
/// dirección, acudiente ni rutas de fotos. La ficha completa solo va en el detalle o la exportación.
/// </summary>
public class BeneficiarioResumenTests
{
    private readonly Mock<IBeneficiariosRepository> _repo = new();
    private readonly BeneficiariosService           _sut;

    public BeneficiarioResumenTests() => _sut = new(_repo.Object);

    private static BeneficiarioDto Completo(string tipo = "niño") => new()
    {
        Id = Guid.NewGuid(), NombreMenor = "Valentina Rodríguez", PrimerNombre = "Valentina", PrimerApellido = "Rodríguez",
        FechaNacimiento = new DateOnly(2015, 4, 12), TipoDocumento = "TI", NumeroDocumento = "1107123456",
        Genero = "Femenino", Whatsapp = "3001234567", TieneAlergia = "si",
        DescripcionAlergia = "Penicilina", ObservacionesSalud = "Asma leve", Eps = "Sura",
        TieneDiscapacidad = true, DescripcionDiscapacidad = "Visual",
        NombreAcudiente = "Ana Gómez", Parentesco = "Madre", Direccion = "Calle 1 # 2-3", Barrio = "Centro",
        TallaCamisa = "10", TallaPantalon = "10", TallaZapatos = "30", PesoKg = 30, TallaCm = 130,
        NombreColegio = "IE Panorama", GradoEscolar = "4°",
        FotoMenorUrl = "privado://fotos/a.jpg", FotoDocumentoUrl = "privado://documentos/b.pdf",
        FotoDocumentoReversoUrl = "privado://documentos/c.pdf",
        Activo = true, Tipo = tipo, MotivoBaja = "x",
    };

    private void ListadoDevuelve(params BeneficiarioDto[] filas) =>
        _repo.Setup(r => r.ListarAsync(It.IsAny<FiltroBeneficiarios>(), It.IsAny<int>(), It.IsAny<int>(), default))
             .ReturnsAsync(new ListaPaginada<BeneficiarioDto> { Data = [.. filas], Total = 42, Pagina = 2, PorPagina = 15 });

    [Fact]
    public void El_Resumen_No_Tiene_Campos_Sensibles()
    {
        var props = typeof(BeneficiarioResumenDto).GetProperties().Select(p => p.Name).ToHashSet();
        string[] sensibles =
        [
            nameof(BeneficiarioDto.DescripcionAlergia), nameof(BeneficiarioDto.ObservacionesSalud),
            nameof(BeneficiarioDto.Eps), nameof(BeneficiarioDto.TieneDiscapacidad), nameof(BeneficiarioDto.DescripcionDiscapacidad),
            nameof(BeneficiarioDto.Direccion), nameof(BeneficiarioDto.Barrio), nameof(BeneficiarioDto.NombreAcudiente),
            nameof(BeneficiarioDto.Parentesco), nameof(BeneficiarioDto.FotoMenorUrl), nameof(BeneficiarioDto.FotoDocumentoUrl),
            nameof(BeneficiarioDto.FotoDocumentoReversoUrl), nameof(BeneficiarioDto.PesoKg), nameof(BeneficiarioDto.MotivoBaja),
            nameof(BeneficiarioDto.NombreColegio),
        ];
        Assert.All(sensibles, s => Assert.DoesNotContain(s, props));
    }

    [Fact]
    public void El_Resumen_Trae_Lo_Que_Usan_Las_Pantallas_De_Listado()
    {
        // BeneficiariosPage/AdultosPage (tabla), NuevaInscripcionDialog y TabPorBeneficiario (buscadores)
        string[] usados =
        [
            "Id", "NombreMenor", "FechaNacimiento", "TipoDocumento", "NumeroDocumento", "Genero",
            "Whatsapp", "TieneAlergia", "Activo", "Tipo", "TieneFotoMenor", "TieneFotoDocumento", "Completitud",
        ];
        var props = typeof(BeneficiarioResumenDto).GetProperties().Select(p => p.Name).ToHashSet();
        Assert.All(usados, u => Assert.Contains(u, props));
    }

    [Fact]
    public async Task ListarAsync_Devuelve_Resumen_Y_Conserva_La_Paginacion()
    {
        var b = Completo();
        ListadoDevuelve(b);

        var res = await _sut.ListarAsync(2, 15, null, "activos", null, null, null, null, null, null);

        Assert.Equal((42, 2, 15), (res.Total, res.Pagina, res.PorPagina));
        var fila = Assert.Single(res.Data);
        Assert.Equal(b.Id, fila.Id);
        Assert.Equal("Valentina Rodríguez", fila.NombreMenor);
        Assert.Equal("1107123456", fila.NumeroDocumento);
        Assert.Equal("si", fila.TieneAlergia);
        Assert.True(fila.TieneFotoMenor);
        Assert.True(fila.TieneFotoDocumento);
        Assert.Equal(100, fila.Completitud);
    }

    [Fact]
    public async Task El_Json_Del_Listado_No_Incluye_Datos_De_Salud_Ni_Direccion()
    {
        ListadoDevuelve(Completo());
        var res  = await _sut.ListarAsync(1, 15, null, "activos", null, null, null, null, null, null);
        var json = JsonSerializer.Serialize(res);

        Assert.DoesNotContain("Penicilina", json);
        Assert.DoesNotContain("Asma", json);
        Assert.DoesNotContain("Calle 1", json);
        Assert.DoesNotContain("privado://", json);
        Assert.DoesNotContain("Madre", json);
    }

    [Fact]
    public async Task ListarCompletoAsync_Para_Exportar_Trae_La_Ficha()
    {
        ListadoDevuelve(Completo());
        var res = await _sut.ListarCompletoAsync(1, 100, null, "todos", null, null, null, null, null, "niño");
        Assert.Equal("Penicilina", Assert.Single(res.Data).DescripcionAlergia);
    }

    [Fact]
    public void Completitud_Nino_Usa_10_Campos_Y_No_Registra_Cuenta_Como_Vacio()
    {
        var b = Completo();
        b.Eps = "No registra";   // 9/10
        b.FotoMenorUrl = null;   // 8/10
        Assert.Equal(80, BeneficiarioResumenDto.CalcularCompletitud(b));
    }

    [Fact]
    public void Completitud_Adulto_Ignora_Colegio_Y_Grado()
    {
        var b = Completo("adulto");
        b.NombreColegio = null;
        b.GradoEscolar  = null;
        b.PesoKg        = 0;     // 7/8 = 87.5 → 88 (como Math.round del frontend)
        Assert.Equal(88, BeneficiarioResumenDto.CalcularCompletitud(b));
    }

    [Fact]
    public void Completitud_Sin_Datos_Es_Cero()
    {
        var vacio = new BeneficiarioDto { Tipo = "niño" };
        Assert.Equal(0, BeneficiarioResumenDto.CalcularCompletitud(vacio));
        var r = BeneficiarioResumenDto.Desde(vacio);
        Assert.False(r.TieneFotoMenor);
        Assert.False(r.TieneFotoDocumento);
    }
}
