namespace FundacionPanorama.Domain.Shared;

/// <summary>
/// Error de datos que el usuario puede corregir. El manejador global de la API lo responde
/// como 400 con este mensaje tal cual, así que debe estar escrito para el usuario final.
/// </summary>
public class DatoInvalidoException(string mensaje) : Exception(mensaje);
