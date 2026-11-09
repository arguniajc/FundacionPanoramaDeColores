// Validación de beneficiarios (campos obligatorios + formato), extraída de BeneficiariosController
// para poder probarla de forma aislada. El comportamiento y los mensajes son los mismos.
using FundacionPanorama.Application.Features.Beneficiarios.DTOs;

namespace FundacionPanorama.Application.Features.Beneficiarios;

public static class ValidacionBeneficiario
{
    /// <summary>Tipo de documento para quien no tiene ninguno: no lleva número ni se revisa si está repetido.</summary>
    public const string SinDocumento = "Sin documento";
    /// <summary>Valor que el panel guarda cuando un dato no se conoce ("→ No registra").</summary>
    public const string NoRegistra   = "No registra";

    public const string MsgDocumentoObligatorio =
        "El número de documento es obligatorio. Ejemplo: 1144123456 (si no tiene, elige el tipo \"Sin documento\").";
    public const string MsgCelularObligatorio =
        "El celular / WhatsApp del adulto es obligatorio. Ejemplo: 3001234567 (o marca \"No registra\").";
    public const string MsgCelularInvalido =
        "El celular / WhatsApp debe tener 10 dígitos y empezar por 3, sin espacios. Ejemplo: 3001234567 (o marca \"No registra\").";

    public static bool EsSinDocumento(string? tipoDocumento)
        => string.Equals(tipoDocumento?.Trim(), SinDocumento, StringComparison.OrdinalIgnoreCase);

