using FundacionPanorama.Application.Features.Usuarios.DTOs;
using FundacionPanorama.Application.Features.Usuarios.Interfaces;
using FundacionPanorama.Domain.Shared;

namespace FundacionPanorama.Application.Features.Usuarios;

public class UsuariosService(IUsuariosRepository repo)
{
    public Task<UsuarioDto?> ObtenerPorEmailAsync(string email, CancellationToken ct = default)
        => repo.ObtenerPorEmailAsync(email, ct);

    public Task<IReadOnlyList<UsuarioDto>> ListarAsync(CancellationToken ct = default)
        => repo.ListarAsync(ct);

    public async Task<Result<UsuarioDto>> CrearAsync(CrearUsuarioDto dto, CancellationToken ct = default)
    {
        var existente = await repo.ObtenerPorEmailAsync(dto.Email, ct);
        if (existente is not null)
            return Result.Failure<UsuarioDto>("Ya existe un usuario con ese correo.");

        var usuario = await repo.CrearAsync(dto, ct);
        return Result.Success(usuario);
    }

    public async Task<Result<UsuarioDto>> ActualizarAsync(Guid id, ActualizarUsuarioDto dto, CancellationToken ct = default)
    {
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
