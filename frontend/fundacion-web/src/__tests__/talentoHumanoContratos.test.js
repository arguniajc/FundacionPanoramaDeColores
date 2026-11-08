import { describe, expect, it } from 'vitest';
import {
  CONTRATOS_CON_FIN, FONDOS_PENSION, TIPOS_CONTRATO, tieneFechaFin,
} from '@/presentation/modules/talento_humano/pages/components/contratos';

describe('contratos del empleado', () => {
  it('solo fijo, aprendizaje y prestación de servicios piden fecha fin', () => {
    expect(TIPOS_CONTRATO.filter(tieneFechaFin)).toEqual(['fijo', 'prestacion_servicios', 'aprendizaje']);
    expect(tieneFechaFin('indefinido')).toBe(false);
    expect(tieneFechaFin('voluntario')).toBe(false);
    expect(tieneFechaFin('')).toBe(false);
    expect(CONTRATOS_CON_FIN.every(t => TIPOS_CONTRATO.includes(t))).toBe(true);
  });

  it('lista las AFP de Colombia', () => {
    expect(FONDOS_PENSION).toEqual(['Colpensiones', 'Porvenir', 'Protección', 'Colfondos', 'Skandia']);
  });
});
