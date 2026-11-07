using FundacionPanorama.Application.Features.Archivos.Interfaces;

namespace FundacionPanorama.Infrastructure.Persistence.Repositories;

/// <summary>SQL de la migración de archivos personales al bucket privado (api/archivos/migrar-privado y limpiar-publicos).</summary>
public class AlmacenamientoMigracionRepository(DbConnectionFactory factory) : IAlmacenamientoMigracionRepository
{
    // Los nombres salen de information_schema, pero se citan igual (comillas dobles duplicadas).
    private static string Ident(string nombre) => "\"" + nombre.Replace("\"", "\"\"") + "\"";

    public async Task<List<ColumnaConUrls>> ColumnasConPrefijoAsync(string prefijo, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);

        var columnas = new List<ColumnaConUrls>();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                SELECT c.table_name, c.column_name, c.data_type
                FROM information_schema.columns c
                JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
                WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
                  AND c.data_type IN ('text', 'character varying', 'json', 'jsonb')";
            await using var r = await cmd.ExecuteReaderAsync(ct);
            while (await r.ReadAsync(ct)) columnas.Add(new ColumnaConUrls(r.GetString(0), r.GetString(1), r.GetString(2)));
        }

        var conUrls = new List<ColumnaConUrls>();
        foreach (var c in columnas)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT EXISTS (SELECT 1 FROM {Ident(c.Tabla)} WHERE {Ident(c.Columna)}::text LIKE @p)";
            cmd.Parameters.AddWithValue("p", "%" + prefijo + "%");
            if ((bool)(await cmd.ExecuteScalarAsync(ct))!) conUrls.Add(c);
        }
        return conUrls;
    }

    public async Task<List<string>> ValoresConPrefijoAsync(string tabla, string columna, string prefijo, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"SELECT {Ident(columna)}::text FROM {Ident(tabla)} WHERE {Ident(columna)}::text LIKE @p";
        cmd.Parameters.AddWithValue("p", "%" + prefijo + "%");
        var valores = new List<string>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct)) valores.Add(r.GetString(0));
        return valores;
    }

    public async Task<int> ReemplazarAsync(ColumnaConUrls columna, string url, string referencia, CancellationToken ct = default)
    {
        var (tabla, col, tipo) = (columna.Tabla, columna.Columna, columna.Tipo);
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var upd = conn.CreateCommand();
        var cast = tipo is "json" or "jsonb" ? "::" + tipo : "";
        upd.CommandText = $"UPDATE {Ident(tabla)} SET {Ident(col)} = replace({Ident(col)}::text, @url, @ref){cast} " +
                          $"WHERE {Ident(col)}::text LIKE @like";
        upd.Parameters.AddWithValue("url",  url);
        upd.Parameters.AddWithValue("ref",  referencia);
        upd.Parameters.AddWithValue("like", "%" + url + "%");
        return await upd.ExecuteNonQueryAsync(ct);
    }
}
