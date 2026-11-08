using FundacionPanorama.Application.Features.Beneficiarios.DTOs;
using FundacionPanorama.Application.Features.Inscripciones.DTOs;
using FundacionPanorama.Infrastructure.Persistence;
using FundacionPanorama.Infrastructure.Persistence.Repositories;
using FundacionPanorama.IntegrationTests.Infraestructura;

namespace FundacionPanorama.IntegrationTests;

/// <summary>Paginación en el servidor: total, orden estable entre páginas y búsqueda con comodines literales.</summary>
[Collection(ColeccionPostgres.Nombre)]
public class PaginacionIntegracionTests(PostgresFixture pg)
{
    static readonly CancellationToken Ct = CancellationToken.None;

    /// <summary>Orden de PostgreSQL para uuid (bytes en el orden del texto) = orden ordinal del texto.</summary>
    static int CompararUuid(Guid a, Guid b) => string.CompareOrdinal(a.ToString(), b.ToString());

    sealed record Escenario(DbConnectionFactory Db, InscripcionesRepository Repo,
        Dictionary<string, List<(Guid Id, DateTime Fecha)>> PorPrograma);

    /// <summary>
    /// 25 inscripciones en 4 programas cuyos nombres llevan % y _; las fechas se repiten en bloques de 5
    /// para que el desempate por id sea lo único que decide el orden dentro de cada bloque.
    /// </summary>
    async Task<Escenario> SembrarInscripcionesAsync()
    {
        var db = await pg.CrearBaseAsync();
        var programas = new (string Nombre, int Cantidad)[]
            { ("Taller 100% arte", 10), ("Taller 1000 arte", 8), ("Club a_b", 4), ("Club axb", 3) };
        var porPrograma = new Dictionary<string, List<(Guid, DateTime)>>();
        var n = 0;
        var baseFecha = new DateTime(2024, 1, 1, 8, 0, 0, DateTimeKind.Utc);
        foreach (var (nombre, cantidad) in programas)
        {
            var prog = await db.CrearProgramaAsync(nombre, null);
            porPrograma[nombre] = [];
            for (var i = 0; i < cantidad; i++, n++)
            {
                var ben = await db.CrearBeneficiarioMinimoAsync($"Benef{n:00}", "Pag", $"PAG-{n:00}");
                var fecha = baseFecha.AddDays(n / 5);   // 5 inscripciones por fecha
                var id = await db.EscalarGuidAsync("""
                    INSERT INTO inscripciones (beneficiario_id, programa_id, estado, fecha_inscripcion, datos, activo)
                    VALUES (@b, @p, 'activa', @f, '{}', true) RETURNING id
                    """, ("b", ben), ("p", prog), ("f", fecha));
                porPrograma[nombre].Add((id, fecha));
            }
        }
        return new Escenario(db, new InscripcionesRepository(db), porPrograma);
    }

    static List<Guid> OrdenEsperado(IEnumerable<(Guid Id, DateTime Fecha)> filas)
    {
        var l = filas.ToList();
        l.Sort((a, b) => b.Fecha != a.Fecha ? b.Fecha.CompareTo(a.Fecha) : CompararUuid(a.Id, b.Id));
        return l.Select(x => x.Id).ToList();
    }

    static async Task<(int Total, List<Guid> Ids)> RecorrerAsync(InscripcionesRepository repo, string? buscar, int porPagina)
    {
        var ids = new List<Guid>();
        int total = -1;
        for (var pagina = 1; pagina < 50; pagina++)
        {
            var p = await repo.ListarAsync(new FiltroInscripciones(null, null, null, buscar), pagina, porPagina, Ct);
            if (total >= 0) Assert.Equal(total, p.Total);   // el total no depende de la página
            total = p.Total;
            Assert.Equal(pagina, p.Pagina);
            Assert.True(p.Data.Count <= porPagina);
            if (p.Data.Count == 0) break;
            ids.AddRange(p.Data.Select(d => d.Id));
        }
        return (total, ids);
    }

    [SkippableFact]
    public async Task Inscripciones_total_correcto_y_orden_estable_entre_paginas()
    {
        var e = await SembrarInscripcionesAsync();
        var esperado = OrdenEsperado(e.PorPrograma.Values.SelectMany(x => x));

        foreach (var porPagina in new[] { 10, 7, 25, 100 })
        {
            var (total, ids) = await RecorrerAsync(e.Repo, null, porPagina);
            Assert.Equal(25, total);
            Assert.Equal(esperado, ids);            // ni repetidas ni saltadas, en orden fecha DESC, id
        }

        // Una página fuera de rango viene vacía pero con el total
        var vacia = await e.Repo.ListarAsync(new FiltroInscripciones(null, null, null, null), 99, 10, Ct);
        Assert.Empty(vacia.Data);
        Assert.Equal(25, vacia.Total);
    }

