using FundacionPanorama.Application.Features.Organigrama;
using FundacionPanorama.Domain.Shared;
using Moq;

namespace FundacionPanorama.Tests.Features;

public class OrganigramaServiceTests
{
    private readonly Mock<IOrganigramaRepository> _repo = new();
    private readonly OrganigramaService           _sut;

    // Árbol: A → B → C (C depende de B, B de A)
    static readonly Guid A = Guid.NewGuid(), B = Guid.NewGuid(), C = Guid.NewGuid();

    public OrganigramaServiceTests()
    {
        _sut = new(_repo.Object);
        _repo.Setup(r => r.ListarAsync(It.IsAny<CancellationToken>())).ReturnsAsync(
        [
            Nodo(A, null), Nodo(B, A), Nodo(C, B),
        ]);
        _repo.Setup(r => r.ExisteEmpleadoAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
    }

    static OrganigramaPersonaDto Nodo(Guid id, Guid? parent) => new(id, "Cargo", 0, null, null, null, null, null, parent);

    static ActualizarOrganigramaPersonaDto Mover(Guid? parentId, string? cargo = null, Guid? empleadoId = null)
        => new(cargo, null, empleadoId, null, null, parentId);

    async Task<string> Falla(Func<Task> accion) => (await Assert.ThrowsAsync<DatoInvalidoException>(accion)).Message;

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    public async Task Crear_Exige_Cargo(string cargo)
        => Assert.Contains("cargo es obligatorio", await Falla(() => _sut.CrearAsync(new(cargo, 0, null, null, null, null))));

    [Fact]
    public async Task Cargo_Maximo_200()
    {
        var largo = new string('a', 201);
        Assert.Contains("200 caracteres", await Falla(() => _sut.CrearAsync(new(largo, 0, null, null, null, null))));
        Assert.Contains("200 caracteres", await Falla(() => _sut.ActualizarAsync(A, Mover(null, cargo: largo))));
    }

    [Fact]
    public async Task No_Puede_Ser_Su_Propio_Jefe()
        => Assert.Contains("propio jefe", await Falla(() => _sut.ActualizarAsync(B, Mover(B))));

    [Fact]
    public async Task No_Puede_Quedar_Bajo_Un_Descendiente()
    {
        Assert.Contains("depende de ella", await Falla(() => _sut.ActualizarAsync(A, Mover(C))));
        Assert.Contains("depende de ella", await Falla(() => _sut.ActualizarAsync(A, Mover(B))));
        _repo.Verify(r => r.ActualizarAsync(It.IsAny<Guid>(), It.IsAny<ActualizarOrganigramaPersonaDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Jefe_Inexistente()
        => Assert.Contains("no existe", await Falla(() => _sut.ActualizarAsync(C, Mover(Guid.NewGuid()))));

    [Fact]
    public async Task Empleado_Inexistente()
    {
        var emp = Guid.NewGuid();
        _repo.Setup(r => r.ExisteEmpleadoAsync(emp, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        Assert.Contains("empleado", await Falla(() => _sut.CrearAsync(new("Directora", 0, emp, null, null, null))));
    }

    [Fact]
    public async Task Mover_A_Otra_Rama_Valida_Y_Quitar_Empleado_Si_Se_Permiten()
    {
        await _sut.ActualizarAsync(C, Mover(A));                              // C pasa a depender de A
        await _sut.ActualizarAsync(B, Mover(null, empleadoId: Guid.Empty));   // raíz y sin empleado
        _repo.Verify(r => r.ActualizarAsync(It.IsAny<Guid>(), It.IsAny<ActualizarOrganigramaPersonaDto>(), It.IsAny<CancellationToken>()), Times.Exactly(2));
        _repo.Verify(r => r.ExisteEmpleadoAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
