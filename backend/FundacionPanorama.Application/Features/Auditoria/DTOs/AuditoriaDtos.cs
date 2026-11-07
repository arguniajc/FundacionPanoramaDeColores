namespace FundacionPanorama.Application.Features.Auditoria.DTOs;

/// <summary>Filtros del listado de audit_log (todos opcionales).</summary>
public record FiltroAuditoria(
    string? Tipo,
    string? Usuario,
    string? Accion,
    string? Desde,
    string? Hasta);

/// <summary>Registro de audit_log. Fecha va formateada "yyyy-MM-dd HH:mm".</summary>
public record AuditoriaRegistroDto(
    string  Id,
    string  EntidadTipo,
    string? EntidadId,
    string? EntidadNombre,
    string  Accion,
    string? UsuarioEmail,
    string? Detalle,
    string  Fecha);

public record AuditoriaPaginaDto(
    int Total,
    int Pagina,
    int Tamano,
    IReadOnlyList<AuditoriaRegistroDto> Datos);
