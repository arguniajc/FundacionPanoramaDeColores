using System.Text.RegularExpressions;
using FundacionPanorama.Application.Features.Permisos;
using FundacionPanorama.Application.Features.Usuarios.DTOs;
using FundacionPanorama.Application.Features.Usuarios.Interfaces;
using FundacionPanorama.Domain.Shared;

namespace FundacionPanorama.Application.Features.Usuarios;

public class UsuariosService(IUsuariosRepository repo)
{
    public Task<UsuarioDto?> ObtenerPorEmailAsync(string email, CancellationToken ct = default)
        => repo.ObtenerPorEmailAsync(email, ct);

    /// <summary>Incluye usuarios inactivos: sirve para negarles el acceso.</summary>
    public Task<UsuarioDto?> BuscarPorEmailAsync(string email, CancellationToken ct = default)
        => repo.BuscarPorEmailAsync(email, ct);

    public Task<IReadOnlyList<UsuarioDto>> ListarAsync(CancellationToken ct = default)
        => repo.ListarAsync(ct);

    static readonly Regex EmailValido = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+\z", RegexOptions.Compiled);

    /// <summary>Rol del catálogo y nombre dentro de la columna (VARCHAR 200).</summary>
    static string? ValidarRolYNombre(string? rol, string? nombre)
    {
        if (string.IsNullOrWhiteSpace(rol) || !CatalogoPermisos.Roles.Contains(rol))
            return "El rol no es válido. Elige uno de la lista.";
        if (nombre is { Length: > 200 })
            return "El nombre no puede superar 200 caracteres.";
        return null;
    }

    public async Task<Result<UsuarioDto>> CrearAsync(CrearUsuarioDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || dto.Email.Length > 200 || !EmailValido.IsMatch(dto.Email.Trim()))
            return Result.Failure<UsuarioDto>("El correo no es válido. Ejemplo: nombre@fundacion.org");
        if (ValidarRolYNombre(dto.Rol, dto.Nombre) is { } error)
            return Result.Failure<UsuarioDto>(error);

        var existente = await repo.ObtenerPorEmailAsync(dto.Email, ct);
        if (existente is not null)
            return Result.Failure<UsuarioDto>("Ya existe un usuario con ese correo.");

        var usuario = await repo.CrearAsync(dto, ct);
        return Result.Success(usuario);
    }

    public async Task<Result<UsuarioDto>> ActualizarAsync(Guid id, ActualizarUsuarioDto dto, CancellationToken ct = default)
    {
        if (ValidarRolYNombre(dto.Rol, dto.Nombre) is { } error)
            return Result.Failure<UsuarioDto>(error);

        var usuario = await repo.ActualizarAsync(id, dto, ct);
        return usuario is null
            ? Result.Failure<UsuarioDto>("Usuario no encontrado.")
            : Result.Success(usuario);
    }

    public async Task<Result> EliminarAsync(Guid id, CancellationToken ct = default)
    {
        var ok = await repo.EliminarAsync(id, ct);
        return ok ? Result.Success() : Result.Failure("Usuario no encontrado.");
    }

    // Llamado en login: si el email está en appsettings-admin, se auto-crea como administrador
    public Task<UsuarioDto> UpsertAdminAsync(string email, string nombre, string? avatarUrl, CancellationToken ct = default)
        => repo.UpsertAsync(email, nombre, avatarUrl, "administrador", ct);
}
