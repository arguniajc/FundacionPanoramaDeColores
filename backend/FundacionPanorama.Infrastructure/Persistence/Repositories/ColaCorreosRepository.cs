using FundacionPanorama.Application.Features.Correos;
using FundacionPanorama.Application.Features.Correos.DTOs;
using FundacionPanorama.Application.Features.Correos.Interfaces;
using Npgsql;
using NpgsqlTypes;

namespace FundacionPanorama.Infrastructure.Persistence.Repositories;

/// <summary>Cola persistente de correos (cola_correos) y estado del resumen diario (resumen_diario_alertas).</summary>
public class ColaCorreosRepository(DbConnectionFactory factory) : IColaCorreosRepository
{
    const int MaxAsunto = 300;

    static string Recortar(string s, int max) => s.Length <= max ? s : s[..max];

    public async Task EncolarAsync(IEnumerable<CorreoNuevo> correos, CancellationToken ct = default)
    {
        var lista = correos.ToList();
        if (lista.Count == 0) return;
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);
        await InsertarAsync(conn, tx, lista, ct);
        await tx.CommitAsync(ct);
    }

    static async Task InsertarAsync(NpgsqlConnection conn, NpgsqlTransaction tx, List<CorreoNuevo> lista, CancellationToken ct)
    {
        foreach (var c in lista)
        {
            await using var cmd = conn.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = "INSERT INTO cola_correos (destinatarios, asunto, html) VALUES (@d, @a, @h)";
            cmd.Parameters.AddWithValue("d", c.Destinatarios);
            cmd.Parameters.AddWithValue("a", Recortar(c.Asunto, MaxAsunto));
            cmd.Parameters.Add(new NpgsqlParameter("h", NpgsqlDbType.Text) { Value = c.Html });
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }

    public async Task<IReadOnlyList<CorreoEnCola>> TomarPendientesAsync(int maximo, TimeSpan reserva, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        // La subconsulta bloquea las filas elegidas y salta las que otro proceso ya tiene
        // bloqueadas; la reserva (tomado_hasta) impide retomarlas mientras se envían.
        cmd.CommandText = """
            UPDATE cola_correos c
               SET intentos = c.intentos + 1,
                   tomado_hasta = NOW() + @reserva
             WHERE c.id IN (
                   SELECT id FROM cola_correos
                    WHERE estado = 'pendiente'
                      AND proximo_intento <= NOW()
                      AND (tomado_hasta IS NULL OR tomado_hasta < NOW())
                    ORDER BY proximo_intento
                    LIMIT @max
                    FOR UPDATE SKIP LOCKED)
            RETURNING c.id, c.destinatarios, c.asunto, c.html, c.intentos
            """;
        cmd.Parameters.AddWithValue("reserva", reserva);
        cmd.Parameters.AddWithValue("max", maximo);
        var lista = new List<CorreoEnCola>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            lista.Add(new CorreoEnCola(r.GetGuid(0), r.GetString(1), r.GetString(2), r.GetString(3), r.GetInt16(4)));
        return lista;
    }

    async Task EjecutarAsync(string sql, Action<NpgsqlCommand> parametros, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        parametros(cmd);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    public Task MarcarEnviadoAsync(Guid id, CancellationToken ct = default)
        => EjecutarAsync("""
            UPDATE cola_correos
               SET estado = 'enviado', enviado_en = NOW(), tomado_hasta = NULL, ultimo_error = NULL
             WHERE id = @id AND estado = 'pendiente'
            """, c => c.Parameters.AddWithValue("id", id), ct);

    public Task ReprogramarAsync(Guid id, TimeSpan espera, string tipoError, CancellationToken ct = default)
        => EjecutarAsync("""
            UPDATE cola_correos
               SET proximo_intento = NOW() + @espera, tomado_hasta = NULL, ultimo_error = @error
             WHERE id = @id AND estado = 'pendiente'
            """, c =>
            {
                c.Parameters.AddWithValue("id", id);
                c.Parameters.AddWithValue("espera", espera);
                c.Parameters.AddWithValue("error", Recortar(tipoError, 200));
            }, ct);

    public Task MarcarFallidoAsync(Guid id, string tipoError, CancellationToken ct = default)
        => EjecutarAsync("""
            UPDATE cola_correos
               SET estado = 'fallido', tomado_hasta = NULL, ultimo_error = @error
             WHERE id = @id AND estado = 'pendiente'
            """, c =>
            {
                c.Parameters.AddWithValue("id", id);
                c.Parameters.AddWithValue("error", Recortar(tipoError, 200));
            }, ct);

    public async Task<int> LimpiarAsync(TimeSpan antiguedadEnviados, TimeSpan antiguedadFallidos, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            DELETE FROM cola_correos
             WHERE (estado = 'enviado' AND enviado_en < NOW() - @enviados)
                OR (estado = 'fallido' AND creado_en  < NOW() - @fallidos)
            """;
        cmd.Parameters.AddWithValue("enviados", antiguedadEnviados);
        cmd.Parameters.AddWithValue("fallidos", antiguedadFallidos);
        return await cmd.ExecuteNonQueryAsync(ct);
    }

    public async Task<IReadOnlyList<UsuarioDestinatario>> ObtenerUsuariosActivosAsync(CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT email, COALESCE(nombre, ''), COALESCE(rol, '')
              FROM usuarios
             WHERE activo = true AND email IS NOT NULL AND email <> ''
            """;
        var lista = new List<UsuarioDestinatario>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            lista.Add(new UsuarioDestinatario(r.GetString(0), r.GetString(1), r.GetString(2)));
        return lista;
    }

    public async Task<ResumenDiarioConfigDto> ObtenerResumenDiarioAsync(CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT activo, hora, ultimo_envio FROM resumen_diario_alertas WHERE id = 1";
        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct)) return new ResumenDiarioConfigDto(false, ResumenDiarioService.HoraPorDefecto, null);
        return new ResumenDiarioConfigDto(
            r.GetBoolean(0),
            r.GetInt16(1),
            r.IsDBNull(2) ? null : r.GetFieldValue<DateOnly>(2));
    }

    public async Task<ResumenDiarioConfigDto> GuardarResumenDiarioAsync(GuardarResumenDiarioDto dto, CancellationToken ct = default)
    {
        await EjecutarAsync("""
            INSERT INTO resumen_diario_alertas (id, activo, hora) VALUES (1, @activo, @hora)
            ON CONFLICT (id) DO UPDATE SET activo = EXCLUDED.activo, hora = EXCLUDED.hora, actualizado_en = NOW()
            """, c =>
            {
                c.Parameters.AddWithValue("activo", dto.Activo);
                c.Parameters.Add(new NpgsqlParameter("hora", NpgsqlDbType.Smallint) { Value = (short)dto.Hora });
            }, ct);
        return await ObtenerResumenDiarioAsync(ct);
    }

    public async Task<bool> EncolarResumenDelDiaAsync(DateOnly dia, IEnumerable<CorreoNuevo> correos, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);
        await using (var marca = conn.CreateCommand())
        {
            marca.Transaction = tx;
            // Actualización condicional: solo un ciclo puede "ganar" el día
            marca.CommandText = """
                UPDATE resumen_diario_alertas
                   SET ultimo_envio = @dia
                 WHERE id = 1 AND activo = true AND (ultimo_envio IS NULL OR ultimo_envio < @dia)
                """;
            marca.Parameters.AddWithValue("dia", dia);
            if (await marca.ExecuteNonQueryAsync(ct) == 0)
            {
                await tx.RollbackAsync(ct);
                return false;
            }
        }
        await InsertarAsync(conn, tx, correos.ToList(), ct);
        await tx.CommitAsync(ct);
        return true;
    }
}
