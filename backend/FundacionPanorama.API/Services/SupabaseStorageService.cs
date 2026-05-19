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

    // Magic-bytes por tipo MIME — protege contra extensión/ContentType falsificados
    static readonly (string mime, byte[] sig)[] _firmas =
    [
        ("image/jpeg",       [0xFF, 0xD8, 0xFF]),
        ("image/jpg",        [0xFF, 0xD8, 0xFF]),
        ("image/png",        [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        ("application/pdf",  [0x25, 0x50, 0x44, 0x46]),   // %PDF
    ];

    static bool ValidarMagicBytes(IFormFile archivo)
    {
        var ct = archivo.ContentType.Split(';')[0].Trim().ToLowerInvariant();

        // WebP: RIFF....WEBP (bytes 0-3 + 8-11)
        if (ct is "image/webp")
        {
            Span<byte> buf12 = stackalloc byte[12];
            using var s12 = archivo.OpenReadStream();
            if (s12.Read(buf12) < 12) return false;
            return buf12[0] == 0x52 && buf12[1] == 0x49 && buf12[2] == 0x46 && buf12[3] == 0x46
                && buf12[8] == 0x57 && buf12[9] == 0x45 && buf12[10] == 0x42 && buf12[11] == 0x50;
        }

        // HEIC/HEIF: magic bytes complejos, no validamos por bytes
        if (ct is "image/heic" or "image/heif") return true;

        var firma = _firmas.FirstOrDefault(f => f.mime == ct);
        if (firma == default) return true; // tipo desconocido: no bloqueamos

        Span<byte> buf = stackalloc byte[firma.sig.Length];
        using var stream = archivo.OpenReadStream();
        if (stream.Read(buf) < firma.sig.Length) return false;
        return buf.SequenceEqual(firma.sig);
    }

    /// <summary>
    /// Sube un archivo a Supabase Storage y devuelve la URL pública.
    /// carpeta: subcarpeta dentro del bucket, ej. "fotos" o "documentos"
    /// </summary>
    public async Task<string> SubirAsync(IFormFile archivo, string carpeta = "fotos")
    {
        if (!ValidarMagicBytes(archivo))
            throw new InvalidOperationException(
                "El contenido del archivo no coincide con su tipo declarado.");

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
