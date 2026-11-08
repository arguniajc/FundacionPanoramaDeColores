using System.Net;
using FundacionPanorama.API.Controllers;
using FundacionPanorama.API.Services;
using FundacionPanorama.Application.Features.Documentos;
using FundacionPanorama.Application.Features.Documentos.DTOs;
using FundacionPanorama.Application.Features.Documentos.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace FundacionPanorama.Tests.Services;

/// <summary>Captura las peticiones a Supabase Storage y responde lo que se le indique.</summary>
internal sealed class StorageFalso(HttpStatusCode status = HttpStatusCode.OK, bool lanzar = false) : HttpMessageHandler
{
    public List<(HttpMethod Metodo, string Url, string Cuerpo)> Peticiones { get; } = [];

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage req, CancellationToken ct)
    {
        Peticiones.Add((req.Method, req.RequestUri!.ToString(), req.Content is null ? "" : await req.Content.ReadAsStringAsync(ct)));
        if (lanzar) throw new HttpRequestException("Storage no responde");
        return new HttpResponseMessage(status) { Content = new StringContent("{}") };
    }

    public SupabaseStorageService Servicio()
    {
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(() => new HttpClient(this, disposeHandler: false));
        return new SupabaseStorageService(factory.Object, Options.Create(new SupabaseOptions
        {
            Url = "https://x.supabase.co", ServiceKey = "k", StorageBucket = "beneficiarios", BucketPrivado = "privado",
        }));
    }
}

public class EliminarArchivosStorageTests
{
    [Theory]
    [InlineData("privado://documentos/abc.pdf", "documentos/abc.pdf")]
    [InlineData("privado://documentos-institucionales/abc.pdf", "documentos-institucionales/abc.pdf")]
    [InlineData("privado://documentos-beneficiarios/3f2504e0-4f89-11d3-9a0c-0305e82c3301/abc.pdf",
                "documentos-beneficiarios/3f2504e0-4f89-11d3-9a0c-0305e82c3301/abc.pdf")]
    public void RutaPrivadaPropia_Acepta_Referencias_Del_Bucket_Propio(string referencia, string ruta) =>
        Assert.Equal(ruta, SupabaseStorageService.RutaPrivadaPropia(referencia));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("https://x.supabase.co/storage/v1/object/public/beneficiarios/documentos/abc.pdf")]
    [InlineData("https://otro.com/abc.pdf")]
    [InlineData("privado://")]
    [InlineData("privado://abc.pdf")]                  // sin carpeta
    [InlineData("privado://documentos/")]              // sin archivo
    [InlineData("privado://documentos/../web/x.png")]  // salir de la carpeta
    [InlineData("privado://otra/abc.pdf")]             // carpeta desconocida
    [InlineData("privado://web/logo.png")]             // carpeta pública
    [InlineData("privado://documentos\\abc.pdf")]
    [InlineData("privado://documentos/a b.pdf")]
    public void RutaPrivadaPropia_Rechaza_Lo_Que_No_Es_Del_Bucket_Propio(string? referencia) =>
        Assert.Null(SupabaseStorageService.RutaPrivadaPropia(referencia));

    [Fact]
    public async Task EliminarPrivado_Borra_Del_Bucket_Privado()
    {
        var storage = new StorageFalso();
        var ok = await storage.Servicio().EliminarPrivadoAsync("privado://documentos/abc.pdf");

        Assert.True(ok);
        var p = Assert.Single(storage.Peticiones);
        Assert.Equal(HttpMethod.Delete, p.Metodo);
        Assert.Equal("https://x.supabase.co/storage/v1/object/privado", p.Url);
        Assert.Contains("\"documentos/abc.pdf\"", p.Cuerpo);
    }

    [Fact]
    public async Task EliminarPrivado_Referencia_Ajena_No_Llama_A_Storage()
    {
        var storage = new StorageFalso();
        Assert.False(await storage.Servicio().EliminarPrivadoAsync("https://otro.com/abc.pdf"));
        Assert.Empty(storage.Peticiones);
    }

    [Fact]
    public async Task EliminarPrivado_Error_De_Storage_Lanza()
    {
        var storage = new StorageFalso(HttpStatusCode.InternalServerError);
        await Assert.ThrowsAsync<InvalidOperationException>(() => storage.Servicio().EliminarPrivadoAsync("privado://documentos/abc.pdf"));
    }
}

/// <summary>Al borrar un documento también se borra su archivo; si Storage falla, el borrado sigue.</summary>
public class DocumentosControllerEliminarTests
{
    private readonly Mock<IDocumentosRepository> _repo = new();

