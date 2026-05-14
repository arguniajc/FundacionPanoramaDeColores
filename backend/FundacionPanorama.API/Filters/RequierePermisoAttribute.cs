using System.Security.Claims;
using FundacionPanorama.Application.Features.Permisos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace FundacionPanorama.API.Filters;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = true)]
public class RequierePermisoAttribute(string modulo, string accion) : Attribute, IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;
        if (user.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var rol = user.FindFirst(ClaimTypes.Role)?.Value ?? "";
        if (rol == "administrador") return;

        var svc = context.HttpContext.RequestServices.GetRequiredService<PermisosService>();
        if (!await svc.TienePermisoAsync(rol, modulo, accion))
        {
            context.Result = new ObjectResult(new { error = $"Sin permiso: {modulo}/{accion}." })
                { StatusCode = 403 };
        }
    }
}
