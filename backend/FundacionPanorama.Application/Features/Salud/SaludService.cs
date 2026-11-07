// Diagnóstico de la BD para api/health/db y api/health/tables.
using FundacionPanorama.Application.Features.Salud.Interfaces;

namespace FundacionPanorama.Application.Features.Salud;

public class SaludService(ISaludRepository repo)
{
    // Tablas clave cuyas columnas se listan en el diagnóstico
    private static readonly string[] TablasClave = ["inscripciones", "programas", "sedes", "programas_campos"];

    public Task<int> ContarRegistrosAsync(CancellationToken ct = default) => repo.ContarBeneficiariosAsync(ct);

    public async Task<(List<string> Tablas, Dictionary<string, List<string>> Columnas)> DiagnosticoTablasAsync(CancellationToken ct = default)
    {
        var tablas   = await repo.ListarTablasAsync(ct);
        var columnas = new Dictionary<string, List<string>>();
        foreach (var t in TablasClave.Where(tablas.Contains))
            columnas[t] = await repo.ListarColumnasAsync(t, ct);
        return (tablas, columnas);
    }
}
