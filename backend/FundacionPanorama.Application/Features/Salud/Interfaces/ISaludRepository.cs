namespace FundacionPanorama.Application.Features.Salud.Interfaces;

/// <summary>Consultas de diagnóstico de la BD para api/health.</summary>
public interface ISaludRepository
{
    Task<int> ContarBeneficiariosAsync(CancellationToken ct = default);
    Task<List<string>> ListarTablasAsync(CancellationToken ct = default);
    Task<List<string>> ListarColumnasAsync(string tabla, CancellationToken ct = default);
}
