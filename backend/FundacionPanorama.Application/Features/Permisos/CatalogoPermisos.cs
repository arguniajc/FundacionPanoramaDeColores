namespace FundacionPanorama.Application.Features.Permisos;

/// <summary>
/// Valores permitidos de rol, módulo y acción. Evita que se guarden roles inventados
/// (p. ej. "Admin", que el filtro de permisos trata como administrador) o permisos basura.
/// Debe coincidir con ROLES de EquipoPage.jsx y MODULOS de SeguridadPage.jsx.
/// </summary>
public static class CatalogoPermisos
{
    public const string Administrador = "administrador";

    public static readonly IReadOnlySet<string> Roles = new HashSet<string>
    {
        Administrador, "representante_legal", "sistemas", "coordinador_programas", "trabajador_social",
        "tesorero", "contador", "secretario", "talento_humano", "auditor",
    };

    public static readonly IReadOnlySet<string> Modulos = new HashSet<string>
    {
        "dashboard", "beneficiarios", "donantes", "donaciones", "programas", "inscripciones", "sedes",
        "actividades", "voluntarios", "talento_humano", "contabilidad", "inventario", "reportes",
        "documentos", "log_descargas", "configuracion", "seguridad", "equipo",
    };

    public static readonly IReadOnlySet<string> Acciones = new HashSet<string>
    {
        "ver", "crear", "editar", "eliminar", "exportar", "autorizar",
    };

    /// <summary>Módulos que permiten repartir accesos: solo el administrador puede otorgarlos.</summary>
    public static readonly IReadOnlySet<string> ModulosDeAdministracion = new HashSet<string> { "seguridad", "equipo" };
}
