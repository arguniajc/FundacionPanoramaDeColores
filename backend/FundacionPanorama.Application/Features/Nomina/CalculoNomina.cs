using FundacionPanorama.Application.Features.Nomina.DTOs;

namespace FundacionPanorama.Application.Features.Nomina;

/// <summary>Totales de una liquidación. SalarioBase es el salario devengado en el período (proporcional a los días).</summary>
public record TotalesLiquidacion(
    decimal SalarioBase, decimal Auxilio, decimal Salud, decimal Pension,
    decimal Devengado, decimal Deducciones, decimal Neto);

/// <summary>
/// Cálculo de nómina (mes laboral de 30 días, como se liquida en Colombia):
/// - Salario y auxilio de transporte proporcionales a los días trabajados.
/// - El auxilio aplica si el salario MENSUAL es de hasta 2 SMLMV (inclusive).
/// - Salud y pensión: tasas del empleado (4 % cada una por defecto) sobre el salario del período (el auxilio no cotiza).
/// SMLMV, auxilio y tasas llegan en <see cref="ParametrosNomina"/>: los vigentes en la configuración al liquidar.
/// Sin acceso a BD para poder probarlo; el repositorio solo guarda el resultado.
/// </summary>
public static class CalculoNomina
{
    public const int DiasMes = 30;

    public static TotalesLiquidacion Calcular(
        ParametrosNomina p, decimal salarioMensual, int diasTrabajados,
        decimal horasExtras = 0, decimal bonificaciones = 0,
        decimal retencionFuente = 0, decimal otrasDeducciones = 0)
    {
        var dias        = Math.Clamp(diasTrabajados, 0, DiasMes);
        var salario     = Math.Round(salarioMensual * dias / DiasMes, 0, MidpointRounding.AwayFromZero);
        var auxilio     = salarioMensual <= 2 * p.Smlmv ? Math.Round(p.AuxilioTransporte * dias / DiasMes, 0, MidpointRounding.AwayFromZero) : 0m;
        var salud       = Math.Round(salario * p.TasaSalud, 0, MidpointRounding.AwayFromZero);
        var pension     = Math.Round(salario * p.TasaPension, 0, MidpointRounding.AwayFromZero);
        var devengado   = salario + auxilio + horasExtras + bonificaciones;
        var deducciones = salud + pension + retencionFuente + otrasDeducciones;
        return new(salario, auxilio, salud, pension, devengado, deducciones, devengado - deducciones);
    }
}
