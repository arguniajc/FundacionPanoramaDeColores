using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace FundacionPanorama.API.Services;

public class SupabaseOptions
{
    public string Url           { get; set; } = "";
    public string ServiceKey    { get; set; } = "";
    public string StorageBucket { get; set; } = "beneficiarios"; // público: solo imágenes de la web
    public string BucketPrivado { get; set; } = "privado";       // datos personales (enlaces firmados)
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

    // ── Almacenamiento público vs privado ────────────────────────────────────
    // Solo las imágenes de la página web pública quedan en el bucket público.
    // Todo lo demás (fotos y documentos de beneficiarios, inscripciones, organigrama…)
    // va a un bucket privado: en la BD se guarda una referencia "privado://carpeta/archivo"
    // y el panel pide enlaces temporales firmados (FirmarAsync) para mostrarlos.
    public const string PrefijoPrivado = "privado://";
    static readonly string[] CarpetasPublicas = ["web"];
    static readonly System.Text.RegularExpressions.Regex CarpetaValida =
        new(@"^(web|fotos|documentos|documentos-institucionales|inscripciones|organigrama|documentos-beneficiarios/[0-9a-fA-F-]{36})\z", // \z: $ aceptaría un "\n" final
            System.Text.RegularExpressions.RegexOptions.Compiled);

    static readonly Dictionary<string, string> ExtPorTipo = new()
    {
        ["image/jpeg"] = ".jpg", ["image/jpg"] = ".jpg", ["image/png"] = ".png", ["image/webp"] = ".webp",
        ["image/heic"] = ".heic", ["image/heif"] = ".heif", ["application/pdf"] = ".pdf",
    };

    public static bool CarpetaPermitida(string carpeta) => CarpetaValida.IsMatch(carpeta);
    public static bool EsCarpetaPublica(string carpeta) => CarpetasPublicas.Contains(carpeta);

    string BucketPrivado => _opts.BucketPrivado;
    string PrefijoPublico => $"{_opts.Url}/storage/v1/object/public/{_opts.StorageBucket}/";

    HttpRequestMessage Peticion(HttpMethod metodo, string ruta, HttpContent? cuerpo = null)
    {
        var req = new HttpRequestMessage(metodo, $"{_opts.Url}/storage/v1/{ruta}") { Content = cuerpo };
        req.Headers.Add("apikey", _opts.ServiceKey);
        req.Headers.Add("Authorization", $"Bearer {_opts.ServiceKey}");
        return req;
    }

