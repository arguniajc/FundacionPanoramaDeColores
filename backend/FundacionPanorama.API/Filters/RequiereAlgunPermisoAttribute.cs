using System.Security.Claims;
using FundacionPanorama.Application.Features.Permisos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace FundacionPanorama.API.Filters;

/// <summary>
/// Permite el acceso si el rol tiene AL MENOS UNO de los permisos indicados ("modulo:accion").
/// Se usa en consultas que comparten varios módulos (p. ej. la configuración completa la
/// necesitan Configuración, Donaciones —firma del recibo— y Proyectos).
/// Varios [RequierePermiso] en un mismo endpoint exigen TODOS; este atributo exige uno.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class RequiereAlgunPermisoAttribute(params string[] permisos) : Attribute, IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        if (context.HttpContext.User.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }
        if (!await Permisos.TieneAlgunoAsync(context.HttpContext, permisos))
            context.Result = new ObjectResult(new { mensaje = "No tienes permiso para ver esta información. Pide acceso a un administrador." })
                { StatusCode = 403 };
    }
}

/// <summary>Verificación de permisos reutilizable fuera de los atributos (p. ej. por carpeta de archivos).</summary>
public static class Permisos
{
    public static bool EsAdministrador(ClaimsPrincipal user) =>
        user.FindFirst(ClaimTypes.Role)?.Value is "administrador" or "Admin";

    /// <param name="permisos">Pares "modulo:accion".</param>
    public static async Task<bool> TieneAlgunoAsync(HttpContext http, IEnumerable<string> permisos)
    {
        if (EsAdministrador(http.User)) return true;
        var rol = http.User.FindFirst(ClaimTypes.Role)?.Value;
        if (string.IsNullOrEmpty(rol)) return false;

        var svc = http.RequestServices.GetRequiredService<PermisosService>();
        foreach (var p in permisos)
        {
            var partes = p.Split(':', 2);
            if (partes.Length == 2 && await svc.TienePermisoAsync(rol, partes[0], partes[1], http.RequestAborted))
                return true;
        }
        return false;
    }
}
