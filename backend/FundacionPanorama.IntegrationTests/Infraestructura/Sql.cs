using FundacionPanorama.Infrastructure.Persistence;

namespace FundacionPanorama.IntegrationTests.Infraestructura;

/// <summary>Atajos de SQL para sembrar datos y verificar lo que quedó guardado.</summary>
public static class Sql
{
    public static async Task<int> EjecutarAsync(this DbConnectionFactory db, string sql, params (string Nombre, object? Valor)[] ps)
    {
        await using var conn = db.Create();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        foreach (var (n, v) in ps) cmd.Parameters.AddWithValue(n, v ?? DBNull.Value);
        return await cmd.ExecuteNonQueryAsync();
    }

    public static async Task<T> EscalarAsync<T>(this DbConnectionFactory db, string sql, params (string Nombre, object? Valor)[] ps)
    {
        await using var conn = db.Create();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        foreach (var (n, v) in ps) cmd.Parameters.AddWithValue(n, v ?? DBNull.Value);
        var r = await cmd.ExecuteScalarAsync();
        return (T)Convert.ChangeType(r!, Nullable.GetUnderlyingType(typeof(T)) ?? typeof(T));
    }

    public static Task<Guid> CrearProgramaAsync(this DbConnectionFactory db, string nombre, int? cupo) =>
        db.EscalarGuidAsync("INSERT INTO programas (nombre, cupo_maximo) VALUES (@n, @c) RETURNING id",
            ("n", nombre), ("c", cupo));

    /// <summary>Beneficiario mínimo por SQL (para inscripciones y paginación).</summary>
    public static Task<Guid> CrearBeneficiarioMinimoAsync(this DbConnectionFactory db, string nombre, string apellido, string documento) =>
        db.EscalarGuidAsync("""
            INSERT INTO beneficiarios (primer_nombre, primer_apellido, fecha_nacimiento, numero_documento, genero,
                                       pais_nacimiento, departamento_nacimiento, ciudad_nacimiento, barrio,
                                       num_personas_vive, num_hermanos)
            VALUES (@n, @a, DATE '2015-06-01', @d, 'Femenino', 'Colombia', 'Nariño', 'Pasto', 'Centro', 3, 1)
            RETURNING id
            """, ("n", nombre), ("a", apellido), ("d", documento));

    public static Task<Guid> CrearEmpleadoAsync(this DbConnectionFactory db, string nombres, decimal? salario, bool activo = true) =>
        db.EscalarGuidAsync("""
            INSERT INTO empleados (nombres, apellidos, numero_documento, cargo, salario, activo)
            VALUES (@n, 'Prueba', @doc, 'Auxiliar', @s, @act) RETURNING id
            """, ("n", nombres), ("doc", Guid.NewGuid().ToString("N")[..10]), ("s", salario), ("act", activo));

    public static async Task<Guid> EscalarGuidAsync(this DbConnectionFactory db, string sql, params (string Nombre, object? Valor)[] ps)
    {
        await using var conn = db.Create();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        foreach (var (n, v) in ps) cmd.Parameters.AddWithValue(n, v ?? DBNull.Value);
        return (Guid)(await cmd.ExecuteScalarAsync())!;
    }
}
