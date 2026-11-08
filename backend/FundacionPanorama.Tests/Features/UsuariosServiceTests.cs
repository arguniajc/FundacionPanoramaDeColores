using FundacionPanorama.Application.Features.Usuarios;
using FundacionPanorama.Application.Features.Usuarios.DTOs;
using FundacionPanorama.Application.Features.Usuarios.Interfaces;
using Moq;

namespace FundacionPanorama.Tests.Features;

public class UsuariosServiceTests
{
    private readonly Mock<IUsuariosRepository> _repo = new();
    private UsuariosService Sut => new(_repo.Object);

    [Theory]
    [InlineData("Admin")]          // el filtro de permisos lo trataría como administrador
    [InlineData("superusuario")]
    [InlineData("")]
    public async Task Crear_Rechaza_Rol_Fuera_Del_Catalogo(string rol)
    {
        var r = await Sut.CrearAsync(new CrearUsuarioDto("ana@fundacion.org", "Ana", rol));
        Assert.True(r.IsFailure);
        _repo.Verify(x => x.CrearAsync(It.IsAny<CrearUsuarioDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData("sin-arroba")]
    [InlineData("ana@fundacion")]
    [InlineData("ana @fundacion.org")]
    public async Task Crear_Rechaza_Correo_Invalido(string email)
    {
        var r = await Sut.CrearAsync(new CrearUsuarioDto(email, "Ana", "tesorero"));
        Assert.True(r.IsFailure);
    }

    [Fact]
    public async Task Crear_Acepta_Rol_Del_Catalogo()
    {
        var dto = new CrearUsuarioDto("ana@fundacion.org", "Ana", "tesorero");
        _repo.Setup(x => x.CrearAsync(dto, It.IsAny<CancellationToken>()))
             .ReturnsAsync(new UsuarioDto(Guid.NewGuid(), dto.Email, dto.Nombre, null, dto.Rol, true, DateTime.UtcNow));

        var r = await Sut.CrearAsync(dto);

        Assert.True(r.IsSuccess);
    }

    [Fact]
    public async Task Actualizar_Rechaza_Rol_Fuera_Del_Catalogo()
    {
        var r = await Sut.ActualizarAsync(Guid.NewGuid(), new ActualizarUsuarioDto("Ana", "Admin", true));
        Assert.True(r.IsFailure);
        _repo.Verify(x => x.ActualizarAsync(It.IsAny<Guid>(), It.IsAny<ActualizarUsuarioDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
