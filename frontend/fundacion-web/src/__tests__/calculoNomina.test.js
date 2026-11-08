import { describe, it, expect } from 'vitest';
import {
  calcularLiquidacion as calcular, PARAMETROS_NOMINA_DEFECTO, normalizarParametrosNomina, fmtPorcentaje,
} from '@/presentation/modules/talento_humano/pages/components/nominaFormato';

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

  it('sin parámetros usa los valores por defecto (los históricos del servidor)', () => {
    expect(PARAMETROS_NOMINA_DEFECTO).toEqual({ smlmv: 1_423_500, auxilioTransporte: 200_000, tasaSalud: 0.04, tasaPension: 0.04 });
    expect(calcular(f(30, 1_500_000))).toEqual(calcular(f(30, 1_500_000), PARAMETROS_NOMINA_DEFECTO));
  });
});

// Mismos casos que CalculoNominaTests (parámetros configurables) en el servidor
describe('nómina: vista previa con los parámetros de la configuración', () => {
  const otro = { smlmv: 1_600_000, auxilioTransporte: 220_000, tasaSalud: 0.05, tasaPension: 0.03 };

  it('usa SMLMV, auxilio y tasas recibidos', () => {
    expect(calcular(f(30, 1_500_000), otro)).toEqual({
      salario: 1_500_000, aux: 220_000, salud: 75_000, pension: 45_000,
      devengado: 1_720_000, deduccion: 120_000, neto: 1_600_000,
    });
  });

  it('el tope del auxilio sigue al SMLMV configurado', () => {
    expect(calcular(f(30, 3_200_000), otro).aux).toBe(220_000);
    expect(calcular(f(30, 3_200_001), otro).aux).toBe(0);
    expect(calcular(f(30, 3_000_000)).aux).toBe(0);            // con el SMLMV por defecto no alcanza
    expect(calcular(f(30, 3_000_000), otro).aux).toBe(220_000);
  });

  it('auxilio proporcional con el valor configurado y tasas en cero', () => {
    expect(calcular(f(15, 1_500_000), otro).aux).toBe(110_000);
    const t = calcular(f(30, 1_500_000), { ...otro, tasaSalud: 0, tasaPension: 0 });
    expect(t.salud + t.pension).toBe(0);
    expect(t.neto).toBe(t.devengado);
  });

  it('parámetros incompletos o inválidos se completan con los por defecto', () => {
    expect(normalizarParametrosNomina({ smlmv: '1600000', tasaSalud: null, tasaPension: 'x' })).toEqual({
      smlmv: 1_600_000, auxilioTransporte: 200_000, tasaSalud: 0.04, tasaPension: 0.04,
    });
    expect(normalizarParametrosNomina(undefined)).toEqual(PARAMETROS_NOMINA_DEFECTO);
    expect(normalizarParametrosNomina({ tasaSalud: 0 }).tasaSalud).toBe(0);   // 0 es un valor válido
  });

  it('formatea las tasas como porcentaje para la vista previa', () => {
    expect(fmtPorcentaje(0.04)).toBe('4 %');
    expect(fmtPorcentaje(0.045)).toBe('4,5 %');
    expect(fmtPorcentaje(0)).toBe('0 %');
  });
});
