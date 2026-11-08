using System.Text.Json;
using FundacionPanorama.Application.Features.Beneficiarios;
using FundacionPanorama.Application.Features.Beneficiarios.DTOs;
using FundacionPanorama.Infrastructure.Persistence.Repositories;
using FundacionPanorama.IntegrationTests.Infraestructura;

namespace FundacionPanorama.IntegrationTests;

/// <summary>Listado resumen de beneficiarios (sin datos sensibles) y completitud del perfil.</summary>
[Collection(ColeccionPostgres.Nombre)]
public class BeneficiariosIntegracionTests(PostgresFixture pg)
{
    static readonly CancellationToken Ct = CancellationToken.None;

    static CrearBeneficiarioDto Completo(string doc, Action<CrearBeneficiarioDto>? ajustar = null)
    {
        var d = new CrearBeneficiarioDto
        {
            PrimerNombre = "Sofía", SegundoNombre = "Isabel", PrimerApellido = "Prueba", SegundoApellido = "Integración",
            FechaNacimiento = new DateOnly(2016, 4, 12), TipoDocumento = "TI", NumeroDocumento = doc,
            Eps = "Nueva EPS Secreta", TallaCamisa = "10", TallaPantalon = "10", TallaZapatos = "32",
            PesoKg = 31.5m, TallaCm = 134,
            TieneAlergia = "no", DescripcionAlergia = null, ObservacionesSalud = "Asma secreta",
            TieneDiscapacidad = true, DescripcionDiscapacidad = "Discapacidad secreta",
            Tipo = "niño",
            NombreAcudiente = "Acudiente Secreto", Parentesco = "Madre", Whatsapp = "3001234567",
            Direccion = "Calle Secreta 123", ViveConNino = true,
            PaisNacimiento = "Colombia", DepartamentoNacimiento = "Nariño", CiudadNacimiento = "Pasto", Barrio = "Barrio Secreto",
            NumPersonasVive = 4, NumHermanos = 2,
            NombreColegio = "Colegio Secreto", GradoEscolar = "4",
            Genero = "Femenino", Autorizacion = true,
            FotoMenorUrl = "beneficiarios/foto-secreta.jpg", FotoDocumentoUrl = "beneficiarios/doc-secreto.jpg",
            FotoDocumentoReversoUrl = "beneficiarios/doc-reverso-secreto.jpg",
        };
        ajustar?.Invoke(d);
        return d;
    }

    [SkippableFact]
    public async Task Crear_beneficiario_con_alergia_guarda_la_alergia()
    {
        Bugs.Pendiente(Bugs.AlergiaIdUuid);
        var db = await pg.CrearBaseAsync();
        var repo = new BeneficiariosRepository(db);
        var id = await repo.CrearAsync(Completo("ALG-1", d => { d.TieneAlergia = "si"; d.DescripcionAlergia = "Maní"; }), null, Ct);
        var ficha = await repo.ObtenerAsync(id!.Value, Ct);
        Assert.Equal("si", ficha!.TieneAlergia);
        Assert.Equal("Maní", ficha.DescripcionAlergia);
    }

