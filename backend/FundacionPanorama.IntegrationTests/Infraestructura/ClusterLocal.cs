using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;

namespace FundacionPanorama.IntegrationTests.Infraestructura;

/// <summary>
/// Clúster PostgreSQL TEMPORAL creado con initdb en una carpeta temporal y arrancado con pg_ctl en un
/// puerto libre, escuchando SOLO en 127.0.0.1. Usa los binarios de una instalación local, pero NO toca
/// su servicio ni su carpeta de datos: el clúster es nuevo, propio y se borra al terminar.
/// </summary>
public sealed class ClusterLocal : IAsyncDisposable
{
    public const string Usuario = "panorama_test";

    readonly string _bin;
    readonly string _dir;
    public int Puerto { get; }
    bool _arrancado;

    ClusterLocal(string bin, string dir, int puerto) => (_bin, _dir, Puerto) = (bin, dir, puerto);

    /// <summary>Carpeta bin de un PostgreSQL instalado (initdb + pg_ctl), o null si no hay.</summary>
    public static string? BuscarBinarios()
    {
        var candidatos = new List<string>();
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            foreach (var v in new[] { "17", "16", "15" })
                candidatos.Add(Path.Combine(@"C:\Program Files\PostgreSQL", v, "bin"));
        }
        else
        {
            foreach (var v in new[] { "17", "16", "15" })
                candidatos.Add($"/usr/lib/postgresql/{v}/bin");
        }
        var ext = RuntimeInformation.IsOSPlatform(OSPlatform.Windows) ? ".exe" : "";
        return candidatos.FirstOrDefault(d =>
            File.Exists(Path.Combine(d, "initdb" + ext)) && File.Exists(Path.Combine(d, "pg_ctl" + ext)));
    }

    public static async Task<ClusterLocal> CrearYArrancarAsync(string bin)
    {
        var dir    = Path.Combine(Path.GetTempPath(), "panorama_it_pg_" + Guid.NewGuid().ToString("N")[..12]);
        var puerto = PuertoLibre();
        var c = new ClusterLocal(bin, dir, puerto);
        try
        {
            Directory.CreateDirectory(dir);
            var datos = Path.Combine(dir, "data");
            // Clúster nuevo: usuario de prueba, sin contraseña (trust) porque solo escucha en 127.0.0.1
            await c.EjecutarAsync("initdb",
                ["-D", datos, "-U", Usuario, "--auth=trust", "-E", "UTF8",
                 "--locale-provider=builtin", "--builtin-locale=C.UTF-8", "--locale=C", "--no-sync"],
                TimeSpan.FromMinutes(8));

            File.AppendAllText(Path.Combine(datos, "postgresql.conf"), $"""

                # ── Ajustes del clúster temporal de pruebas ──
                listen_addresses = '127.0.0.1'
                port = {puerto}
                unix_socket_directories = ''
                max_connections = 100
                fsync = off
                synchronous_commit = off
                full_page_writes = off
                """);

            await c.EjecutarAsync("pg_ctl",
                ["-D", datos, "-l", Path.Combine(dir, "postgres.log"), "-w", "-t", "60", "start"],
                TimeSpan.FromSeconds(90));
            c._arrancado = true;
            return c;
        }
        catch
        {
            await c.DisposeAsync();
            throw;
        }
    }

    static int PuertoLibre()
    {
        var l = new TcpListener(IPAddress.Loopback, 0);
        l.Start();
        var p = ((IPEndPoint)l.LocalEndpoint).Port;
        l.Stop();
        return p;
    }

    async Task EjecutarAsync(string exe, string[] args, TimeSpan timeout)
    {
        var ext = RuntimeInformation.IsOSPlatform(OSPlatform.Windows) ? ".exe" : "";
        var psi = new ProcessStartInfo(Path.Combine(_bin, exe + ext))
        {
            UseShellExecute        = false,
            CreateNoWindow         = true,
            RedirectStandardOutput = true,
            RedirectStandardError  = true,
        };
        foreach (var a in args) psi.ArgumentList.Add(a);
        // Sin variables PG* heredadas: el clúster no debe depender de la configuración del equipo
        foreach (var k in psi.Environment.Keys.Where(k => k.StartsWith("PG", StringComparison.OrdinalIgnoreCase)).ToList())
            psi.Environment.Remove(k);

        using var p = new Process { StartInfo = psi };
        var salida = new System.Text.StringBuilder();
        p.OutputDataReceived += (_, e) => { if (e.Data is not null) lock (salida) salida.AppendLine(e.Data); };
        p.ErrorDataReceived  += (_, e) => { if (e.Data is not null) lock (salida) salida.AppendLine(e.Data); };
        p.Start();
        p.BeginOutputReadLine();
        p.BeginErrorReadLine();
        // WaitForExit(int) no espera el fin de los flujos: postgres (hijo de pg_ctl) los hereda y sigue vivo
        var termino = await Task.Run(() => p.WaitForExit((int)timeout.TotalMilliseconds));
        if (!termino)
        {
            try { p.Kill(true); } catch { /* ya terminó */ }
            throw new TimeoutException($"{exe} no terminó en {timeout.TotalSeconds:0}s.\n{salida}");
        }
        if (p.ExitCode != 0)
        {
            var log = Path.Combine(_dir, "postgres.log");
            var extra = File.Exists(log) ? "\n--- postgres.log ---\n" + await File.ReadAllTextAsync(log) : "";
            throw new InvalidOperationException($"{exe} terminó con código {p.ExitCode}.\n{salida}{extra}");
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_arrancado)
        {
            try
            {
                await EjecutarAsync("pg_ctl", ["-D", Path.Combine(_dir, "data"), "-m", "immediate", "-w", "-t", "60", "stop"],
                    TimeSpan.FromSeconds(90));
            }
            catch { /* se intenta borrar igual */ }
            _arrancado = false;
        }
        for (var i = 0; i < 10 && Directory.Exists(_dir); i++)
        {
            try { Directory.Delete(_dir, recursive: true); }
            catch { await Task.Delay(500); }
        }
    }
}
