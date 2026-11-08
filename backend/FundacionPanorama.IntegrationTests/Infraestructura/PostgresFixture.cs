using FundacionPanorama.API.Data;
using FundacionPanorama.Infrastructure.Persistence;
using Microsoft.Extensions.Logging;
using Npgsql;
using Testcontainers.PostgreSql;

namespace FundacionPanorama.IntegrationTests.Infraestructura;

/// <summary>
/// PostgreSQL temporal compartido por todas las pruebas de integración.
/// Orden de fuentes: 1) Testcontainers (Docker); 2) clúster temporal con initdb/pg_ctl de un PostgreSQL
/// instalado; 3) ninguna → las pruebas se omiten (Skip) sin fallar, salvo que PANORAMA_IT_REQUERIR=1
/// (CI), en cuyo caso fallan.
/// El esquema se crea UNA vez con DbMigrations.RunAsync en una base plantilla; cada prueba recibe una
/// base nueva clonada de ella (CREATE DATABASE ... TEMPLATE), así no comparten datos.
/// NUNCA se leen appsettings ni cadenas de conexión del entorno: todo se construye aquí.
/// </summary>
public sealed class PostgresFixture : IAsyncLifetime
{
    const string Plantilla = GuardaSeguridad.PrefijoBd + "plantilla";

    PostgreSqlContainer? _contenedor;
    ClusterLocal? _cluster;
    string? _hostContenedor;
    NpgsqlConnectionStringBuilder? _base;   // host/puerto/usuario del servidor temporal
    readonly SemaphoreSlim _crearBd = new(1, 1);

    public bool   Disponible { get; private set; }
    public string Motivo     { get; private set; } = "";
    public string Fuente     { get; private set; } = "ninguna";
    /// <summary>Migraciones que DbMigrations registró como omitidas (warning) sobre la BD vacía.</summary>
    public List<string> MigracionesOmitidas { get; } = [];
    public List<string> MigracionesOk { get; } = [];

    static bool Requerida => Environment.GetEnvironmentVariable("PANORAMA_IT_REQUERIR") == "1";
    /// <summary>auto (por defecto) | docker | local: solo elige la fuente, nunca contiene una conexión.</summary>
    static string FuentePreferida => (Environment.GetEnvironmentVariable("PANORAMA_IT_FUENTE") ?? "auto").ToLowerInvariant();

    public async Task InitializeAsync()
    {
        var errores = new List<string>();

        if (FuentePreferida is "auto" or "docker")
        {
            try
            {
                await IniciarDockerAsync();
            }
            catch (Exception ex)
            {
                errores.Add("Docker/Testcontainers: " + ex.GetBaseException().Message);
                await LimpiarDockerAsync();
            }
        }

        if (_base is null && FuentePreferida is "auto" or "local")
        {
            var bin = ClusterLocal.BuscarBinarios();
            if (bin is null) errores.Add("PostgreSQL local: no se encontraron initdb/pg_ctl.");
            else
            {
                try
                {
                    _cluster = await ClusterLocal.CrearYArrancarAsync(bin);
                    _base = new NpgsqlConnectionStringBuilder
                    {
                        Host = "127.0.0.1", Port = _cluster.Puerto,
                        Username = ClusterLocal.Usuario, Password = "prueba_no_usada",
                    };
                    Fuente = $"clúster temporal initdb/pg_ctl ({bin}, 127.0.0.1:{_cluster.Puerto})";
                }
                catch (Exception ex)
                {
                    errores.Add("PostgreSQL local: " + ex.Message);
                    if (_cluster is not null) await _cluster.DisposeAsync();
                    _cluster = null;
                }
            }
        }

        if (_base is null)
        {
            Motivo = "No hay PostgreSQL temporal disponible (" + string.Join(" | ", errores) + ")";
            if (Requerida) throw new InvalidOperationException(Motivo);
            return;
        }

        _base.Pooling = true;
        _base.MaxPoolSize = 30;
        _base.Timeout = 30;
        _base.CommandTimeout = 120;
        _base.IncludeErrorDetail = true;

        await PrepararPlantillaAsync();
        Disponible = true;
    }

