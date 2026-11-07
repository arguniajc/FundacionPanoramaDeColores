using FundacionPanorama.Application.Features.Beneficiarios.DTOs;

namespace FundacionPanorama.Application.Features.Beneficiarios.Interfaces;

public interface IBeneficiariosRepository
{
    // Lecturas
    Task<BeneficiarioListDto>        ListarAsync(FiltroBeneficiarios filtro, int pagina, int porPagina, CancellationToken ct);
    Task<BeneficiarioStatsDto>       ObtenerStatsAsync(string? tipo, CancellationToken ct);
    Task<List<PerfilIncompletoFila>> ListarIncompletosAsync(string? tipo, CancellationToken ct);
    Task<StatsNinosDatos>            ObtenerStatsNinosAsync(CancellationToken ct);
    Task<BeneficiarioDto?>           ObtenerAsync(Guid id, CancellationToken ct);
    Task<bool>                       ExisteDocumentoAsync(string numeroDocumento, CancellationToken ct);
    Task<List<HistorialFila>>        HistorialAsync(Guid id, int limite, CancellationToken ct);

    // Escrituras (cada una en su transacción; el audit_log va dentro de la misma)
    /// <summary>Devuelve el id creado, o null si el número de documento ya existe.</summary>
    Task<Guid?>              CrearAsync(CrearBeneficiarioDto dto, string? usuarioEmail, CancellationToken ct);
    Task<EstadoActualizacion> ActualizarAsync(Guid id, CrearBeneficiarioDto dto, string? usuarioEmail, CancellationToken ct);
    /// <summary>Null si el beneficiario no existe.</summary>
    Task<BeneficiarioDto?>   DarDeBajaAsync(Guid id, string? motivo, string? detalleAudit, string? usuarioEmail, CancellationToken ct);
    /// <summary>Null si el beneficiario no existe.</summary>
    Task<BeneficiarioDto?>   ReactivarAsync(Guid id, string? usuarioEmail, CancellationToken ct);
    Task<DependenciasBeneficiario> ObtenerDependenciasAsync(Guid id, CancellationToken ct);
    Task                     EliminarAsync(Guid id, string nombre, string? usuarioEmail, CancellationToken ct);

    Task<string?> InsertarFilaImportacionAsync(CrearBeneficiarioDto dto, DateOnly fechaNacimiento, string? usuarioEmail, CancellationToken ct);
}
