using FundacionPanorama.Application.Features.Usuarios.DTOs;

namespace FundacionPanorama.Application.Features.Usuarios.Interfaces;

public interface IUsuariosRepository
{
    Task<UsuarioDto?> ObtenerPorEmailAsync(string email, CancellationToken ct = default);
    Task<IReadOnlyList<UsuarioDto>> ListarAsync(CancellationToken ct = default);
    Task<UsuarioDto> CrearAsync(CrearUsuarioDto dto, CancellationToken ct = default);
    Task<UsuarioDto?> ActualizarAsync(Guid id, ActualizarUsuarioDto dto, CancellationToken ct = default);
    Task<bool> EliminarAsync(Guid id, CancellationToken ct = default);
    Task<UsuarioDto> UpsertAsync(string email, string nombre, string? avatarUrl, string rol, CancellationToken ct = default);
}
