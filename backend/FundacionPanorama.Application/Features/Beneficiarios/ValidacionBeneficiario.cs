// Validación de beneficiarios (campos obligatorios + formato), extraída de BeneficiariosController
// para poder probarla de forma aislada. El comportamiento y los mensajes son los mismos.
using FundacionPanorama.Application.Features.Beneficiarios.DTOs;

namespace FundacionPanorama.Application.Features.Beneficiarios;

public static class ValidacionBeneficiario
{
    /// <summary>Devuelve la lista de errores de validación (vacía si el DTO es válido).</summary>
    public static List<string> Validar(CrearBeneficiarioDto dto)
    {
        var e = new List<string>();
        if (string.IsNullOrWhiteSpace(dto.NumeroDocumento))       e.Add("El número de documento es obligatorio.");
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
        e.AddRange(ValidarFormatoBeneficiario(dto, esNino));
        return e;
    }

    // Mismas reglas de formato que el panel (domain/beneficiarios/validacionBeneficiario.js),
    // para que no se puedan guardar datos inválidos llamando a la API directamente.
    private static readonly string[] DocsNumericos = ["RC", "TI", "CC", "NUIP"];
    private static readonly System.Text.RegularExpressions.Regex SoloLetras =
        new(@"^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$", System.Text.RegularExpressions.RegexOptions.Compiled);

    private static IEnumerable<string> ValidarFormatoBeneficiario(CrearBeneficiarioDto dto, bool esNino)
    {
        foreach (var (valor, etiqueta) in new[]
        {
            (dto.PrimerNombre, "primer nombre"), (dto.SegundoNombre, "segundo nombre"),
            (dto.PrimerApellido, "primer apellido"), (dto.SegundoApellido, "segundo apellido"),
        })
            if (!string.IsNullOrWhiteSpace(valor) && !SoloLetras.IsMatch(valor.Trim()))
                yield return $"El {etiqueta} solo puede tener letras. Ejemplo: María.";

        var hoy  = DateOnly.FromDateTime(DateTime.UtcNow);
        var edad = hoy.Year - dto.FechaNacimiento.Year - (hoy < dto.FechaNacimiento.AddYears(hoy.Year - dto.FechaNacimiento.Year) ? 1 : 0);
        if (dto.FechaNacimiento > hoy)          yield return "La fecha de nacimiento no puede ser futura.";
        else if (edad > 110)                    yield return "La fecha de nacimiento no es válida (más de 110 años).";
        else if (esNino && edad >= 18)          yield return $"Tiene {edad} años: un niño debe ser menor de 18. Regístralo como adulto.";
        else if (!esNino && edad < 18)          yield return $"Tiene {edad} años: un adulto debe tener 18 o más. Regístralo como niño.";

        var tipoDoc = dto.TipoDocumento?.Trim() ?? "";
        if (!esNino && tipoDoc is "RC" or "TI") yield return "Un adulto no usa Registro Civil ni Tarjeta de Identidad. Usa CC, CE, PPT o PA.";
        if (esNino && tipoDoc == "CC")          yield return "Un menor de edad no tiene Cédula. Usa RC, TI o NUIP.";

        var doc = dto.NumeroDocumento?.Trim() ?? "";
        if (doc.Length > 0)
        {
            if (DocsNumericos.Contains(tipoDoc))
            {
                if (!doc.All(char.IsAsciiDigit) || doc.Length is < 6 or > 11)
                    yield return $"El documento {tipoDoc} debe tener entre 6 y 11 dígitos, sin puntos ni espacios. Ejemplo: 1144123456.";
            }
            else if (doc.Length is < 4 or > 15 || !doc.All(char.IsAsciiLetterOrDigit))
                yield return "El número de documento debe tener de 4 a 15 letras o números, sin espacios. Ejemplo: AB123456.";
        }

        if (dto.NumPersonasVive is < 1 or > 20) yield return "Las personas con quienes vive deben estar entre 1 y 20.";
        if (dto.NumHermanos     is < 0 or > 20) yield return "El número de hermanos/hijos debe estar entre 0 y 20.";

        var (pMin, pMax) = esNino ? (2m, 150m) : (30m, 250m);
        if (dto.PesoKg.HasValue && (dto.PesoKg < pMin || dto.PesoKg > pMax))
            yield return $"El peso debe estar entre {pMin} y {pMax} kg.";
        var (tMin, tMax) = esNino ? (40, 200) : (120, 230);
        if (dto.TallaCm.HasValue && (dto.TallaCm < tMin || dto.TallaCm > tMax))
            yield return $"La estatura debe estar entre {tMin} y {tMax} cm.";

        if (dto.TieneAlergia == "si" && string.IsNullOrWhiteSpace(dto.DescripcionAlergia))
            yield return "Describe la alergia. Ejemplo: Alergia al maní.";
        if (dto.TieneDiscapacidad && string.IsNullOrWhiteSpace(dto.DescripcionDiscapacidad))
            yield return "Describe la discapacidad o condición. Ejemplo: Discapacidad auditiva leve.";

        if (esNino && !string.IsNullOrWhiteSpace(dto.Whatsapp)
            && !System.Text.RegularExpressions.Regex.IsMatch(dto.Whatsapp.Trim(), @"^3\d{9}$"))
            yield return "El WhatsApp debe ser un celular de 10 dígitos que empiece por 3. Ejemplo: 3001234567.";
    }
}
