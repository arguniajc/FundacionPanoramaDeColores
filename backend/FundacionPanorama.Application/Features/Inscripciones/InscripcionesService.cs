using System.Text.Json;
using FundacionPanorama.Application.Features.Inscripciones.DTOs;
using FundacionPanorama.Application.Features.Inscripciones.Interfaces;

namespace FundacionPanorama.Application.Features.Inscripciones;

public class InscripcionesService(IInscripcionesRepository repo)
{
    private static readonly string[] EstadosValidos = ["activa", "suspendida", "completada", "baja"];

    public Task<IReadOnlyList<InscripcionDto>> ListarAsync(Guid? programaId, Guid? beneficiarioId, string? estado, CancellationToken ct = default)
        => repo.ListarAsync(programaId, beneficiarioId, estado, ct);

    public Task<InscripcionDto?> ObtenerAsync(Guid id, CancellationToken ct = default)
        => repo.ObtenerAsync(id, ct);

    public Task<CrearInscripcionResultado> CrearAsync(CrearInscripcionDto dto, CancellationToken ct = default)
        => repo.CrearAsync(dto, ct);

    public Task<InscripcionDto?> ActualizarAsync(Guid id, ActualizarInscripcionDto dto, CancellationToken ct = default)
        => repo.ActualizarAsync(id, dto, ct);

    public Task<InscripcionDto?> CambiarEstadoAsync(Guid id, string estado, CancellationToken ct = default)
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
