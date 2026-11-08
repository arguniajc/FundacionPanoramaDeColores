using FundacionPanorama.Application.Features.Nomina;
using FundacionPanorama.Application.Features.Nomina.DTOs;

namespace FundacionPanorama.Tests.Features;

/// <summary>La vista previa del panel (EditarLiquidacionDialog.calcular) usa la misma fórmula.</summary>
public class CalculoNominaTests
{
    // Valores por defecto (los que antes estaban fijos en el código)
    static readonly ParametrosNomina P = ParametrosNomina.Predeterminados;

    [Fact]
    public void Mes_Completo()
    {
        var t = CalculoNomina.Calcular(P, 1_500_000, 30);
        Assert.Equal(new TotalesLiquidacion(1_500_000, 200_000, 60_000, 60_000, 1_700_000, 120_000, 1_580_000), t);
    }

    [Fact]
    public void Salario_Y_Auxilio_Proporcionales_A_Los_Dias()
    {
        var t = CalculoNomina.Calcular(P, 1_500_000, 15);
        Assert.Equal(750_000, t.SalarioBase);
        Assert.Equal(100_000, t.Auxilio);
        Assert.Equal(30_000, t.Salud);
        Assert.Equal(30_000, t.Pension);
        Assert.Equal(850_000 - 60_000, t.Neto);
    }

    [Theory]
    [InlineData(2_847_000, 200_000)]   // exactamente 2 SMLMV: sí tiene auxilio
    [InlineData(2_847_001, 0)]
    public void Auxilio_Hasta_Dos_Salarios_Minimos_Inclusive(decimal salario, decimal auxilio)
        => Assert.Equal(auxilio, CalculoNomina.Calcular(P, salario, 30).Auxilio);

    [Fact]
    public void El_Auxilio_Se_Decide_Con_El_Salario_Mensual_No_Con_El_Proporcional()
        => Assert.Equal(0, CalculoNomina.Calcular(P, 3_000_000, 10).Auxilio);

    [Fact]
    public void Extras_Y_Deducciones_Se_Suman_Sin_Prorratear()
    {
        var t = CalculoNomina.Calcular(P, 1_000_000, 30, horasExtras: 80_000, bonificaciones: 20_000,
                                       retencionFuente: 5_000, otrasDeducciones: 15_000);
        Assert.Equal(1_000_000 + 200_000 + 80_000 + 20_000, t.Devengado);
        Assert.Equal(40_000 + 40_000 + 5_000 + 15_000, t.Deducciones);
    }

    [Theory]
    [InlineData(-5, 0)]
    [InlineData(45, 1_500_000)]
    public void Dias_Fuera_De_Rango_Se_Acotan(int dias, decimal salario)
        => Assert.Equal(salario, CalculoNomina.Calcular(P, 1_500_000, dias).SalarioBase);

    [Fact]
    public void Redondea_Igual_Que_El_Panel()
        // 1.000.001 × 15 / 30 = 500.000,5 → 500.001 (JavaScript Math.round también sube los .5)
        => Assert.Equal(500_001, CalculoNomina.Calcular(P, 1_000_001, 15).SalarioBase);

    // ── Parámetros configurables (decreto de otro año, tasas distintas) ─────────

    static readonly ParametrosNomina Otro = new(Smlmv: 1_600_000, AuxilioTransporte: 220_000, TasaSalud: 0.05m, TasaPension: 0.03m);

    [Fact]
    public void Usa_Los_Parametros_Recibidos()
        => Assert.Equal(new TotalesLiquidacion(1_500_000, 220_000, 75_000, 45_000, 1_720_000, 120_000, 1_600_000),
                        CalculoNomina.Calcular(Otro, 1_500_000, 30));

    [Theory]
    [InlineData(3_200_000, 220_000)]   // exactamente 2 × 1.600.000
    [InlineData(3_200_001, 0)]
    public void El_Tope_Del_Auxilio_Sigue_Al_SMLMV_Configurado(decimal salario, decimal auxilio)
        => Assert.Equal(auxilio, CalculoNomina.Calcular(Otro, salario, 30).Auxilio);

    [Fact]
    public void Un_Salario_Puede_Ganar_Auxilio_Al_Subir_El_SMLMV()
    {
        Assert.Equal(0, CalculoNomina.Calcular(P, 3_000_000, 30).Auxilio);
        Assert.Equal(220_000, CalculoNomina.Calcular(Otro, 3_000_000, 30).Auxilio);
    }

    [Fact]
    public void Auxilio_Proporcional_Con_El_Valor_Configurado()
        => Assert.Equal(110_000, CalculoNomina.Calcular(Otro, 1_500_000, 15).Auxilio);

    [Fact]
    public void Tasas_En_Cero_No_Descuentan_Salud_Ni_Pension()
    {
        var t = CalculoNomina.Calcular(P with { TasaSalud = 0, TasaPension = 0 }, 1_500_000, 30);
        Assert.Equal(0, t.Salud);
        Assert.Equal(0, t.Pension);
        Assert.Equal(t.Devengado, t.Neto);
    }

    [Fact]
    public void Predeterminados_Son_Los_Valores_Historicos()
        => Assert.Equal(new ParametrosNomina(1_423_500, 200_000, 0.04m, 0.04m), ParametrosNomina.Predeterminados);
}
