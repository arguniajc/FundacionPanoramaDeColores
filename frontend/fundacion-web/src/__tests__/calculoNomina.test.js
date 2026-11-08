import { describe, it, expect } from 'vitest';
import { calcularLiquidacion as calcular } from '@/presentation/modules/talento_humano/pages/components/nominaFormato';

// Debe coincidir con backend/FundacionPanorama.Application/Features/Nomina/CalculoNomina.cs
const f = (dias, salario, extra = {}) => ({
  diasTrabajados: String(dias), salario: String(salario),
  horasExtras: '0', bonificaciones: '0', retencionFuente: '0', otrasDeducciones: '0', ...extra,
});

describe('nómina: vista previa de la liquidación', () => {
  it('mes completo: salario, auxilio y 4 % + 4 %', () => {
    expect(calcular(f(30, 1_500_000))).toEqual({
      salario: 1_500_000, aux: 200_000, salud: 60_000, pension: 60_000,
      devengado: 1_700_000, deduccion: 120_000, neto: 1_580_000,
    });
  });

  it('salario y auxilio proporcionales a los días trabajados', () => {
    const t = calcular(f(15, 1_500_000));
    expect(t.salario).toBe(750_000);
    expect(t.aux).toBe(100_000);
    expect(t.salud).toBe(30_000);
    expect(t.neto).toBe(750_000 + 100_000 - 60_000);
  });

  it('el auxilio depende del salario mensual (hasta 2 SMLMV inclusive), no del proporcional', () => {
    expect(calcular(f(30, 2 * 1_423_500)).aux).toBe(200_000);
    expect(calcular(f(30, 2 * 1_423_500 + 1)).aux).toBe(0);
    expect(calcular(f(10, 3_000_000)).aux).toBe(0);   // 1.000.000 en el período, pero gana más de 2 SMLMV
  });

  it('cero días: no hay salario ni auxilio', () => {
    const t = calcular(f(0, 1_500_000, { bonificaciones: '50000' }));
    expect(t.salario).toBe(0);
    expect(t.aux).toBe(0);
    expect(t.devengado).toBe(50_000);
  });
});
