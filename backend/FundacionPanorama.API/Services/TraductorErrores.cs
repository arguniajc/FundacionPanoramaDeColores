using FundacionPanorama.Domain.Shared;
using Npgsql;

namespace FundacionPanorama.API.Services;

/// <summary>
/// Convierte excepciones conocidas en una respuesta clara para el usuario. Lo que no se
/// reconoce sigue siendo 500 "Error interno". Nunca devuelve detalles técnicos (tablas,
/// columnas, SQL): esos solo van al log.
/// </summary>
public static class TraductorErrores
{
    public static (int Status, string Mensaje) Traducir(Exception? ex)
    {
        if (ex is DatoInvalidoException d) return (400, d.Message);

        // Npgsql puede envolver la PostgresException (p. ej. dentro de una transacción)
        var pg = Buscar<PostgresException>(ex);
        if (pg is not null)
            return pg.SqlState switch
            {
                // 22001 string_data_right_truncation
                "22001" => (400, "Uno de los textos es demasiado largo. Acórtalo e intenta de nuevo."),
                // 23505 unique_violation
                "23505" => (409, "Ya existe un registro con esos datos. Revisa que no esté duplicado."),
                // 23503 foreign_key_violation: al guardar (dato relacionado inexistente) o al borrar (en uso)
                "23503" => pg.MessageText.Contains("update or delete", StringComparison.OrdinalIgnoreCase)
                    ? (409, "No se puede eliminar porque otros registros dependen de este.")
                    : (400, "Uno de los datos seleccionados ya no existe. Recarga la página e intenta de nuevo."),
                // 23502 not_null_violation
                "23502" => (400, "Falta un dato obligatorio. Revisa el formulario."),
                // 23514 check_violation
                "23514" => (400, "Uno de los valores no es válido. Revisa los datos del formulario."),
                // 22P02 invalid_text_representation, 22007/22008 fecha inválida, 22003 número fuera de rango
                "22P02" or "22007" or "22008" => (400, "Uno de los datos tiene un formato no válido (fecha, número o identificador)."),
                "22003" => (400, "Uno de los números es demasiado grande."),
                _ => (500, "Error interno del servidor."),
            };

        return (500, "Error interno del servidor.");
    }

    static T? Buscar<T>(Exception? ex) where T : Exception
    {
        for (var e = ex; e is not null; e = e.InnerException)
            if (e is T t) return t;
        return null;
    }
}
