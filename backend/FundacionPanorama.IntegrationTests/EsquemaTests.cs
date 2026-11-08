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
        var db = await pg.CrearBaseAsync();
        var tipo = await db.EscalarAsync<string>("""
            SELECT data_type FROM information_schema.columns
            WHERE table_name = 'inscripciones' AND column_name = 'datos'
            """);
        Assert.Equal("jsonb", tipo);
    }

    [SkippableFact]
    public async Task En_bd_nueva_se_crean_los_indices_y_el_tipo_de_archivo_del_reverso()
    {
        var db = await pg.CrearBaseAsync();
        string[] indices = ["idx_donaciones_fecha", "idx_donaciones_programa", "idx_donaciones_sede",
                            "idx_empleados_sede", "idx_inscripciones_datos_gin", "uq_movimientos_consecutivo_anio"];
        var existentes = await db.EscalarAsync<long>(
            "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname = ANY(@i)", ("i", indices));
        Assert.Equal(indices.Length, existentes);
        Assert.Equal(1L, await db.EscalarAsync<long>(
            "SELECT COUNT(*) FROM cat_tipo_archivo WHERE nombre = 'Foto documento (reverso)'"));
    }

    [SkippableFact]
    public async Task Las_migraciones_nuevas_son_idempotentes_y_respetan_los_duplicados()
    {
        // Sobre una BD ya migrada, volver a correr DbMigrations no falla ni duplica nada
        var db = await pg.CrearBaseAsync();
        var log = new List<string>();
        await FundacionPanorama.API.Data.DbMigrations.RunAsync(CadenaSinPool(db), new LoggerLista(log));
        Assert.DoesNotContain(log, m => m.Contains("uq_consecutivo_anio") || m.Contains("bd_nueva"));

        // Con consecutivos repetidos (datos viejos), el índice no se crea: queda un aviso y el arranque sigue
        await db.EjecutarAsync("DROP INDEX uq_movimientos_consecutivo_anio");
        await db.EjecutarAsync("INSERT INTO cuentas_caja (id, nombre) VALUES ('00000000-0000-0000-0000-000000000001', 'C')");
        await db.EjecutarAsync("""
            INSERT INTO movimientos_contables (tipo, fecha, concepto, monto, cuenta_id, categoria_id, consecutivo)
            SELECT 'ingreso', DATE '2014-01-01', 'dup', 1, '00000000-0000-0000-0000-000000000001', id, 7
            FROM cat_contable WHERE codigo_puc IN ('4110', '4120')
            """);
        log.Clear();
        await FundacionPanorama.API.Data.DbMigrations.RunAsync(CadenaSinPool(db), new LoggerLista(log));
        Assert.Contains(log, m => m.Contains("uq_consecutivo_anio") && m.Contains("repetidos"));
        Assert.Equal(0L, await db.EscalarAsync<long>(
            "SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'uq_movimientos_consecutivo_anio'"));
    }

    string CadenaSinPool(FundacionPanorama.Infrastructure.Persistence.DbConnectionFactory db)
    {
        using var conn = db.Create();
        var b = new Npgsql.NpgsqlConnectionStringBuilder(conn.ConnectionString) { Pooling = false };
        GuardaSeguridad.Verificar(b.ConnectionString, pg.HostContenedor);
        return b.ConnectionString;
    }

    sealed class LoggerLista(List<string> mensajes) : Microsoft.Extensions.Logging.ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(Microsoft.Extensions.Logging.LogLevel logLevel) => true;
        public void Log<TState>(Microsoft.Extensions.Logging.LogLevel logLevel, Microsoft.Extensions.Logging.EventId eventId,
            TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (logLevel >= Microsoft.Extensions.Logging.LogLevel.Warning)
                lock (mensajes) mensajes.Add(formatter(state, exception) + " " + exception?.Message);
        }
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
