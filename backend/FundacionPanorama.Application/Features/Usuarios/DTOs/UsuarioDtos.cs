namespace FundacionPanorama.Application.Features.Usuarios.DTOs;

public record UsuarioDto(
    Guid    Id,
    string  Email,
    string? Nombre,
    string? AvatarUrl,
    string  Rol,
    bool    Activo,
    DateTime FechaCreacion);

public record CrearUsuarioDto(
    string Email,
    string? Nombre,
    string Rol);

public record ActualizarUsuarioDto(
    string? Nombre,
    string  Rol,
    bool    Activo);
