using System.Globalization;
using System.Text.RegularExpressions;
using FundacionPanorama.Domain.Shared;

namespace FundacionPanorama.Application.Shared;

/// <summary>
/// Reglas de validación comunes a los módulos. Cada una lanza DatoInvalidoException con un
/// mensaje para el usuario final (la API lo responde como 400 tal cual). Los límites de
/// longitud que pasan los servicios son los de la columna real en DbMigrations.
/// </summary>
public static class Validar
{
    static readonly Regex CorreoValido = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+\z", RegexOptions.Compiled);
    static readonly Regex ColorValido  = new(@"^#[0-9a-fA-F]{6}\z", RegexOptions.Compiled);

    /// <summary>Tope de una firma/imagen en base64 (texto): ~500 KB.</summary>
    public const int MaxImagenBase64 = 500_000;

    /// <summary>Fecha de hoy en Colombia (UTC-5).</summary>
    public static DateOnly Hoy() => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-5));

    public static void Exigir(bool condicion, string mensaje)
    {
        if (!condicion) throw new DatoInvalidoException(mensaje);
    }

    /// <summary>Texto obligatorio (no vacío ni solo espacios).</summary>
    public static void Obligatorio(string? valor, string mensaje)
        => Exigir(!string.IsNullOrWhiteSpace(valor), mensaje);

    /// <summary>Longitud máxima según la columna. "campo" con artículo: "El título", "La etiqueta".</summary>
    public static void Largo(string? valor, int max, string campo)
        => Exigir(valor is null || valor.Trim().Length <= max, $"{campo} no puede superar {max} caracteres.");

    /// <summary>Correo opcional: si viene, debe tener formato válido.</summary>
    public static void Correo(string? valor, int max, string campo = "El correo", string ejemplo = "nombre@fundacion.org")
    {
        if (string.IsNullOrWhiteSpace(valor)) return;
        Exigir(CorreoValido.IsMatch(valor.Trim()), $"{campo} no es válido. Ejemplo: {ejemplo}");
        Largo(valor, max, campo);
    }

    /// <summary>Fecha opcional en texto "AAAA-MM-DD". Devuelve null si viene vacía.</summary>
    public static DateOnly? FechaTexto(string? valor, string campo, string ejemplo = "2025-03-15")
    {
        if (string.IsNullOrWhiteSpace(valor)) return null;
        Exigir(DateOnly.TryParseExact(valor.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var f),
            $"{campo} no es una fecha válida. Usa el formato AAAA-MM-DD. Ejemplo: {ejemplo}");
        Exigir(f.Year is >= 1900 and <= 2100, $"{campo} no es una fecha válida. Ejemplo: {ejemplo}");
        return f;
    }

    /// <summary>Hora obligatoria en texto "HH:mm" (o "HH:mm:ss").</summary>
    public static TimeOnly Hora(string? valor, string campo, string ejemplo = "08:00")
    {
        Exigir(!string.IsNullOrWhiteSpace(valor)
               && TimeOnly.TryParseExact(valor.Trim(), ["HH:mm", "H:mm", "HH:mm:ss"], CultureInfo.InvariantCulture, DateTimeStyles.None, out _),
            $"{campo} no es una hora válida. Usa el formato HH:MM de 24 horas. Ejemplo: {ejemplo}");
        return TimeOnly.ParseExact(valor!.Trim(), ["HH:mm", "H:mm", "HH:mm:ss"], CultureInfo.InvariantCulture);
    }

    /// <summary>Color opcional en formato #rrggbb.</summary>
    public static void Color(string? valor, string campo)
    {
        if (valor is null) return;
        Exigir(ColorValido.IsMatch(valor.Trim()), $"{campo} no es válido. Usa el formato #RRGGBB. Ejemplo: #4E1B95");
    }

    /// <summary>Imagen opcional en base64 ("data:image/…"), con tope de tamaño.</summary>
    public static void ImagenBase64(string? valor, string campo)
    {
        if (string.IsNullOrWhiteSpace(valor)) return;
        Exigir(valor.TrimStart().StartsWith("data:image/", StringComparison.OrdinalIgnoreCase),
            $"{campo} no es una imagen válida. Vuelve a dibujarla o súbela de nuevo.");
        Exigir(valor.Length <= MaxImagenBase64,
            $"{campo} es demasiado pesada (máximo {MaxImagenBase64 / 1000} KB). Usa una imagen más pequeña.");
    }

    /// <summary>Valor opcional que, si viene, debe estar en la lista cerrada.</summary>
    public static void EnLista(string? valor, IReadOnlyCollection<string> permitidos, string mensaje)
        => Exigir(valor is not null && permitidos.Contains(valor.Trim()), mensaje);

    /// <summary>Ejecuta las validaciones y devuelve el mensaje del primer error, o null si todo está bien.</summary>
    public static string? PrimerError(Action validaciones)
    {
        try { validaciones(); return null; }
        catch (DatoInvalidoException e) { return e.Message; }
    }
}
