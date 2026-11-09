using FundacionPanorama.Application.Shared;
using FundacionPanorama.Application.Features.Beneficiarios.DTOs;

namespace FundacionPanorama.Application.Features.Beneficiarios.Interfaces;

public interface IBeneficiariosRepository
{
    // Lecturas
    Task<ListaPaginada<BeneficiarioDto>> ListarAsync(FiltroBeneficiarios filtro, int pagina, int porPagina, CancellationToken ct);
    Task<BeneficiarioStatsDto>       ObtenerStatsAsync(string? tipo, CancellationToken ct);
    Task<List<PerfilIncompletoFila>> ListarIncompletosAsync(string? tipo, CancellationToken ct);
    Task<StatsNinosDatos>            ObtenerStatsNinosAsync(CancellationToken ct);
    Task<BeneficiarioDto?>           ObtenerAsync(Guid id, CancellationToken ct);
    Task<bool>                       ExisteDocumentoAsync(string numeroDocumento, CancellationToken ct);
    /// <summary>Quién tiene ese número de documento (sin contar a <paramref name="excluirId"/>), o null.</summary>
    Task<DocumentoExistente?>        BuscarDocumentoAsync(string numeroDocumento, Guid? excluirId, CancellationToken ct);
    Task<List<HistorialFila>>        HistorialAsync(Guid id, int limite, CancellationToken ct);
    /// <summary>Beneficiarios con tipo_documento_id NULL (tipo "niño"/"adulto" filtra por edad; null = todos).</summary>
    Task<List<DocumentoBeneficiarioFila>> ListarSinTipoDocumentoAsync(string? tipo, CancellationToken ct);
    /// <summary>Datos del documento de esos beneficiarios (los que no existen no vienen).</summary>
    Task<List<DocumentoBeneficiarioFila>> ObtenerDocumentosAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct);
    /// <summary>Códigos activos de cat_tipos_documento.</summary>
    Task<List<string>>               ListarCodigosTipoDocumentoAsync(CancellationToken ct);

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
    /// <summary>Asigna el tipo de documento a todos en una sola transacción (con su audit_log). Devuelve cuántos.</summary>
    Task<int>                AsignarTiposDocumentoAsync(IReadOnlyList<CorreccionTipoDocumento> correcciones, string? usuarioEmail, CancellationToken ct);

    Task<string?> InsertarFilaImportacionAsync(CrearBeneficiarioDto dto, DateOnly fechaNacimiento, string? usuarioEmail, CancellationToken ct);
}