    async Task<HttpResponseMessage> EnviarAsync(HttpRequestMessage req, bool exigirExito = true, CancellationToken ct = default)
    {
        using var http = _factory.CreateClient();
        var resp = await http.SendAsync(req, ct);
        if (exigirExito && !resp.IsSuccessStatusCode)
        {
            var detalle = await resp.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"Supabase Storage devolvió {(int)resp.StatusCode}: {detalle}");
        }
        return resp;
    }

    /// <summary>
    /// Sube un archivo. Devuelve la URL pública (carpeta "web") o una referencia
    /// "privado://carpeta/archivo" para todo lo demás.
    /// </summary>
    public async Task<string> SubirAsync(IFormFile archivo, string carpeta = "fotos")
    {
        if (!CarpetaPermitida(carpeta))
            throw new ArgumentException($"Carpeta no permitida: {carpeta}");
        if (!ValidarMagicBytes(archivo))
            throw new InvalidOperationException(
                "El contenido del archivo no coincide con su tipo declarado.");

        var tipo      = archivo.ContentType.Split(';')[0].Trim().ToLowerInvariant();
        var ext       = ExtPorTipo.GetValueOrDefault(tipo, "");
        var nombreObj = $"{carpeta}/{Guid.NewGuid()}{ext}";
        var publica   = EsCarpetaPublica(carpeta);
        var bucket    = publica ? _opts.StorageBucket : BucketPrivado;

        var cuerpo = new StreamContent(archivo.OpenReadStream());
        cuerpo.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(tipo);
        var req = Peticion(HttpMethod.Post, $"object/{bucket}/{nombreObj}", cuerpo);
        req.Headers.Add("x-upsert", "true");
        using var _ = await EnviarAsync(req);

        return publica ? PrefijoPublico + nombreObj : PrefijoPrivado + nombreObj;
    }

    /// <summary>Crea el bucket privado si todavía no existe (se llama al arrancar).</summary>
    public async Task AsegurarBucketPrivadoAsync(CancellationToken ct = default)
    {
        using var existe = await EnviarAsync(Peticion(HttpMethod.Get, $"bucket/{BucketPrivado}"), exigirExito: false, ct);
        if (existe.IsSuccessStatusCode) return;

        var cuerpo = JsonContent.Create(new { id = BucketPrivado, name = BucketPrivado, @public = false });
        using var _ = await EnviarAsync(Peticion(HttpMethod.Post, "bucket", cuerpo), ct: ct);
    }

    /// <summary>
    /// Enlaces temporales para referencias "privado://…" (las demás se devuelven igual).
    /// Devuelve un diccionario referencia → URL firmada; las que no existen quedan fuera.
    /// </summary>
    public async Task<Dictionary<string, string>> FirmarAsync(IEnumerable<string> referencias, int segundos = 3600, CancellationToken ct = default)
    {
        var resultado = new Dictionary<string, string>();
        var privadas  = new List<string>();
        foreach (var r in referencias.Distinct())
        {
            if (r.StartsWith(PrefijoPrivado, StringComparison.Ordinal)) privadas.Add(r);
            else resultado[r] = r;
        }
        if (privadas.Count == 0) return resultado;

        var rutas  = privadas.Select(r => r[PrefijoPrivado.Length..]).ToArray();
        var cuerpo = JsonContent.Create(new { expiresIn = segundos, paths = rutas });
        using var resp = await EnviarAsync(Peticion(HttpMethod.Post, $"object/sign/{BucketPrivado}", cuerpo), ct: ct);
        var firmados = await resp.Content.ReadFromJsonAsync<List<UrlFirmada>>(ct) ?? [];

        foreach (var f in firmados)
            if (f.Path is not null && !string.IsNullOrEmpty(f.SignedURL) && string.IsNullOrEmpty(f.Error))
                resultado[PrefijoPrivado + f.Path] = $"{_opts.Url}/storage/v1{f.SignedURL}";
        return resultado;
    }

    sealed record UrlFirmada(
        [property: System.Text.Json.Serialization.JsonPropertyName("path")]      string? Path,
        [property: System.Text.Json.Serialization.JsonPropertyName("signedURL")] string? SignedURL,
        [property: System.Text.Json.Serialization.JsonPropertyName("error")]     string? Error);

    // ── Migración de archivos existentes del bucket público al privado ───────

    /// <summary>Extrae la ruta interna si la URL es un archivo público NO web de este proyecto.</summary>
    public string? RutaPublicaMigrable(string url)
    {
        if (!url.StartsWith(PrefijoPublico, StringComparison.Ordinal)) return null;
        var ruta    = Uri.UnescapeDataString(url[PrefijoPublico.Length..].Split('?')[0]);
        var carpeta = ruta.Contains('/') ? ruta[..ruta.LastIndexOf('/')] : "";
        return EsCarpetaPublica(carpeta.Split('/')[0]) ? null : ruta;
    }

    public string PrefijoPublicoBucket => PrefijoPublico;

    /// <summary>Copia un archivo del bucket público al privado con la misma ruta.</summary>
    public async Task<bool> CopiarAPrivadoAsync(string ruta, CancellationToken ct = default)
    {
        var cuerpo = JsonContent.Create(new
        {
            bucketId = _opts.StorageBucket, sourceKey = ruta,
            destinationBucket = BucketPrivado, destinationKey = ruta,
        });
        using var resp = await EnviarAsync(Peticion(HttpMethod.Post, "object/copy", cuerpo), exigirExito: false, ct);
        if (resp.IsSuccessStatusCode) return true;
        // Ya copiado antes (migración repetida): cuenta como éxito
        var detalle = await resp.Content.ReadAsStringAsync(ct);
        return detalle.Contains("already exists", StringComparison.OrdinalIgnoreCase)
            || detalle.Contains("Duplicate", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>Rutas de todos los archivos del bucket público fuera de las carpetas públicas.</summary>
    public async Task<List<string>> ListarPublicosPersonalesAsync(CancellationToken ct = default)
    {
        var rutas = new List<string>();
        async Task Recorrer(string prefijo)
        {
            for (var offset = 0; ; offset += 1000)
            {
                var cuerpo = JsonContent.Create(new { prefix = prefijo, limit = 1000, offset });
                using var resp = await EnviarAsync(Peticion(HttpMethod.Post, $"object/list/{_opts.StorageBucket}", cuerpo), ct: ct);
                var items = await resp.Content.ReadFromJsonAsync<List<ObjetoStorage>>(ct) ?? [];
                foreach (var it in items)
                {
                    var ruta = string.IsNullOrEmpty(prefijo) ? it.Name : $"{prefijo}/{it.Name}";
                    if (it.Id is null) // carpeta
                    {
                        if (!(string.IsNullOrEmpty(prefijo) && EsCarpetaPublica(it.Name))) await Recorrer(ruta);
                    }
                    else if (!string.IsNullOrEmpty(prefijo)) rutas.Add(ruta);
                }
                if (items.Count < 1000) break;
            }
        }
        await Recorrer("");
        return rutas;
    }

    sealed record ObjetoStorage(
        [property: System.Text.Json.Serialization.JsonPropertyName("name")] string Name,
        [property: System.Text.Json.Serialization.JsonPropertyName("id")]   string? Id);

    /// <summary>Borra del bucket público archivos que ya existen en el privado.</summary>
    public async Task<int> EliminarPublicosMigradosAsync(IReadOnlyCollection<string> rutas, CancellationToken ct = default)
    {
        if (rutas.Count == 0) return 0;
        // Solo se borra lo que tiene copia en el privado (la firma confirma que existe)
        var firmados = await FirmarAsync(rutas.Select(r => PrefijoPrivado + r), 60, ct);
        var borrables = rutas.Where(r => firmados.ContainsKey(PrefijoPrivado + r)).ToArray();
        if (borrables.Length == 0) return 0;

        var cuerpo = JsonContent.Create(new { prefixes = borrables });
        using var _ = await EnviarAsync(Peticion(HttpMethod.Delete, $"object/{_opts.StorageBucket}", cuerpo), ct: ct);
        return borrables.Length;
    }
}
