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
            TieneAlergia = "si", DescripcionAlergia = "Alergia secreta al maní", ObservacionesSalud = "Asma secreta",
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
        var db = await pg.CrearBaseAsync();
        var repo = new BeneficiariosRepository(db);
        var id = await repo.CrearAsync(Completo("ALG-1", d => { d.TieneAlergia = "si"; d.DescripcionAlergia = "Maní"; }), null, Ct);
        var ficha = await repo.ObtenerAsync(id!.Value, Ct);
        Assert.Equal("si", ficha!.TieneAlergia);
        Assert.Equal("Maní", ficha.DescripcionAlergia);

        // Un segundo beneficiario reutiliza la alergia genérica del catálogo (rama "ya existe")
        var otro = await repo.CrearAsync(Completo("ALG-2", d => d.DescripcionAlergia = "Polen"), null, Ct);
        Assert.Equal("Polen", (await repo.ObtenerAsync(otro!.Value, Ct))!.DescripcionAlergia);
        Assert.Equal(1L, await db.EscalarAsync<long>("SELECT COUNT(*) FROM alergias_catalogo"));
    }

    static CrearBeneficiarioDto Adulto(string? doc, Action<CrearBeneficiarioDto>? ajustar = null) => Completo(doc ?? "", d =>
    {
        d.Tipo = "adulto"; d.FechaNacimiento = new(1988, 6, 1); d.TipoDocumento = "CC";
        d.NombreAcudiente = null; d.Parentesco = null; d.Whatsapp = null; d.ViveConNino = null;
        d.NombreColegio = null; d.GradoEscolar = null;
        d.Celular = "3109876543"; d.Direccion = "Carrera 7 # 8-90";
        ajustar?.Invoke(d);
    });

    [SkippableFact]
    public async Task Adulto_guarda_su_celular_y_su_direccion_y_el_listado_muestra_el_celular()
    {
        var db = await pg.CrearBaseAsync();
        var repo = new BeneficiariosRepository(db);
        var svc = new BeneficiariosService(repo);

        var creado = await svc.CrearAsync(Adulto("16123456"), null, Ct);
        Assert.Equal(EstadoResultado.Ok, creado.Estado);
        var id = creado.Valor!.Id;
        Assert.Equal("3109876543", creado.Valor.Celular);
        Assert.Equal("Carrera 7 # 8-90", creado.Valor.Direccion);   // antes se perdía (solo existía la del acudiente)

        var fila = Assert.Single((await svc.ListarAsync(1, 20, null, "activos", null, null, null, null, null, "adulto", Ct)).Data);
        Assert.Equal("3109876543", fila.Whatsapp);

        // Editar: "No registra" se guarda, no se enlaza en el listado y cuenta como faltante
        var editado = await svc.ActualizarAsync(id, Adulto("16123456", d => d.Celular = "No registra"), null, Ct);
        Assert.Equal(EstadoResultado.Ok, editado.Estado);
        Assert.Equal("No registra", editado.Valor!.Celular);
        Assert.Null(Assert.Single((await svc.ListarAsync(1, 20, null, "activos", null, null, null, null, null, "adulto", Ct)).Data).Whatsapp);
        Assert.Contains("WhatsApp", Assert.Single(await svc.ListarIncompletosAsync("adulto", Ct)).Faltantes);

        // Un niño no guarda celular propio aunque lo manden
        var nino = await svc.CrearAsync(Completo("1107000111", d => d.Celular = "3000000000"), null, Ct);
        Assert.Null(nino.Valor!.Celular);
    }

    [SkippableFact]
    public async Task Sin_documento_se_guarda_sin_numero_y_varios_pueden_no_tenerlo()
    {
        var db = await pg.CrearBaseAsync();
        var svc = new BeneficiariosService(new BeneficiariosRepository(db));

        var a = await svc.CrearAsync(Completo("", d => d.TipoDocumento = "Sin documento"), null, Ct);
        var b = await svc.CrearAsync(Completo("123", d => d.TipoDocumento = "Sin documento"), null, Ct);
        Assert.Equal(EstadoResultado.Ok, a.Estado);
        Assert.Equal(EstadoResultado.Ok, b.Estado);   // sin número no hay duplicado
        Assert.Null(a.Valor!.NumeroDocumento);
        Assert.Null(b.Valor!.NumeroDocumento);
        Assert.Equal("Sin documento", a.Valor.TipoDocumento);   // el tipo vuelve tal cual para poder editarlo
    }

    [SkippableTheory]
    [InlineData("PA", "AB123456")]
    [InlineData("RAMV", "1234567")]
    [InlineData("PEP", "PEP12345")]
    [InlineData("Sin documento", null)]
    public async Task Guardar_y_leer_conserva_el_tipo_de_documento_del_panel(string tipo, string? numero)
    {
        var db = await pg.CrearBaseAsync();
        var svc = new BeneficiariosService(new BeneficiariosRepository(db));
        var res = await svc.CrearAsync(Adulto(numero, d => d.TipoDocumento = tipo), null, Ct);
        Assert.Equal(EstadoResultado.Ok, res.Estado);
        Assert.Equal(tipo, res.Valor!.TipoDocumento);
    }

    [SkippableFact]
    public async Task Buscar_documento_devuelve_id_y_nombre_y_excluye_el_propio()
    {
        var db = await pg.CrearBaseAsync();
        var repo = new BeneficiariosRepository(db);
        var id = (await repo.CrearAsync(Completo("1107222333"), null, Ct))!.Value;

        var existente = await repo.BuscarDocumentoAsync("1107222333", null, Ct);
        Assert.Equal(id, existente!.Id);
        Assert.Equal("Sofía Isabel Prueba Integración", existente.Nombre);
        Assert.Null(await repo.BuscarDocumentoAsync("1107222333", id, Ct));
        Assert.Null(await repo.BuscarDocumentoAsync("999999999", null, Ct));
    }

    [SkippableFact]
    public async Task Listado_resumen_no_expone_datos_sensibles()
    {
        var db = await pg.CrearBaseAsync();
        var repo = new BeneficiariosRepository(db);
        var svc = new BeneficiariosService(repo);
        var id = await repo.CrearAsync(Completo("SENS-1"), "prueba@local", Ct);
        Assert.NotNull(id);

        // La ficha completa sí tiene los datos (el SQL los carga)…
        var ficha = await repo.ObtenerAsync(id!.Value, Ct);
        Assert.Equal("Calle Secreta 123", ficha!.Direccion);
        Assert.Equal("Nueva EPS Secreta", ficha.Eps);
        Assert.Equal("beneficiarios/foto-secreta.jpg", ficha.FotoMenorUrl);
        Assert.Equal("beneficiarios/doc-reverso-secreto.jpg", ficha.FotoDocumentoReversoUrl); // el reverso también se guarda

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
