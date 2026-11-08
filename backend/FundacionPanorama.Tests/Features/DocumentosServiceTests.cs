using FundacionPanorama.Application.Features.Documentos;
using FundacionPanorama.Application.Features.Documentos.DTOs;
using FundacionPanorama.Application.Features.Documentos.Interfaces;
using FundacionPanorama.Domain.Shared;
using Moq;

namespace FundacionPanorama.Tests.Features;

public class DocumentosServiceTests
{
    private readonly Mock<IDocumentosRepository> _repo = new();
    private readonly DocumentosService           _sut;

    const string Origen = "https://abc.supabase.co/storage/v1/object/public/";

    public DocumentosServiceTests() => _sut = new(_repo.Object);

    static CrearDocumentoDto Doc(string url = "privado://documentos-institucionales/x.pdf", string titulo = "Acta 2025",
        string categoria = "Actas", string? nombre = "acta.pdf")
        => new(titulo, null, categoria, url, nombre);

    async Task<string> Falla(Func<Task> accion) => (await Assert.ThrowsAsync<DatoInvalidoException>(accion)).Message;

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("JaVaScRiPt:alert(1)")]
    [InlineData("java\tscript:alert(1)")]
    [InlineData("data:text/html;base64,PHNjcmlwdD4=")]
    [InlineData("http://abc.supabase.co/storage/v1/object/public/x.pdf")]
    [InlineData("https://otro-sitio.com/x.pdf")]
    [InlineData("privado://")]
    [InlineData("privado://../secreto")]
    [InlineData("")]
    public async Task Url_No_Permitida(string url)
    {
        Assert.Contains("enlace del archivo no es válido", await Falla(() => _sut.CrearAsync(Doc(url), "u@x.com", Origen)));
        _repo.Verify(r => r.CrearAsync(It.IsAny<CrearDocumentoDto>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData("privado://documentos-institucionales/3f0c.pdf")]
    [InlineData(Origen + "beneficiarios/web/foto.png")]
    public async Task Url_Permitida(string url)
    {
        await _sut.CrearAsync(Doc(url), "u@x.com", Origen);
        _repo.Verify(r => r.CrearAsync(It.Is<CrearDocumentoDto>(d => d.Url == url), "u@x.com", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public void Sin_Origen_Configurado_Acepta_Cualquier_Https_Pero_No_Otros_Esquemas()
    {
        DocumentosService.ValidarUrl("https://cualquiera.com/x.pdf", null);
        Assert.Throws<DatoInvalidoException>(() => DocumentosService.ValidarUrl("ftp://x.com/a.pdf", null));
    }

    [Fact]
    public async Task Titulo_Y_Nombre_Maximo_200()
    {
        var largo = new string('a', 201);
        Assert.Contains("200 caracteres", await Falla(() => _sut.CrearAsync(Doc(titulo: largo), "u@x.com")));
        Assert.Contains("200 caracteres", await Falla(() => _sut.CrearAsync(Doc(nombre: largo), "u@x.com")));
        Assert.Contains("título es obligatorio", await Falla(() => _sut.CrearAsync(Doc(titulo: " "), "u@x.com")));
    }

    [Theory]
    [InlineData("Contratos")]
    [InlineData("")]
    public async Task Categoria_Fuera_De_La_Lista(string categoria)
        => Assert.Contains("categoría no es válida", await Falla(() => _sut.CrearAsync(Doc(categoria: categoria), "u@x.com")));

    [Fact]
    public async Task Archivo_De_Beneficiario_Valida_Url()
    {
        Assert.Contains("enlace", await Falla(() =>
            _sut.GuardarArchivoBeneficiarioAsync(Guid.NewGuid(), new("Informe", "javascript:alert(1)", null), Origen)));

        var ok = new GuardarArchivoDto("Informe", "privado://documentos-beneficiarios/abc/x.pdf", "x.pdf");
        await _sut.GuardarArchivoBeneficiarioAsync(Guid.NewGuid(), ok, Origen);
        _repo.Verify(r => r.GuardarArchivoBeneficiarioAsync(It.IsAny<Guid>(), ok, It.IsAny<CancellationToken>()), Times.Once);
    }
}
