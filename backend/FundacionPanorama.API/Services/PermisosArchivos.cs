namespace FundacionPanorama.API.Services;

/// <summary>
/// Qué permiso ("modulo:accion") hace falta para subir o abrir un archivo según su carpeta.
/// Basta con tener UNO de la lista. Una carpeta desconocida devuelve lista vacía: solo el
/// administrador puede usarla.
/// </summary>
public static class PermisosArchivos
{
    // Fotos y documentos de los menores: datos sensibles (Ley 1581)
    static readonly string[] LeerBeneficiarios = ["beneficiarios:ver"];

    public static string[] ParaSubir(string carpeta) => Carpeta(carpeta) switch
    {
        "web"                        => ["configuracion:editar"],
        "fotos" or "documentos"      => ["beneficiarios:crear", "beneficiarios:editar"],
        "documentos-beneficiarios"   => ["documentos:crear", "beneficiarios:editar"],
        "documentos-institucionales" => ["documentos:crear", "documentos:editar"],
        "inscripciones"              => ["inscripciones:crear", "inscripciones:editar"],
        "organigrama"                => ["talento_humano:crear", "talento_humano:editar"],
        _                            => [],
    };

    /// <param name="ruta">Ruta dentro del bucket privado ("carpeta/archivo"), sin "privado://".</param>
    public static string[] ParaLeer(string ruta)
    {
        if (!RutaSegura(ruta)) return [];
        return Carpeta(ruta) switch
        {
            "fotos" or "documentos" or "documentos-beneficiarios" => LeerBeneficiarios,
            "documentos-institucionales" => ["documentos:ver"],
            "inscripciones"              => ["inscripciones:ver"],
            "organigrama"                => ["talento_humano:ver"],
            _                            => [],
        };
    }

    /// <summary>Sin "..", sin barras iniciales ni invertidas: evita salir de la carpeta.</summary>
    public static bool RutaSegura(string ruta) =>
        !string.IsNullOrWhiteSpace(ruta) && !ruta.Contains("..") && !ruta.StartsWith('/') && !ruta.Contains('\\');

    // "documentos-beneficiarios/{id}/archivo.pdf" → "documentos-beneficiarios"
    static string Carpeta(string ruta) => ruta.Split('/', 2)[0];
}
