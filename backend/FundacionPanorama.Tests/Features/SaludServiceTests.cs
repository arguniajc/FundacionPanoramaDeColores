using FundacionPanorama.Application.Features.Salud;
using FundacionPanorama.Application.Features.Salud.Interfaces;
using Moq;

namespace FundacionPanorama.Tests.Features;

public class SaludServiceTests
{
    [Fact]
    public async Task DiagnosticoTablasAsync_Lista_Columnas_Solo_De_Tablas_Clave_Existentes()
    {
        var repo = new Mock<ISaludRepository>();
        repo.Setup(r => r.ListarTablasAsync(default)).ReturnsAsync(["beneficiarios", "inscripciones", "sedes"]);
        repo.Setup(r => r.ListarColumnasAsync(It.IsAny<string>(), default))
            .ReturnsAsync((string t, CancellationToken _) => [t + "_id"]);

        var (tablas, columnas) = await new SaludService(repo.Object).DiagnosticoTablasAsync();

        Assert.Equal(["beneficiarios", "inscripciones", "sedes"], tablas);
        Assert.Equal(["inscripciones", "sedes"], columnas.Keys.ToList());
        Assert.Equal(["sedes_id"], columnas["sedes"]);
        repo.Verify(r => r.ListarColumnasAsync("beneficiarios", default), Times.Never);
    }
}
