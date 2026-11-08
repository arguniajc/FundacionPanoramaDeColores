using FundacionPanorama.IntegrationTests.Infraestructura;
using Xunit.Abstractions;

namespace FundacionPanorama.IntegrationTests;

[Collection(ColeccionPostgres.Nombre)]
public class EsquemaTests(PostgresFixture pg, ITestOutputHelper output)
{
    [SkippableFact]
    public async Task DbMigrations_crea_el_esquema_en_una_bd_vacia()
    {
        var db = await pg.CrearBaseAsync();
        output.WriteLine($"Fuente: {pg.Fuente}");
        output.WriteLine($"Migraciones OK: {pg.MigracionesOk.Count}; omitidas: {pg.MigracionesOmitidas.Count}");
        foreach (var m in pg.MigracionesOmitidas) output.WriteLine("  OMITIDA: " + m);

        await using var conn = db.Create();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = ANY(@t)
            """;
        string[] tablas = ["beneficiarios", "programas", "inscripciones", "cuentas_caja", "movimientos_contables",
                           "cat_contable", "empleados", "nomina_periodos", "nomina_liquidaciones", "donaciones"];
        cmd.Parameters.AddWithValue("t", tablas);
        Assert.Equal((long)tablas.Length, (long)(await cmd.ExecuteScalarAsync())!);

        await using var uuid = conn.CreateCommand();
        uuid.CommandText = "SELECT gen_random_uuid()";
        Assert.IsType<Guid>(await uuid.ExecuteScalarAsync());
    }

    [SkippableFact]
    public async Task En_bd_nueva_inscripciones_datos_queda_como_jsonb()
    {
        Bugs.Pendiente(Bugs.InscripcionesDatosTexto);
        var db = await pg.CrearBaseAsync();
        var tipo = await db.EscalarAsync<string>("""
            SELECT data_type FROM information_schema.columns
            WHERE table_name = 'inscripciones' AND column_name = 'datos'
            """);
        Assert.Equal("jsonb", tipo);
    }

    [Fact]
    public void La_guarda_rechaza_hosts_remotos_y_bases_sin_prefijo()
    {
        Assert.Throws<InvalidOperationException>(() =>
            GuardaSeguridad.Verificar("Host=aws-0-us-east-1.pooler.supabase.com;Database=panorama_it_x;Username=u"));
        Assert.Throws<InvalidOperationException>(() =>
            GuardaSeguridad.Verificar("Host=10.0.0.5;Database=panorama_it_x;Username=u"));
        Assert.Throws<InvalidOperationException>(() =>
            GuardaSeguridad.Verificar("Host=localhost;Database=postgres;Username=u"));
        Assert.Throws<InvalidOperationException>(() =>
            GuardaSeguridad.Verificar("Host=localhost,db.supabase.co;Database=panorama_it_x;Username=u"));
        GuardaSeguridad.Verificar("Host=127.0.0.1;Port=5555;Database=panorama_it_abc;Username=u");
    }
}
