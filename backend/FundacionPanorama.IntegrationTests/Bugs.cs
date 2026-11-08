namespace FundacionPanorama.IntegrationTests;

/// <summary>
/// Bugs reales que encontraron estas pruebas y que NO se han corregido en producción.
/// Cada prueba afectada empieza con <c>Bugs.Pendiente(Bugs.X)</c>: se reporta como omitida (Skip) con el motivo.
/// Para ejecutarlas igual (p. ej. al corregir el bug) define PANORAMA_IT_VERIFICAR_BUGS=1; una vez corregido,
/// quita la llamada a Pendiente y la constante para que quede como prueba de regresión.
/// </summary>
public static class Bugs
{
    public static void Pendiente(string motivo) =>
        Skip.If(Environment.GetEnvironmentVariable("PANORAMA_IT_VERIFICAR_BUGS") != "1", motivo);

    public const string EditarMovimientoAnulado =
        "BUG: ContabilidadRepository.ActualizarMovimientoAsync revierte el efecto del movimiento original aunque ya esté " +
        "anulado (la anulación ya lo revirtió): editar un anulado descuadra cuentas_caja.saldo_actual.";

    public const string EliminarMovimientoAnulado =
        "BUG: ContabilidadRepository.EliminarMovimientoAsync revierte el efecto aunque el movimiento ya esté anulado: " +
        "eliminar un anulado mueve el saldo por segunda vez.";

    public const string ConsecutivoConcurrente =
        "BUG: ContabilidadRepository.CrearMovimientoAsync calcula el consecutivo con MAX(consecutivo)+1 sin bloqueo ni " +
        "índice único: comprobantes creados a la vez reciben el mismo número.";

    public const string AutoLiquidarPisaEdicion =
        "BUG: NominaRepository.AutoLiquidarAsync, sobre una liquidación ya editada (ON CONFLICT DO UPDATE), reemplaza los " +
        "totales por los de 30 días sin novedades pero conserva dias_trabajados, horas extras, bonificaciones y " +
        "deducciones: la fila queda incoherente (neto que no corresponde a sus propios datos).";

    public const string BeneficiariosBusquedaComodines =
        "BUG: BeneficiariosRepository.ListarAsync arma el patrón con $\"%{buscar}%\" en vez de SqlLike.Contiene: " +
        "un % o _ escrito en el buscador actúa como comodín (\"AB_1\" también trae \"ABX1\").";

    public const string InscripcionesDatosTexto =
        "BUG (solo BD nueva): la migración única 'inscripciones.datos_jsonb' falla (42804: el DEFAULT '{}' de tipo text no " +
        "se puede convertir) y queda marcada como ejecutada: datos sigue siendo TEXT y no se crea el índice GIN.";

    public const string AlergiaIdUuid =
        "BUG: BeneficiariosRepository.GuardarDependientesAsync hace Convert.ToInt32(alergias_catalogo.id), pero esa columna es " +
        "UUID en todos los esquemas: crear/editar un beneficiario con TieneAlergia=\"si\" (sin alergia previa) lanza " +
        "InvalidCastException y la transacción se revierte.";

    public const string CompletitudDistinta =
        "BUG: la completitud que calcula el SQL de perfiles incompletos (BeneficiariosRepository.ListarIncompletosAsync + " +
        "servicio, siempre sobre 10) no coincide con BeneficiarioResumenDto.CalcularCompletitud (10 campos niño / 8 adulto): " +
        "el SQL no mira la EPS pero sí talla_cm, y a los adultos los divide entre 10.";
}