    private DocumentosController Controlador(StorageFalso storage) => new(
        new DocumentosService(_repo.Object),
        Options.Create(new SupabaseOptions { Url = "https://x.supabase.co" }),
        storage.Servicio(),
        NullLogger<DocumentosController>.Instance)
    {
        ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() },
    };

    [Fact]
    public async Task Eliminar_Documento_Borra_El_Archivo_Del_Bucket()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.EliminarAsync(id, default)).ReturnsAsync(new DocumentoEliminado("privado://documentos-institucionales/a.pdf"));
        var storage = new StorageFalso();

        Assert.IsType<OkResult>(await Controlador(storage).Eliminar(id));
        Assert.Contains("documentos-institucionales/a.pdf", Assert.Single(storage.Peticiones).Cuerpo);
    }

    [Fact]
    public async Task Eliminar_Archivo_De_Beneficiario_Borra_El_Archivo_Del_Bucket()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.EliminarArchivoAsync(id, default))
             .ReturnsAsync(new DocumentoEliminado("privado://documentos-beneficiarios/3f2504e0-4f89-11d3-9a0c-0305e82c3301/a.pdf"));
        var storage = new StorageFalso();

        Assert.IsType<OkResult>(await Controlador(storage).EliminarArchivo(id));
        Assert.Single(storage.Peticiones);
    }

    [Fact]
    public async Task Si_Storage_Falla_El_Registro_Igual_Queda_Eliminado()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.EliminarAsync(id, default)).ReturnsAsync(new DocumentoEliminado("privado://documentos/a.pdf"));

        Assert.IsType<OkResult>(await Controlador(new StorageFalso(lanzar: true)).Eliminar(id));
        Assert.IsType<OkResult>(await Controlador(new StorageFalso(HttpStatusCode.BadGateway)).Eliminar(id));
    }

    [Fact]
    public async Task Enlace_Externo_No_Toca_Storage()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.EliminarAsync(id, default)).ReturnsAsync(new DocumentoEliminado("https://otro.com/a.pdf"));
        var storage = new StorageFalso();

        Assert.IsType<OkResult>(await Controlador(storage).Eliminar(id));
        Assert.Empty(storage.Peticiones);
    }

    [Fact]
    public async Task Inexistente_Responde_404_Sin_Tocar_Storage()
    {
        _repo.Setup(r => r.EliminarAsync(It.IsAny<Guid>(), default)).ReturnsAsync((DocumentoEliminado?)null);
        var storage = new StorageFalso();

        Assert.IsType<NotFoundResult>(await Controlador(storage).Eliminar(Guid.NewGuid()));
        Assert.Empty(storage.Peticiones);
    }
}

/// <summary>La IP del limitador no se puede falsificar con cabeceras del cliente.</summary>
public class LimiteSolicitudesTests
{
    private static DefaultHttpContext Ctx(Action<IHeaderDictionary>? cabeceras = null, string remota = "10.0.0.1")
    {
        var ctx = new DefaultHttpContext();
        ctx.Connection.RemoteIpAddress = IPAddress.Parse(remota);
        cabeceras?.Invoke(ctx.Request.Headers);
        return ctx;
    }

    [Fact]
    public void Usa_CF_Connecting_IP_Si_Existe() =>
        Assert.Equal("1.1.1.1", LimiteSolicitudes.IpCliente(Ctx(h =>
        {
            h["CF-Connecting-IP"] = "1.1.1.1";
            h["X-Forwarded-For"]  = "9.9.9.9, 2.2.2.2";
        })));

    [Fact]
    public void Sin_Cloudflare_Toma_El_Ultimo_X_Forwarded_For_El_Que_Pone_El_Proxy() =>
        Assert.Equal("2.2.2.2", LimiteSolicitudes.IpCliente(Ctx(h => h["X-Forwarded-For"] = "9.9.9.9, 8.8.8.8, 2.2.2.2")));

    [Fact]
    public void Varias_Cabeceras_X_Forwarded_For_Cuentan_Como_Una() =>
        Assert.Equal("2.2.2.2", LimiteSolicitudes.IpCliente(Ctx(h => h["X-Forwarded-For"] = new(["9.9.9.9", "2.2.2.2"]))));

    [Fact]
    public void True_Client_IP_Se_Ignora() =>
        Assert.Equal("10.0.0.1", LimiteSolicitudes.IpCliente(Ctx(h => h["True-Client-IP"] = "9.9.9.9")));

    [Fact]
    public void Cambiar_El_Primer_Valor_No_Cambia_La_Clave()
    {
        var a = LimiteSolicitudes.IpCliente(Ctx(h => h["X-Forwarded-For"] = "1.2.3.4, 2.2.2.2"));
        var b = LimiteSolicitudes.IpCliente(Ctx(h => h["X-Forwarded-For"] = "5.6.7.8, 2.2.2.2"));
        Assert.Equal(a, b);
    }

    [Fact]
    public void UsuarioOIp_Con_Sesion_Usa_El_Correo()
    {
        var ctx = Ctx();
        ctx.User = new System.Security.Claims.ClaimsPrincipal(new System.Security.Claims.ClaimsIdentity(
            [new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Email, "Ana@Fundacion.org")], "Test"));
        Assert.Equal("u:ana@fundacion.org", LimiteSolicitudes.UsuarioOIp(ctx));
    }

    [Fact]
    public void UsuarioOIp_Sin_Sesion_Usa_La_Ip() =>
        Assert.Equal("ip:10.0.0.1", LimiteSolicitudes.UsuarioOIp(Ctx()));
}
