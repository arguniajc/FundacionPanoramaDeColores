using FundacionPanorama.API.Services;
using Microsoft.Extensions.Options;
using Moq;

namespace FundacionPanorama.Tests.Services;

public class SupabaseStorageServiceTests
{
    private const string Prefijo = "https://x.supabase.co/storage/v1/object/public/beneficiarios/";

    private readonly SupabaseStorageService _sut = new(
        Mock.Of<IHttpClientFactory>(),
        Options.Create(new SupabaseOptions { Url = "https://x.supabase.co", StorageBucket = "beneficiarios" }));

    [Theory]
    [InlineData("web")]
    [InlineData("fotos")]
    [InlineData("documentos")]
    [InlineData("documentos-institucionales")]
    [InlineData("inscripciones")]
    [InlineData("organigrama")]
    [InlineData("documentos-beneficiarios/3f2504e0-4f89-11d3-9a0c-0305e82c3301")]
    [InlineData("documentos-beneficiarios/3F2504E0-4F89-11D3-9A0C-0305E82C3301")]
    public void CarpetaPermitida_Acepta_Carpetas_Conocidas(string carpeta) =>
        Assert.True(SupabaseStorageService.CarpetaPermitida(carpeta));

    [Theory]
    [InlineData("")]
    [InlineData("../x")]
    [InlineData("fotos/../..")]
    [InlineData("fotos\n")] // $ en .NET acepta un salto de línea final; la regex usa \z
    [InlineData("fotos/")]
    [InlineData("/fotos")]
    [InlineData("Fotos")]
    [InlineData("otra")]
    [InlineData("documentos-beneficiarios")]
    [InlineData("documentos-beneficiarios/no-es-guid")]
    [InlineData("documentos-beneficiarios/3f2504e0-4f89-11d3-9a0c-0305e82c3301/..")]
    public void CarpetaPermitida_Rechaza_Otras(string carpeta) =>
        Assert.False(SupabaseStorageService.CarpetaPermitida(carpeta));

    [Theory]
    [InlineData("web", true)]
    [InlineData("fotos", false)]
    [InlineData("documentos", false)]
    [InlineData("organigrama", false)]
    [InlineData("", false)]
    public void EsCarpetaPublica_Solo_Web(string carpeta, bool esperado) =>
        Assert.Equal(esperado, SupabaseStorageService.EsCarpetaPublica(carpeta));

    [Fact]
    public void PrefijoPublico_Se_Arma_Con_Url_Y_Bucket() =>
        Assert.Equal(Prefijo, _sut.PrefijoPublicoBucket);

    [Fact]
    public void RutaPublicaMigrable_Archivo_Privado_Devuelve_Ruta() =>
        Assert.Equal("fotos/abc.jpg", _sut.RutaPublicaMigrable(Prefijo + "fotos/abc.jpg"));

    [Fact]
    public void RutaPublicaMigrable_Subcarpeta_Devuelve_Ruta_Completa() =>
        Assert.Equal("documentos-beneficiarios/3f2504e0-4f89-11d3-9a0c-0305e82c3301/doc.pdf",
            _sut.RutaPublicaMigrable(Prefijo + "documentos-beneficiarios/3f2504e0-4f89-11d3-9a0c-0305e82c3301/doc.pdf"));

    [Fact]
    public void RutaPublicaMigrable_Web_Es_Null() =>
        Assert.Null(_sut.RutaPublicaMigrable(Prefijo + "web/logo.png"));

    [Fact]
    public void RutaPublicaMigrable_Otro_Host_Es_Null() =>
        Assert.Null(_sut.RutaPublicaMigrable("https://otro.supabase.co/storage/v1/object/public/beneficiarios/fotos/abc.jpg"));

    [Fact]
    public void RutaPublicaMigrable_Otro_Bucket_Es_Null() =>
        Assert.Null(_sut.RutaPublicaMigrable("https://x.supabase.co/storage/v1/object/public/otro/fotos/abc.jpg"));

    [Fact]
    public void RutaPublicaMigrable_Referencia_Privada_Es_Null() =>
        Assert.Null(_sut.RutaPublicaMigrable("privado://fotos/abc.jpg"));

    [Fact]
    public void RutaPublicaMigrable_Decodifica_Url() =>
        Assert.Equal("fotos/foto de niño.jpg", _sut.RutaPublicaMigrable(Prefijo + "fotos/foto%20de%20ni%C3%B1o.jpg"));

    [Fact]
    public void RutaPublicaMigrable_Ignora_Query_String() =>
        Assert.Equal("fotos/abc.jpg", _sut.RutaPublicaMigrable(Prefijo + "fotos/abc.jpg?t=123"));
}
