namespace FundacionPanorama.Application.Shared;

/// <summary>Persona que ya tiene un número de documento (respuesta de los endpoints verificar-documento).</summary>
public sealed record PersonaConDocumento(Guid Id, string Nombre);

/// <summary>Comparación de números de documento sin importar puntos, espacios, guiones ni mayúsculas.</summary>
public static class DocumentoIdentidad
{
    /// <summary>
    /// Expresión SQL (PostgreSQL) que normaliza una columna igual que <see cref="Normalizar"/>:
    /// <c>string.Format(SqlNormalizar, "v.documento")</c>.
    /// </summary>
    public const string SqlNormalizar = "regexp_replace(UPPER(COALESCE({0}, '')), '[^0-9A-Z]', '', 'g')";

    /// <summary>"1.144.123 456" → "1144123456"; "ab-12 34" → "AB1234". Null o vacío → "".</summary>
    public static string Normalizar(string? numero)
    {
        if (string.IsNullOrWhiteSpace(numero)) return "";
        var sb = new System.Text.StringBuilder(numero.Length);
        foreach (var c in numero.ToUpperInvariant())
            if (c is >= '0' and <= '9' or >= 'A' and <= 'Z') sb.Append(c);
        return sb.ToString();
    }
}
