using Microsoft.Extensions.Options;

namespace FundacionPanorama.API.Services;

public class SupabaseOptions
{
    public string Url           { get; set; } = "";
    public string ServiceKey    { get; set; } = "";
    public string StorageBucket { get; set; } = "beneficiarios";
}

public class SupabaseStorageService
{
    private readonly IHttpClientFactory _factory;
    private readonly SupabaseOptions    _opts;

    public SupabaseStorageService(IHttpClientFactory factory, IOptions<SupabaseOptions> opts)
    {
        _factory = factory;
        _opts    = opts.Value;
    }

    /// <summary>
    /// Sube un archivo a Supabase Storage y devuelve la URL pública.
    /// carpeta: subcarpeta dentro del bucket, ej. "fotos" o "documentos"
    /// </summary>
    public async Task<string> SubirAsync(IFormFile archivo, string carpeta = "fotos")
    {
        var ext       = Path.GetExtension(archivo.FileName).ToLowerInvariant();
        var nombreObj = $"{carpeta}/{Guid.NewGuid()}{ext}";
        var uploadUrl = $"{_opts.Url}/storage/v1/object/{_opts.StorageBucket}/{nombreObj}";

        using var http    = _factory.CreateClient();
        using var cuerpo  = new StreamContent(archivo.OpenReadStream());

        cuerpo.Headers.ContentType =
            new System.Net.Http.Headers.MediaTypeHeaderValue(archivo.ContentType);

        var req = new HttpRequestMessage(HttpMethod.Post, uploadUrl) { Content = cuerpo };
        req.Headers.Add("Authorization", $"Bearer {_opts.ServiceKey}");
        req.Headers.Add("x-upsert", "true");

        var resp = await http.SendAsync(req);

        if (!resp.IsSuccessStatusCode)
        {
            var detalle = await resp.Content.ReadAsStringAsync();
            throw new InvalidOperationException(
                $"Supabase Storage devolvió {(int)resp.StatusCode}: {detalle}");
        }

        return $"{_opts.Url}/storage/v1/object/public/{_opts.StorageBucket}/{nombreObj}";
    }
}
