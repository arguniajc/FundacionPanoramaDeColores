using System.Globalization;
using System.Text.RegularExpressions;
using FundacionPanorama.Application.Features.Contabilidad.DTOs;

namespace FundacionPanorama.API.Services;

/// <summary>
/// Interpreta el texto que devuelve el OCR de una factura o recibo colombiano y extrae
/// fecha, total, NIT, número de factura, proveedor y concepto. Es lógica pura (sin red
/// ni base de datos) para poder probarla con textos de ejemplo. Lo que no reconoce
/// queda en null para que el usuario lo complete a mano.
/// </summary>
public static class ParserFactura
{
    static readonly Dictionary<string, int> Meses = new()
    {
        ["ENE"] = 1, ["FEB"] = 2, ["MAR"] = 3, ["ABR"] = 4, ["MAY"] = 5, ["JUN"] = 6,
        ["JUL"] = 7, ["AGO"] = 8, ["SEP"] = 9, ["SET"] = 9, ["OCT"] = 10, ["NOV"] = 11, ["DIC"] = 12,
    };

    public static FacturaExtraidaDto Parsear(string texto)
    {
        var upper = texto.ToUpperInvariant();
        var lines = texto.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        // ── Monto ─────────────────────────────────────────────────────────────
        // Del rótulo más explícito al más genérico. "SUBTOTAL" y "TOTAL IVA" no son el total.
        decimal? monto = null;
        foreach (var pattern in new[]
        {
            @"(?:TOTAL\s*A\s*PAGAR|NETO\s*A\s*PAGAR|GRAN\s*TOTAL|VALOR\s*TOTAL)[^\d$]*\$?\s*([\d.,]+)",
            @"(?<!SUB\s*)TOTAL(?!\s*(?:IVA|IMPUESTOS?|ITEMS?|UNIDADES|ART[ÍI]CULOS))[^\d$]*\$?\s*([\d.,]+)",
            @"VALOR[^\d$]*\$?\s*([\d.,]+)",
            @"\$\s*([\d.,]{4,})",
        })
        {
            var m = Regex.Match(upper, pattern);
            if (!m.Success) continue;
            if (ParsearValor(m.Groups[1].Value) is { } val && val > 0) { monto = val; break; }
        }

        // ── Fecha ─────────────────────────────────────────────────────────────
        string? fecha = null;
        var mFecha = Regex.Match(texto, @"\b(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})\b");
        if (mFecha.Success)
            fecha = ArmarFecha(mFecha.Groups[1].Value, mFecha.Groups[2].Value, mFecha.Groups[3].Value);
        if (fecha is null)
        {
            // Formato colombiano: día/mes/año
            var mFecha2 = Regex.Match(texto, @"\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b");
            if (mFecha2.Success)
                fecha = ArmarFecha(mFecha2.Groups[3].Value, mFecha2.Groups[2].Value, mFecha2.Groups[1].Value);
        }
        if (fecha is null)
        {
            // "15 de marzo de 2026", "15-MAR-2026", "15 mar. 2026"
            var mFecha3 = Regex.Match(upper,
                @"\b(\d{1,2})\s*(?:DE\s+|[/\-]\s*)?(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SET|OCT|NOV|DIC)[A-Z]*\.?\s*(?:DE(?:L)?\s+|[/\-]\s*)?(\d{4})\b");
            if (mFecha3.Success)
                fecha = ArmarFecha(mFecha3.Groups[3].Value, Meses[mFecha3.Groups[2].Value].ToString(), mFecha3.Groups[1].Value);
        }

        // ── NIT ───────────────────────────────────────────────────────────────
        // Acepta "900123456-7", "900.123.456-7" o "900 123 456"; se guarda sin el dígito de verificación.
        string? nit = null;
        var mNit = Regex.Match(upper, @"\bN\.?I\.?T\.?\s*[:#.\s]*?(\d{1,3}(?:[. ]\d{3}){2,3}|\d{6,12})");
        if (mNit.Success) nit = Regex.Replace(mNit.Groups[1].Value, @"\D", "");

        // ── Número factura ────────────────────────────────────────────────────
        // El número debe tener al menos un dígito (evita tomar "DE", "NO", "VENTA"…).
        string? numeroFactura = null;
        var mFact = Regex.Match(upper,
            @"(?:FACTURA(?:\s+ELECTR[ÓO]NICA)?(?:\s+DE\s+VENTA)?|TIQUETE(?:\s+DE\s+VENTA)?|RECIBO(?:\s+DE\s+CAJA)?|FACT\.?)"
            + @"\s*(?:N[°ºO]?\.?|#)?\s*:?\s*(?=[A-Z0-9\-]*\d)([A-Z0-9][A-Z0-9\-]{1,19})");
        if (mFact.Success) numeroFactura = mFact.Groups[1].Value.Trim();

        // ── Tipo soporte ──────────────────────────────────────────────────────
        var tipoSoporte = upper.Contains("FACTURA") ? "Factura electrónica"
                        : upper.Contains("TIQUETE") ? "Recibo de caja"
                        : "Recibo de caja";

        // ── Nombre proveedor (primeras líneas) ────────────────────────────────
        var nombreProveedor = lines
            .Take(6)
            .FirstOrDefault(l => l.Length > 4
                && !Regex.IsMatch(l, @"^\d[\d\s\-\.]*$")
                && !l.ToUpper().Contains("NIT") && !l.ToUpper().Contains("TEL"));

        // ── Concepto ──────────────────────────────────────────────────────────
        string? concepto = null;
        foreach (var line in lines.Skip(3).Take(15))
        {
            if (line.Length < 5) continue;
            var lu = line.ToUpper();
            if (Regex.IsMatch(lu, @"^(TOTAL|SUBTOTAL|NIT|TEL|FAX|FECHA|DIR|WEB|GRACIAS|COPIA|RUT|IVA|FACTURA|RECIBO|TIQUETE|CLIENTE|RESOLUCI)")) continue;
            if (Regex.IsMatch(line, @"^\d{4}")) continue;
            concepto = line; break;
        }

        return new FacturaExtraidaDto(
            Fecha:           fecha,
            Monto:           monto,
            Concepto:        concepto,
            NitProveedor:    nit,
            NombreProveedor: nombreProveedor,
            NumeroFactura:   numeroFactura,
            TipoSoporte:     tipoSoporte,
            Advertencia:     monto == null && fecha == null
                ? "Datos incompletos. Revisa y corrige manualmente." : null);
    }

    /// <summary>
    /// Convierte un valor escrito a la colombiana ("1.250.000,50") o con formato inglés
    /// ("1,250,000.50"). Un separador seguido de 1 o 2 dígitos al final son los decimales;
    /// cualquier otro separador es de miles.
    /// </summary>
    public static decimal? ParsearValor(string texto)
    {
        var s = texto.Trim().Trim('.', ',');
        if (s.Length == 0) return null;
        var ultimo = s.LastIndexOfAny(['.', ',']);
        var decimales = ultimo >= 0 ? s.Length - ultimo - 1 : 0;
        string normalizado = decimales is 1 or 2
            ? Regex.Replace(s[..ultimo], @"\D", "") + "." + s[(ultimo + 1)..]
            : Regex.Replace(s, @"\D", "");
        return decimal.TryParse(normalizado, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var v)
            ? v : null;
    }

    /// <summary>Fecha ISO (yyyy-MM-dd) solo si es una fecha real del calendario.</summary>
    static string? ArmarFecha(string anio, string mes, string dia)
    {
        try { return new DateOnly(int.Parse(anio), int.Parse(mes), int.Parse(dia)).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture); }
        catch (ArgumentOutOfRangeException) { return null; }
    }
}
