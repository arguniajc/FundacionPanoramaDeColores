using System.Text.Json;
using FundacionPanorama.Application.Features.Sedes.DTOs;

namespace FundacionPanorama.Tests.Features;

/// <summary>Cupos de un programa: lo que el panel muestra antes de inscribir.</summary>
public class ProgramaDtoCuposTests
{
    private static ProgramaDto Programa(int? cupo, int inscritos) => new(
        Guid.NewGuid(), Guid.NewGuid(), "Sede", "Programa", null, cupo, true, false, null,
        DateTime.UtcNow, DateTime.UtcNow, false, null, null, null, null, null, null, null, null, null, null,
        inscritos);

    [Theory]
    [InlineData(40, 12, 28)]
    [InlineData(10, 10, 0)]
    [InlineData(5, 7, 0)] // si el cupo se bajó por debajo de los inscritos, no se muestra negativo
    public void CuposDisponibles_Resta_Los_Inscritos_Activos(int cupo, int inscritos, int esperado)
        => Assert.Equal(esperado, Programa(cupo, inscritos).CuposDisponibles);

    [Fact]
    public void CuposDisponibles_Es_Null_Sin_Cupo_Maximo()
        => Assert.Null(Programa(null, 3).CuposDisponibles);

    [Fact]
    public void Json_Incluye_InscritosActivos_Y_CuposDisponibles_Sin_Cambiar_Los_Existentes()
    {
        var json = JsonSerializer.Serialize(Programa(40, 12), new JsonSerializerOptions(JsonSerializerDefaults.Web));
        using var doc = JsonDocument.Parse(json);
        Assert.Equal(40, doc.RootElement.GetProperty("cupoMaximo").GetInt32());
        Assert.Equal(12, doc.RootElement.GetProperty("inscritosActivos").GetInt32());
        Assert.Equal(28, doc.RootElement.GetProperty("cuposDisponibles").GetInt32());
    }
}
