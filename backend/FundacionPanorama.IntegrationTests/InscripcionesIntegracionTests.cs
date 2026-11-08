using FundacionPanorama.Application.Features.Inscripciones.DTOs;
using FundacionPanorama.Infrastructure.Persistence;
using FundacionPanorama.Infrastructure.Persistence.Repositories;
using FundacionPanorama.IntegrationTests.Infraestructura;

namespace FundacionPanorama.IntegrationTests;

/// <summary>Cupo máximo de programas (con concurrencia real) y reactivación de inscripciones.</summary>
[Collection(ColeccionPostgres.Nombre)]
public class InscripcionesIntegracionTests(PostgresFixture pg)
{
    static CrearInscripcionDto Dto(Guid ben, Guid prog) => new(ben, prog, """{"origen":"prueba"}""", null);

    static Task<long> ActivasAsync(DbConnectionFactory db, Guid prog) =>
        db.EscalarAsync<long>("SELECT COUNT(*) FROM inscripciones WHERE programa_id = @p AND activo = true", ("p", prog));

    [SkippableFact]
    public async Task Con_cupo_1_dos_inscripciones_simultaneas_solo_crean_una()
    {
        var db = await pg.CrearBaseAsync();
        var repo = new InscripcionesRepository(db);

        // Varias rondas: una carrera que se gana "por suerte" una vez no prueba nada
        for (var ronda = 0; ronda < 5; ronda++)
        {
            var prog = await db.CrearProgramaAsync($"Programa cupo 1 #{ronda}", 1);
            var b1 = await db.CrearBeneficiarioMinimoAsync("Ana", $"R{ronda}", $"D1-{ronda}");
            var b2 = await db.CrearBeneficiarioMinimoAsync("Luis", $"R{ronda}", $"D2-{ronda}");

            var resultados = await Task.WhenAll(
                Task.Run(() => repo.CrearAsync(Dto(b1, prog))),
                Task.Run(() => repo.CrearAsync(Dto(b2, prog))));

            Assert.Single(resultados, r => r.Error == ErrorCrearInscripcion.Ninguno);
            Assert.Single(resultados, r => r.Error == ErrorCrearInscripcion.CupoLleno);
            Assert.Equal(1, await ActivasAsync(db, prog));
        }
    }

    [SkippableFact]
    public async Task Con_cupo_N_muchas_inscripciones_simultaneas_no_lo_superan()
    {
        var db = await pg.CrearBaseAsync();
        var repo = new InscripcionesRepository(db);
        var prog = await db.CrearProgramaAsync("Programa cupo 3", 3);
        var bens = new List<Guid>();
        for (var i = 0; i < 12; i++) bens.Add(await db.CrearBeneficiarioMinimoAsync("Niño", $"N{i}", $"DOC-N{i}"));

        var resultados = await Task.WhenAll(bens.Select(b => Task.Run(() => repo.CrearAsync(Dto(b, prog)))));

        Assert.Equal(3, resultados.Count(r => r.Error == ErrorCrearInscripcion.Ninguno));
        Assert.Equal(9, resultados.Count(r => r.Error == ErrorCrearInscripcion.CupoLleno));
        Assert.Equal(3, await ActivasAsync(db, prog));
    }

    [SkippableFact]
    public async Task Reactivar_con_cupo_lleno_se_rechaza_y_con_cupo_libre_se_permite()
    {
        var db = await pg.CrearBaseAsync();
        var repo = new InscripcionesRepository(db);
        var prog = await db.CrearProgramaAsync("Programa reactivación", 1);
        var a = await db.CrearBeneficiarioMinimoAsync("Ana", "Uno", "R-A");
        var b = await db.CrearBeneficiarioMinimoAsync("Beto", "Dos", "R-B");

        var insA = await repo.CrearAsync(Dto(a, prog));
        Assert.Equal(ErrorCrearInscripcion.Ninguno, insA.Error);

        // A se retira: libera el cupo y B entra
        var retiro = await repo.CambiarEstadoAsync(insA.Inscripcion!.Id, "baja");
        Assert.Equal(ErrorCambiarEstadoInscripcion.Ninguno, retiro.Error);
        Assert.False(retiro.Inscripcion!.Activo);
        var insB = await repo.CrearAsync(Dto(b, prog));
        Assert.Equal(ErrorCrearInscripcion.Ninguno, insB.Error);

        // Reactivar a A con el cupo ocupado por B: rechazado y sin cambios
        var reactivar = await repo.CambiarEstadoAsync(insA.Inscripcion.Id, "activa");
        Assert.Equal(ErrorCambiarEstadoInscripcion.CupoLleno, reactivar.Error);
        Assert.False((await repo.ObtenerAsync(insA.Inscripcion.Id))!.Activo);
        Assert.Equal(1, await ActivasAsync(db, prog));

        // B se retira: ahora A sí puede volver
        await repo.CambiarEstadoAsync(insB.Inscripcion!.Id, "baja");
        var ok = await repo.CambiarEstadoAsync(insA.Inscripcion.Id, "activa");
        Assert.Equal(ErrorCambiarEstadoInscripcion.Ninguno, ok.Error);
        Assert.True(ok.Inscripcion!.Activo);
        Assert.Equal(1, await ActivasAsync(db, prog));
    }

    [SkippableFact]
    public async Task No_se_inscribe_dos_veces_al_mismo_beneficiario_ni_se_reactiva_un_duplicado()
    {
        var db = await pg.CrearBaseAsync();
        var repo = new InscripcionesRepository(db);
        var prog = await db.CrearProgramaAsync("Programa sin cupo", null);
        var a = await db.CrearBeneficiarioMinimoAsync("Ana", "Uno", "DUP-A");

        var primera = await repo.CrearAsync(Dto(a, prog));
        Assert.Equal(ErrorCrearInscripcion.Ninguno, primera.Error);
        Assert.Equal(ErrorCrearInscripcion.YaInscritoActivo, (await repo.CrearAsync(Dto(a, prog))).Error);

        // Se retira, se inscribe de nuevo, y la vieja ya no puede reactivarse (quedaría duplicada)
        await repo.CambiarEstadoAsync(primera.Inscripcion!.Id, "baja");
        Assert.Equal(ErrorCrearInscripcion.Ninguno, (await repo.CrearAsync(Dto(a, prog))).Error);
        var reactivar = await repo.CambiarEstadoAsync(primera.Inscripcion.Id, "activa");
        Assert.Equal(ErrorCambiarEstadoInscripcion.YaInscritoActivo, reactivar.Error);

        // Sin cupo_maximo no hay límite
        for (var i = 0; i < 5; i++)
        {
            var b = await db.CrearBeneficiarioMinimoAsync("Otro", $"B{i}", $"DUP-B{i}");
            Assert.Equal(ErrorCrearInscripcion.Ninguno, (await repo.CrearAsync(Dto(b, prog))).Error);
        }
        Assert.Equal(6, await ActivasAsync(db, prog));
    }
}