    [SkippableFact]
    public async Task Inscripciones_busqueda_trata_porcentaje_y_guion_bajo_como_literales()
    {
        var e = await SembrarInscripcionesAsync();

        var (t1, ids1) = await RecorrerAsync(e.Repo, "100%", 4);
        Assert.Equal(10, t1);                               // no incluye "Taller 1000 arte"
        Assert.Equal(OrdenEsperado(e.PorPrograma["Taller 100% arte"]), ids1);

        var (t2, ids2) = await RecorrerAsync(e.Repo, "a_b", 3);
        Assert.Equal(4, t2);                                // no incluye "Club axb"
        Assert.Equal(OrdenEsperado(e.PorPrograma["Club a_b"]), ids2);

        var (t3, _) = await RecorrerAsync(e.Repo, "%", 10);
        Assert.Equal(10, t3);                               // "%" solo no es "todo"

        var (t4, _) = await RecorrerAsync(e.Repo, "TALLER", 10);
        Assert.Equal(18, t4);                               // ILIKE: sin distinguir mayúsculas

        var (t5, _) = await RecorrerAsync(e.Repo, "PAG-07", 10);
        Assert.Equal(1, t5);                                // también busca por documento del beneficiario
    }

    // ── Beneficiarios ────────────────────────────────────────────────────────

    static FiltroBeneficiarios FiltroBen(string? buscar) => new(buscar, "activos", null, null, null, null, null, null);

    [SkippableFact]
    public async Task Beneficiarios_busqueda_trata_porcentaje_y_guion_bajo_como_literales()
    {
        var db = await pg.CrearBaseAsync();
        var repo = new BeneficiariosRepository(db);
        await db.CrearBeneficiarioMinimoAsync("Ana", "Uno", "AB_1");
        await db.CrearBeneficiarioMinimoAsync("Beto", "Dos", "ABX1");
        await db.CrearBeneficiarioMinimoAsync("Caro", "Tres", "50%OFF");
        await db.CrearBeneficiarioMinimoAsync("Dani", "Cuatro", "500FF");

        Assert.Equal(1, (await repo.ListarAsync(FiltroBen("AB_1"), 1, 50, Ct)).Total);
        Assert.Equal(1, (await repo.ListarAsync(FiltroBen("50%"), 1, 50, Ct)).Total);
        Assert.Equal(1, (await repo.ListarAsync(FiltroBen("%OFF"), 1, 50, Ct)).Total);
    }

    [SkippableFact]
    public async Task Beneficiarios_orden_estable_con_fechas_de_creacion_iguales()
    {
        var db = await pg.CrearBaseAsync();
        var repo = new BeneficiariosRepository(db);
        var creados = new List<Guid>();
        for (var i = 0; i < 40; i++)
            creados.Add(await db.CrearBeneficiarioMinimoAsync($"Nombre{i:00}", "Igual", $"EST-{i:00}"));
        // Mismo instante de creación (p. ej. una importación masiva en una transacción)
        await db.EjecutarAsync("UPDATE beneficiarios SET fecha_creacion = TIMESTAMPTZ '2024-05-01 10:00:00+00'");

        var vistos = new List<Guid>();
        for (var pagina = 1; pagina <= 4; pagina++)
        {
            var p = await repo.ListarAsync(FiltroBen(null), pagina, 10, Ct);
            Assert.Equal(40, p.Total);
            vistos.AddRange(p.Data.Select(d => d.Id));
        }
        Assert.Equal(40, vistos.Distinct().Count());   // ninguna repetida ni saltada
        Assert.Equal(creados.OrderBy(g => g).ToHashSet(), vistos.ToHashSet());
    }

    [SkippableFact]
    public async Task Beneficiarios_total_y_paginas_sin_solaparse()
    {
        var db = await pg.CrearBaseAsync();
        var repo = new BeneficiariosRepository(db);
        for (var i = 0; i < 23; i++)
            await db.CrearBeneficiarioMinimoAsync($"Persona{i:00}", "Lista", $"LIS-{i:00}");
        var baja = await db.CrearBeneficiarioMinimoAsync("Dado", "DeBaja", "LIS-BAJA");
        await db.EjecutarAsync("UPDATE beneficiarios SET activo = false WHERE id = @id", ("id", baja));

        var vistos = new List<Guid>();
        for (var pagina = 1; pagina <= 3; pagina++)
        {
            var p = await repo.ListarAsync(FiltroBen(null), pagina, 10, Ct);
            Assert.Equal(23, p.Total);   // el de baja no cuenta en "activos"
            vistos.AddRange(p.Data.Select(d => d.Id));
        }
        Assert.Equal(23, vistos.Distinct().Count());
        Assert.DoesNotContain(baja, vistos);
        Assert.Equal(1, (await repo.ListarAsync(FiltroBen("persona07"), 1, 10, Ct)).Total);
    }
}
