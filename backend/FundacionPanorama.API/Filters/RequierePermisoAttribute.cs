using System.Security.Claims;
using FundacionPanorama.Application.Features.Permisos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace FundacionPanorama.API.Filters;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = true)]
public class RequierePermisoAttribute(string modulo, string accion) : Attribute, IAsyncAuthorizationFilter
{
    public string Modulo => modulo;
    public string Accion => accion;

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;
        if (user.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var rol = user.FindFirst(ClaimTypes.Role)?.Value ?? "";
        // Un token sin rol ya no se trata como administrador: todos los tokens emitidos llevan rol
        if (rol is "administrador" or "Admin") return;
        if (string.IsNullOrEmpty(rol))
        {
            context.Result = new ObjectResult(new { mensaje = "Tu sesión no tiene un rol asignado. Vuelve a iniciar sesión." }) { StatusCode = 403 };
            return;
        }

        var svc = context.HttpContext.RequestServices.GetRequiredService<PermisosService>();
        if (!await svc.TienePermisoAsync(rol, modulo, accion))
        {
            context.Result = new ObjectResult(new { mensaje = $"No tienes permiso para {accion} en {modulo}. Pide acceso a un administrador." })
                { StatusCode = 403 };
        }
    }
}
