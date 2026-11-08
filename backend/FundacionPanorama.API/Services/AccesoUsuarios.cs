using FundacionPanorama.Application.Features.Usuarios;
using Microsoft.Extensions.Caching.Memory;

namespace FundacionPanorama.API.Services;

/// <summary>
/// Rol vigente de un usuario según la BD (no según su token). Se consulta al validar cada
/// petición, así que desactivar a alguien o cambiarle el rol surte efecto en máximo un
/// minuto (caché) en lugar de esperar a que venza su token.
/// </summary>
public class AccesoUsuarios(UsuariosService usuarios, AuthService auth, IMemoryCache cache)
{
    static readonly TimeSpan Duracion = TimeSpan.FromMinutes(1);
    static string Clave(string email) => "acceso:" + email.Trim().ToLowerInvariant();

    /// <summary>
    /// Devuelve el rol con el que puede entrar, o null si no tiene acceso.
    /// Un usuario inactivo queda bloqueado aunque esté en la lista de administradores de arranque.
    /// </summary>
    public async Task<string?> RolVigenteAsync(string email, CancellationToken ct = default)
    {
        if (cache.TryGetValue(Clave(email), out string? rol)) return rol;

        var usuario = await usuarios.BuscarPorEmailAsync(email, ct);
        rol = usuario is not null
            ? (usuario.Activo ? usuario.Rol : null)
            : (auth.EsAdminBootstrap(email) ? "administrador" : null);

        cache.Set(Clave(email), rol, Duracion);
        return rol;
    }

    /// <summary>Tras editar o eliminar un usuario: el cambio aplica en la siguiente petición.</summary>
    public void Invalidar(string email) => cache.Remove(Clave(email));
}