    [SkippableFact]
    public async Task Listado_resumen_no_expone_datos_sensibles()
    {
        var db = await pg.CrearBaseAsync();
        var repo = new BeneficiariosRepository(db);
        var svc = new BeneficiariosService(repo);
        var id = await repo.CrearAsync(Completo("SENS-1"), "prueba@local", Ct);
        Assert.NotNull(id);
        // La alergia se siembra por SQL: crearla con TieneAlergia="si" falla (ver Bugs.AlergiaIdUuid)
        await db.EjecutarAsync("""
            WITH cat AS (INSERT INTO alergias_catalogo (nombre) VALUES ('Maní') RETURNING id)
            INSERT INTO beneficiario_alergia (beneficiario_id, alergia_id, descripcion, activo)
            SELECT @b, id, 'Alergia secreta al maní', true FROM cat
            """, ("b", id!.Value));

        // La ficha completa sí tiene los datos (el SQL los carga)…
        var ficha = await repo.ObtenerAsync(id!.Value, Ct);
        Assert.Equal("Calle Secreta 123", ficha!.Direccion);
        Assert.Equal("Nueva EPS Secreta", ficha.Eps);
        Assert.Equal("beneficiarios/foto-secreta.jpg", ficha.FotoMenorUrl);

        // …pero el listado de pantallas no los deja salir
        var lista = await svc.ListarAsync(1, 20, null, "activos", null, null, null, null, null, null, Ct);
        var fila = Assert.Single(lista.Data);
        Assert.Equal(id, fila.Id);
        Assert.True(fila.TieneFotoMenor);
        Assert.True(fila.TieneFotoDocumento);
        Assert.Equal("si", fila.TieneAlergia);

        var json = JsonSerializer.Serialize(lista, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        foreach (var secreto in new[] { "Secret", "secret", "maní", "foto-secreta", "doc-secreto", "Calle" })
            Assert.DoesNotContain(secreto, json);
        using var doc = JsonDocument.Parse(json);
        var props = doc.RootElement.GetProperty("data")[0].EnumerateObject().Select(p => p.Name.ToLowerInvariant()).ToHashSet();
        foreach (var prohibido in new[] { "direccion", "eps", "descripcionalergia", "observacionessalud", "nombreacudiente",
                                          "fotomenorurl", "fotodocumentourl", "fotodocumentoreversourl", "descripciondiscapacidad",
                                          "barrio", "nombrecolegio", "parentesco" })
            Assert.DoesNotContain(prohibido, props);
    }

    [SkippableFact]
    public async Task Completitud_del_SQL_de_incompletos_coincide_con_la_regla_del_resumen()
    {
        Bugs.Pendiente(Bugs.CompletitudDistinta);
        var db = await pg.CrearBaseAsync();
        var repo = new BeneficiariosRepository(db);
        var svc = new BeneficiariosService(repo);

        var perfiles = new Dictionary<string, CrearBeneficiarioDto>
        {
            ["niño completo"]               = Completo("COMP-1"),
            ["niño sin EPS"]                = Completo("COMP-2", d => d.Eps = "No registra"),
            ["niño sin talla en cm"]        = Completo("COMP-3", d => d.TallaCm = 0),
            ["niño sin foto doc ni colegio"] = Completo("COMP-4", d => { d.FotoDocumentoUrl = null; d.NombreColegio = "No registra"; }),
            ["adulto completo"]             = Completo("COMP-5", d => { d.Tipo = "adulto"; d.FechaNacimiento = new(1990, 1, 1); d.NombreColegio = null; d.GradoEscolar = null; }),
            ["adulto sin whatsapp"]         = Completo("COMP-6", d => { d.Tipo = "adulto"; d.FechaNacimiento = new(1990, 1, 1); d.NombreColegio = null; d.GradoEscolar = null; d.Whatsapp = null; }),
        };
        var ids = new Dictionary<Guid, string>();
        foreach (var (nombre, dto) in perfiles)
            ids[(await repo.CrearAsync(dto, null, Ct))!.Value] = nombre;

        // Regla del servicio (resumen del listado)
        var resumen = (await svc.ListarAsync(1, 50, null, "activos", null, null, null, null, null, null, Ct)).Data
            .ToDictionary(r => r.Id, r => r.Completitud);
        // Cálculo en SQL (perfiles incompletos); quien no aparece está al 100 %
        var incompletos = (await svc.ListarIncompletosAsync(null, Ct)).ToDictionary(p => p.Id, p => p.Completitud);

        var diferencias = ids
            .Select(kv => (Perfil: kv.Value, Resumen: resumen[kv.Key], Sql: incompletos.GetValueOrDefault(kv.Key, 100)))
            .Where(x => x.Resumen != x.Sql)
            .Select(x => $"{x.Perfil}: resumen={x.Resumen}% sql={x.Sql}%")
            .ToList();
        Assert.True(diferencias.Count == 0, "Completitud distinta:\n" + string.Join("\n", diferencias));
    }
}
