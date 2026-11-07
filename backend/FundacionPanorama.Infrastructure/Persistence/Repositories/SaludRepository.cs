using FundacionPanorama.Application.Features.Salud.Interfaces;

namespace FundacionPanorama.Infrastructure.Persistence.Repositories;

/// <summary>Consultas de diagnóstico de la BD para api/health.</summary>
public class SaludRepository(DbConnectionFactory factory) : ISaludRepository
{
    public async Task<int> ContarBeneficiariosAsync(CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM beneficiarios";
        return Convert.ToInt32(await cmd.ExecuteScalarAsync(ct));
    }

    public async Task<List<string>> ListarTablasAsync(CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename";
        var tablas = new List<string>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct)) tablas.Add(r.GetString(0));
        return tablas;
    }

    public async Task<List<string>> ListarColumnasAsync(string tabla, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT column_name FROM information_schema.columns WHERE table_name = @t ORDER BY ordinal_position";
        cmd.Parameters.AddWithValue("t", tabla);
        var cols = new List<string>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct)) cols.Add(r.GetString(0));
        return cols;
    }
}
