import { describe, it, expect } from 'vitest';
import { validarEsquema } from '@/shared/utils/validacion';
import {
  ESQUEMA_NOMINA, TAB_NOMINA, nominaDesdeApi, nominaParaApi,
} from '@/presentation/modules/configuracion/pages/components/nominaConfig';

// Mismas reglas que ConfiguracionService.ValidarCampos: SMLMV y auxilio > 0, tasas 0–0,2 (0–20 %)
const valido = { nominaSmlmv: '1423500', nominaAuxilioTransporte: '200000', nominaTasaSalud: '4', nominaTasaPension: '4' };
const errores = form => validarEsquema(ESQUEMA_NOMINA, { ...valido, ...form });

describe('configuración: parámetros de nómina', () => {
  it('valores válidos y límites (0 % y 20 %) no tienen errores', () => {
    expect(errores({})).toEqual({});
    expect(errores({ nominaTasaSalud: '0', nominaTasaPension: '20' })).toEqual({});
  });

  it('SMLMV y auxilio obligatorios y mayores que cero', () => {
    expect(errores({ nominaSmlmv: '' }).nominaSmlmv).toMatch(/obligatorio/i);
    expect(errores({ nominaSmlmv: '0' }).nominaSmlmv).toMatch(/mayor que 0/);
    expect(errores({ nominaAuxilioTransporte: '-5' }).nominaAuxilioTransporte).toMatch(/mayor que 0/);
  });

  it('tasas entre 0 y 20 %', () => {
    expect(errores({ nominaTasaSalud: '21' }).nominaTasaSalud).toMatch(/máximo 20|entre 0 y 20/);
    expect(errores({ nominaTasaPension: '-1' }).nominaTasaPension).toMatch(/entre 0 y 20/);
    expect(errores({ nominaTasaPension: '' }).nominaTasaPension).toMatch(/obligatorio/i);
  });

  it('todos los campos llevan a la pestaña Nómina', () => {
    expect(Object.values(ESQUEMA_NOMINA).every(c => c.tab === TAB_NOMINA)).toBe(true);
  });

  it('carga: tasas en porcentaje y, sin datos, los valores por defecto', () => {
    expect(nominaDesdeApi({ nominaSmlmv: 1_600_000, nominaAuxilioTransporte: 220_000, nominaTasaSalud: 0.045, nominaTasaPension: 0.04 }))
      .toEqual({ nominaSmlmv: '1600000', nominaAuxilioTransporte: '220000', nominaTasaSalud: '4.5', nominaTasaPension: '4' });
    expect(nominaDesdeApi({})).toEqual(valido);
    expect(nominaDesdeApi(null)).toEqual(valido);
  });

  it('guardado: números y tasas como fracción (lo que valida el servidor)', () => {
    expect(nominaParaApi({ ...valido, nominaTasaSalud: '4,5', nominaTasaPension: '20' })).toEqual({
      nominaSmlmv: 1_423_500, nominaAuxilioTransporte: 200_000, nominaTasaSalud: 0.045, nominaTasaPension: 0.2,
    });
    // ida y vuelta sin perder precisión
    expect(nominaParaApi(nominaDesdeApi({ nominaTasaSalud: 0.04, nominaTasaPension: 0.0375 })))
      .toMatchObject({ nominaTasaSalud: 0.04, nominaTasaPension: 0.0375 });
  });
});
