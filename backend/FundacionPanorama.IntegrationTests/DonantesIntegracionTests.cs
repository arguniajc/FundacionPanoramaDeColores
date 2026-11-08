using FundacionPanorama.Application.Features.Donantes;
using FundacionPanorama.Application.Features.Donantes.DTOs;
using FundacionPanorama.Infrastructure.Persistence.Repositories;
using FundacionPanorama.IntegrationTests.Infraestructura;

namespace FundacionPanorama.IntegrationTests;

/// <summary>Verificación de documento duplicado de donantes: la normalización SQL coincide con la de C#.</summary>
[Collection(ColeccionPostgres.Nombre)]
public class DonantesIntegracionTests(PostgresFixture pg)
{
    static CrearDonanteDto Donante(string nombre, string? documento, string? tipoDoc = null)
        => new(nombre, "empresa", documento, tipoDoc, null, null, null, null, null, null);

    [SkippableFact]
    public async Task BuscarDocumento_Ignora_Puntos_Dv_Y_Excluye_El_Propio()
    {
        var db   = await pg.CrearBaseAsync();
        var repo = new DonantesRepository(db);
        var svc  = new DonantesService(repo);

        var tornillo = await repo.CrearAsync(Donante("Ferretería El Tornillo", "900.123.456-8", "NIT"));
        var ana      = await repo.CrearAsync(Donante("Ana Gómez", "AB-123456", "PA"));
        await repo.CrearAsync(Donante("Sin documento", null));

        Assert.Equal(tornillo.Id, (await svc.BuscarDocumentoAsync("900123456", null))?.Id);
        Assert.Equal(tornillo.Id, (await svc.BuscarDocumentoAsync("900123456-8", null))?.Id);
        Assert.Equal("Ferretería El Tornillo", (await svc.BuscarDocumentoAsync(" 900.123.456 ", null))?.Nombre);
        Assert.Equal(ana.Id, (await svc.BuscarDocumentoAsync("ab123456", null))?.Id);

        Assert.Null(await svc.BuscarDocumentoAsync("900123456-8", tornillo.Id));   // al editarse a sí mismo
        Assert.Null(await svc.BuscarDocumentoAsync("90012345", null));             // otro número
    }
}