    async Task IniciarDockerAsync()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(3));
        _contenedor = new PostgreSqlBuilder("postgres:17-alpine")
            .WithDatabase(GuardaSeguridad.PrefijoBd + "admin")
            .WithUsername("panorama_test")
            .WithPassword("prueba_" + Guid.NewGuid().ToString("N")[..10])
            .WithCleanUp(true)
            .Build();
        await _contenedor.StartAsync(cts.Token);
        var cs = new NpgsqlConnectionStringBuilder(_contenedor.GetConnectionString());
        _hostContenedor = cs.Host;
        _base = new NpgsqlConnectionStringBuilder
        {
            Host = cs.Host, Port = cs.Port, Username = cs.Username, Password = cs.Password,
        };
        Fuente = $"Testcontainers (postgres:17-alpine en {cs.Host}:{cs.Port})";
    }

    async Task LimpiarDockerAsync()
    {
        if (_contenedor is null) return;
        try { await _contenedor.DisposeAsync(); } catch { /* sin Docker */ }
        _contenedor = null;
        _base = null;
    }

    string Cadena(string bd, bool pooling = true)
    {
        var b = new NpgsqlConnectionStringBuilder(_base!.ConnectionString) { Database = bd, Pooling = pooling };
        var cs = b.ConnectionString;
        GuardaSeguridad.Verificar(cs, _hostContenedor);
        return cs;
    }

    /// <summary>Conexión de administración (crear bases); también pasa por la guarda.</summary>
    async Task<NpgsqlConnection> AbrirAdminAsync()
    {
        // La BD 'postgres' del clúster temporal no tiene el prefijo; se valida el host y se conecta
        var adminBd = _contenedor is not null ? GuardaSeguridad.PrefijoBd + "admin" : "postgres";
        var b = new NpgsqlConnectionStringBuilder(_base!.ConnectionString) { Database = adminBd, Pooling = false };
        GuardaSeguridad.VerificarHost(b.ConnectionString, _hostContenedor);
        var conn = new NpgsqlConnection(b.ConnectionString);
        await conn.OpenAsync();
        return conn;
    }

    async Task PrepararPlantillaAsync()
    {
        await using (var admin = await AbrirAdminAsync())
        await using (var cmd = admin.CreateCommand())
        {
            cmd.CommandText = $"CREATE DATABASE {Plantilla}";
            await cmd.ExecuteNonQueryAsync();
        }

        // Sin pool: la plantilla no puede tener conexiones abiertas cuando se clona
        var logger = new LoggerMigraciones(MigracionesOk, MigracionesOmitidas);
        await DbMigrations.RunAsync(Cadena(Plantilla, pooling: false), logger);
        if (MigracionesOk.Count == 0)
            throw new InvalidOperationException("DbMigrations no aplicó ninguna migración: " + string.Join("\n", MigracionesOmitidas));
        NpgsqlConnection.ClearAllPools();
    }

    /// <summary>Base nueva con el esquema completo, exclusiva de quien la pide.</summary>
    public async Task<DbConnectionFactory> CrearBaseAsync()
    {
        Skip.IfNot(Disponible, Motivo);
        var nombre = GuardaSeguridad.PrefijoBd + Guid.NewGuid().ToString("N")[..16];
        await _crearBd.WaitAsync();
        try
        {
            await using var admin = await AbrirAdminAsync();
            await using var cmd = admin.CreateCommand();
            cmd.CommandText = $"CREATE DATABASE {nombre} TEMPLATE {Plantilla} STRATEGY = FILE_COPY";
            await cmd.ExecuteNonQueryAsync();
        }
        finally { _crearBd.Release(); }
        return new DbConnectionFactory(Cadena(nombre));
    }

    public async Task DisposeAsync()
    {
        NpgsqlConnection.ClearAllPools();
        if (_cluster is not null) await _cluster.DisposeAsync();
        await LimpiarDockerAsync();
    }

    /// <summary>Logger mínimo para DbMigrations: separa migraciones OK de las omitidas por error.</summary>
    sealed class LoggerMigraciones(List<string> ok, List<string> omitidas) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            var msg = formatter(state, exception);
            lock (ok)
            {
                if (logLevel >= LogLevel.Warning) omitidas.Add(msg);
                else ok.Add(msg);
            }
        }
    }
}

[CollectionDefinition(Nombre)]
public sealed class ColeccionPostgres : ICollectionFixture<PostgresFixture>
{
    public const string Nombre = "Postgres temporal";
}
