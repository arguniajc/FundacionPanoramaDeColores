namespace FundacionPanorama.Application.Features.Alertas.DTOs;

/// <summary>Conteos crudos que alimentan las alertas.</summary>
public record ConteosAlertas(
    int ContratosProximos,
    int NovedadesPendientes,
    int StockBajo,
    int SinStock,
    int ComodatosProximos         = 0,
    int PresupuestoSobreEjecutado = 0);

/// <param name="Modulo">Módulo de permisos al que pertenece (solo la ve quien puede "ver" ese módulo).</param>
/// <param name="Nivel">warning | info | error.</param>
public record AlertaDto(
    string Tipo,
    string Modulo,
    string Mensaje,
    string Nivel,
    int    Valor);
