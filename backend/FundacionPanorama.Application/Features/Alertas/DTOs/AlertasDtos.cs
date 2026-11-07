namespace FundacionPanorama.Application.Features.Alertas.DTOs;

/// <summary>Conteos crudos que alimentan las alertas.</summary>
public record ConteosAlertas(
    int ContratosProximos,
    int NovedadesPendientes,
    int StockBajo,
    int SinStock);

public record AlertaDto(
    string Tipo,
    string Modulo,
    string Mensaje,
    string Nivel,
    int    Valor);