    public static bool EsAdulto(CrearBeneficiarioDto dto)
        => string.Equals(dto.Tipo?.Trim(), "adulto", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Deja el DTO listo para guardar: con "Sin documento" el número se descarta (null) y el celular
    /// propio solo se guarda para adultos.
    /// </summary>
    public static void Normalizar(CrearBeneficiarioDto dto)
    {
        if (EsSinDocumento(dto.TipoDocumento)) { dto.TipoDocumento = SinDocumento; dto.NumeroDocumento = null; }
        else if (string.IsNullOrWhiteSpace(dto.NumeroDocumento)) dto.NumeroDocumento = null;
        else dto.NumeroDocumento = dto.NumeroDocumento.Trim();
        dto.Celular = EsAdulto(dto) && !string.IsNullOrWhiteSpace(dto.Celular) ? dto.Celular.Trim() : null;
    }

    /// <summary>Devuelve la lista de errores de validación (vacía si el DTO es válido).</summary>
    public static List<string> Validar(CrearBeneficiarioDto dto)
    {
        var e = new List<string>();
        if (string.IsNullOrWhiteSpace(dto.NumeroDocumento) && !EsSinDocumento(dto.TipoDocumento))
            e.Add(MsgDocumentoObligatorio);
        if (string.IsNullOrWhiteSpace(dto.Genero))                e.Add("El género es obligatorio.");
        if (string.IsNullOrWhiteSpace(dto.PaisNacimiento))        e.Add("El país de nacimiento es obligatorio.");
        if (string.IsNullOrWhiteSpace(dto.DepartamentoNacimiento))e.Add("El departamento es obligatorio.");
        if (string.IsNullOrWhiteSpace(dto.CiudadNacimiento))      e.Add("La ciudad es obligatoria.");
        if (string.IsNullOrWhiteSpace(dto.Barrio))                e.Add("El barrio es obligatorio.");
        if (!dto.NumPersonasVive.HasValue)                        e.Add("El N.º de personas con quienes vive es obligatorio.");
        if (!dto.NumHermanos.HasValue)                            e.Add("El N.º de hermanos es obligatorio.");
        if (string.IsNullOrWhiteSpace(dto.Eps))                   e.Add("La EPS es obligatoria.");
        if (string.IsNullOrWhiteSpace(dto.TallaCamisa))           e.Add("La talla de camisa es obligatoria.");
        if (string.IsNullOrWhiteSpace(dto.TallaPantalon))         e.Add("La talla de pantalón es obligatoria.");
        if (string.IsNullOrWhiteSpace(dto.TallaZapatos))          e.Add("La talla de zapatos es obligatoria.");
        if (!dto.PesoKg.HasValue)                                 e.Add("El peso es obligatorio.");
        if (!dto.TallaCm.HasValue)                                e.Add("La talla/altura es obligatoria.");
        var esNino = string.IsNullOrWhiteSpace(dto.Tipo) || dto.Tipo.ToLower() == "niño";
        if (esNino)
        {
            if (string.IsNullOrWhiteSpace(dto.NombreAcudiente))   e.Add("El nombre del acudiente es obligatorio.");
            if (string.IsNullOrWhiteSpace(dto.Parentesco))        e.Add("El parentesco es obligatorio.");
            if (string.IsNullOrWhiteSpace(dto.Whatsapp))          e.Add("El WhatsApp del acudiente es obligatorio.");
            if (!dto.ViveConNino.HasValue)                        e.Add("Debe indicar si el acudiente vive con el niño.");
            if (string.IsNullOrWhiteSpace(dto.Direccion))         e.Add("La dirección es obligatoria.");
        }
        else if (string.IsNullOrWhiteSpace(dto.Celular))
            e.Add(MsgCelularObligatorio);
        e.AddRange(ValidarFormatoBeneficiario(dto, esNino, incluirDescripciones: true));
        return e;
    }

    /// <summary>
    /// Solo las reglas de formato (sin campos obligatorios): cada una se aplica únicamente
    /// si el campo trae valor. No incluye "si tiene alergia/discapacidad, descríbela",
    /// porque exige un campo opcional. La usa la importación desde Excel.
    /// </summary>
    public static List<string> ValidarFormato(CrearBeneficiarioDto dto, bool esNino)
        => ValidarFormatoBeneficiario(dto, esNino, incluirDescripciones: false).ToList();

    // Mismas reglas de formato que el panel (domain/beneficiarios/validacionBeneficiario.js),
    // para que no se puedan guardar datos inválidos llamando a la API directamente.
    private static readonly string[] DocsNumericos = ["RC", "TI", "CC", "NUIP"];
    private static readonly System.Text.RegularExpressions.Regex SoloLetras =
        new(@"^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$", System.Text.RegularExpressions.RegexOptions.Compiled);

    /// <summary>Años cumplidos en <paramref name="hoy"/> por quien nació en <paramref name="fechaNacimiento"/>.</summary>
    public static int Edad(DateOnly fechaNacimiento, DateOnly hoy)
        => hoy.Year - fechaNacimiento.Year - (hoy < fechaNacimiento.AddYears(hoy.Year - fechaNacimiento.Year) ? 1 : 0);

    /// <summary>
    /// Reglas del tipo de documento y su número (las mismas de crear/editar): un adulto no usa RC/TI,
    /// un menor no usa CC, RC/TI/CC/NUIP llevan 6 a 11 dígitos y los demás 4 a 15 letras o números.
    /// Con "Sin documento" el número no se revisa. No exige el número (eso lo decide quien llama).
    /// </summary>
    public static IEnumerable<string> ValidarDocumento(string? tipoDocumento, string? numeroDocumento, bool esNino)
    {
        var tipoDoc = tipoDocumento?.Trim() ?? "";
        if (!esNino && tipoDoc is "RC" or "TI") yield return "Un adulto no usa Registro Civil ni Tarjeta de Identidad. Usa CC, CE, PPT o PA.";
        if (esNino && tipoDoc == "CC")          yield return "Un menor de edad no tiene Cédula. Usa RC, TI o NUIP.";

        // "Sin documento": el número no se revisa (se descarta al guardar)
        var doc = EsSinDocumento(tipoDoc) ? "" : numeroDocumento?.Trim() ?? "";
        if (doc.Length == 0) yield break;
        if (DocsNumericos.Contains(tipoDoc))
        {
            if (!doc.All(char.IsAsciiDigit) || doc.Length is < 6 or > 11)
                yield return $"El documento {tipoDoc} debe tener entre 6 y 11 dígitos, sin puntos ni espacios. Ejemplo: 1144123456.";
        }
        else if (doc.Length is < 4 or > 15 || !doc.All(char.IsAsciiLetterOrDigit))
            yield return "El número de documento debe tener de 4 a 15 letras o números, sin espacios. Ejemplo: AB123456.";
    }

    /// <summary>
    /// Tipo de documento probable para un beneficiario que lo perdió (tipo_documento_id NULL):
    /// sin número → "Sin documento"; con letras → null (PA, PPT, RAMV, PEP…: hay que revisarlo a mano);
    /// solo dígitos → según la edad, como el panel: RC (0 a 6 años), TI (7 a 17) o CC (18 o más).
    /// Solo sugiere un tipo que pase <see cref="ValidarDocumento"/>; si no (p. ej. 3 dígitos), null.
    /// </summary>
    public static string? SugerirTipoDocumento(string? numeroDocumento, DateOnly? fechaNacimiento, bool esNino, DateOnly hoy)
    {
        var doc = numeroDocumento?.Trim() ?? "";
        if (doc.Length == 0) return SinDocumento;
        if (!doc.All(char.IsAsciiDigit) || fechaNacimiento is null) return null;
        var edad     = Edad(fechaNacimiento.Value, hoy);
        var sugerido = edad < 7 ? "RC" : edad < 18 ? "TI" : "CC";
        return ValidarDocumento(sugerido, doc, esNino).Any() ? null : sugerido;
    }

    private static IEnumerable<string> ValidarFormatoBeneficiario(CrearBeneficiarioDto dto, bool esNino, bool incluirDescripciones)
    {
        foreach (var (valor, etiqueta) in new[]
        {
            (dto.PrimerNombre, "primer nombre"), (dto.SegundoNombre, "segundo nombre"),
            (dto.PrimerApellido, "primer apellido"), (dto.SegundoApellido, "segundo apellido"),
        })
            if (!string.IsNullOrWhiteSpace(valor) && !SoloLetras.IsMatch(valor.Trim()))
                yield return $"El {etiqueta} solo puede tener letras. Ejemplo: María.";

        var hoy  = DateOnly.FromDateTime(DateTime.UtcNow);
        var edad = Edad(dto.FechaNacimiento, hoy);
        if (dto.FechaNacimiento > hoy)          yield return "La fecha de nacimiento no puede ser futura.";
        else if (edad > 110)                    yield return "La fecha de nacimiento no es válida (más de 110 años).";
        else if (esNino && edad >= 18)          yield return $"Tiene {edad} años: un niño debe ser menor de 18. Regístralo como adulto.";
        else if (!esNino && edad < 18)          yield return $"Tiene {edad} años: un adulto debe tener 18 o más. Regístralo como niño.";

        foreach (var err in ValidarDocumento(dto.TipoDocumento, dto.NumeroDocumento, esNino))
            yield return err;

        if (dto.NumPersonasVive is < 1 or > 20) yield return "Las personas con quienes vive deben estar entre 1 y 20.";
        if (dto.NumHermanos     is < 0 or > 20) yield return "El número de hermanos/hijos debe estar entre 0 y 20.";

        var (pMin, pMax) = esNino ? (2m, 150m) : (30m, 250m);
        if (dto.PesoKg.HasValue && (dto.PesoKg < pMin || dto.PesoKg > pMax))
            yield return $"El peso debe estar entre {pMin} y {pMax} kg.";
        var (tMin, tMax) = esNino ? (40, 200) : (120, 230);
        if (dto.TallaCm.HasValue && (dto.TallaCm < tMin || dto.TallaCm > tMax))
            yield return $"La estatura debe estar entre {tMin} y {tMax} cm.";

        if (incluirDescripciones && dto.TieneAlergia == "si" && string.IsNullOrWhiteSpace(dto.DescripcionAlergia))
            yield return "Describe la alergia. Ejemplo: Alergia al maní.";
        if (incluirDescripciones && dto.TieneDiscapacidad &&string.IsNullOrWhiteSpace(dto.DescripcionDiscapacidad))
            yield return "Describe la discapacidad o condición. Ejemplo: Discapacidad auditiva leve.";

        if (esNino && !string.IsNullOrWhiteSpace(dto.Whatsapp)
            && !System.Text.RegularExpressions.Regex.IsMatch(dto.Whatsapp.Trim(), @"^3\d{9}$"))
            yield return "El WhatsApp debe ser un celular de 10 dígitos que empiece por 3. Ejemplo: 3001234567.";

        var celular = dto.Celular?.Trim() ?? "";
        if (!esNino && celular.Length > 0 && celular != NoRegistra
            && !System.Text.RegularExpressions.Regex.IsMatch(celular, @"^3\d{9}$"))
            yield return MsgCelularInvalido;
    }
}
