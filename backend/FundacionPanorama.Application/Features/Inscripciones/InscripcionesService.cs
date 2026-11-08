using System.Text.Json;
using FundacionPanorama.Application.Features.Inscripciones.DTOs;
using FundacionPanorama.Application.Features.Inscripciones.Interfaces;
using FundacionPanorama.Application.Shared;

namespace FundacionPanorama.Application.Features.Inscripciones;

public class InscripcionesService(IInscripcionesRepository repo)
{
    private static readonly string[] EstadosValidos = ["activa", "suspendida", "completada", "baja"];

    public Task<ListaPaginada<InscripcionDto>> ListarAsync(
        Guid? programaId, Guid? beneficiarioId, string? estado, string? buscar,
        int pagina, int porPagina, CancellationToken ct = default)
    {
        (pagina, porPagina) = Paginacion.Normalizar(pagina, porPagina);
        var filtro = new FiltroInscripciones(
            programaId, beneficiarioId,
            string.IsNullOrWhiteSpace(estado) ? null : estado.Trim(),
            Paginacion.NormalizarBusqueda(buscar));
        return repo.ListarAsync(filtro, pagina, porPagina, ct);
    }

    public Task<InscripcionDto?> ObtenerAsync(Guid id, CancellationToken ct = default)
        => repo.ObtenerAsync(id, ct);

    public Task<CrearInscripcionResultado> CrearAsync(CrearInscripcionDto dto, CancellationToken ct = default)
        => repo.CrearAsync(dto, ct);

    public Task<InscripcionDto?> ActualizarAsync(Guid id, ActualizarInscripcionDto dto, CancellationToken ct = default)
        => repo.ActualizarAsync(id, dto, ct);

    public Task<CambiarEstadoInscripcionResultado> CambiarEstadoAsync(Guid id, string estado, CancellationToken ct = default)
        => repo.CambiarEstadoAsync(id, estado, ct);

    public Task<bool> EliminarAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarAsync(id, ct);

    public static bool EsEstadoValido(string estado) => EstadosValidos.Contains(estado);

    public static bool EsJsonValido(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return false;
        try { JsonDocument.Parse(json); return true; }
        catch { return false; }
    }
}
