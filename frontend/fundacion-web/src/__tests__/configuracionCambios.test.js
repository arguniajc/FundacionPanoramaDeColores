import { describe, it, expect } from 'vitest';
import {
  CAMPOS_POR_PESTANA, PESTANA_WEB, pestanasConCambios,
} from '@/presentation/modules/configuracion/pages/components/cambiosConfig';
import { ayudaNit } from '@/presentation/modules/configuracion/pages/components/helpers';
import { ESQUEMA_NOMINA, TAB_NOMINA } from '@/presentation/modules/configuracion/pages/components/nominaConfig';
import { r } from '@/shared/utils/validacion';

const base = { nombreFundacion: 'Fundación', nit: '900123456-8', tipoDocRep: 'CC', smtpPuerto: '587', nominaSmlmv: '1423500' };
const web  = { contacto: { telefono: '3226022056' } };

describe('configuración: pestañas con cambios sin guardar', () => {
  it('sin cambios ninguna pestaña queda marcada', () => {
    expect(pestanasConCambios(base, { ...base }, web, { ...web }).some(Boolean)).toBe(false);
  });

  it('marca solo la pestaña del campo que cambió', () => {
    const marcadas = pestanasConCambios({ ...base, nit: '900123456' }, base, web, web);
    expect(marcadas.map((m, i) => (m ? i : -1)).filter(i => i >= 0)).toEqual([0]);
    expect(pestanasConCambios({ ...base, nominaSmlmv: '1500000' }, base, web, web)[TAB_NOMINA]).toBe(true);
  });

  it('la Página Web compara su propio formulario', () => {
    const marcadas = pestanasConCambios(base, base, { contacto: { telefono: '3001234567' } }, web);
    expect(marcadas[PESTANA_WEB]).toBe(true);
    expect(marcadas.filter(Boolean)).toHaveLength(1);
  });

  it('ignora espacios en los extremos', () => {
    expect(pestanasConCambios({ ...base, nombreFundacion: 'Fundación ' }, base, web, web)[0]).toBe(false);
  });

  it('los campos de nómina están en la pestaña Nómina', () => {
    expect(CAMPOS_POR_PESTANA[TAB_NOMINA]).toEqual(Object.keys(ESQUEMA_NOMINA));
  });
});

describe('configuración: NIT de la fundación', () => {
  it('el ejemplo de la ayuda tiene un DV válido', () => {
    const ejemplo = ayudaNit('').match(/\d{9}-\d/)[0];
    expect(r.nit()(ejemplo)).toBe('');
  });

  it('sugiere el DV cuando el NIT se escribe sin él', () => {
    expect(ayudaNit('901456789')).toBe('Dígito de verificación: 8 (901456789-8)');
  });

  it('rechaza un DV que no corresponde', () => {
    expect(r.nit()('900123456-7')).toMatch(/debería ser 8/);
  });
});
