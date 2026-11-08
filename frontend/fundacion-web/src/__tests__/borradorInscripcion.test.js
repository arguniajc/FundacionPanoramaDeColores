import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  claveBorrador, guardarBorrador, leerBorrador, borrarBorrador, hayContenidoPropio,
} from '@/presentation/modules/inscripciones/pages/components/borradorInscripcion';

// sessionStorage en memoria (funciona igual con o sin jsdom)
function memoria() {
  let m = {};
  return {
    getItem: k => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: k => { delete m[k]; },
    clear: () => { m = {}; },
  };
}

beforeEach(() => { vi.stubGlobal('sessionStorage', memoria()); });

describe('borrador de inscripción', () => {
  it('guarda, lee y borra por beneficiario + programa', () => {
    expect(claveBorrador(7, 'p1')).toBe('inscripcion-borrador:7:p1');
    const b = { datos: { c1: 'hola' }, panelActivo: { c2: true }, observaciones: 'x' };
    expect(guardarBorrador(7, 'p1', b)).toBe(true);
    expect(leerBorrador(7, 'p1')).toEqual(b);
    expect(leerBorrador(7, 'otro')).toBeNull();
    borrarBorrador(7, 'p1');
    expect(leerBorrador(7, 'p1')).toBeNull();
  });
  it('si no cabe con la firma, la guarda sin ella', () => {
    const s = memoria();
    s.setItem = (k, v) => { if (v.includes('data:image')) throw new Error('QuotaExceededError'); s[k] = v; };
    s.getItem = k => s[k] ?? null;
    vi.stubGlobal('sessionStorage', s);
    expect(guardarBorrador(1, 2, { datos: { c1: 'a', __firma_padre__: 'data:image/png;base64,AAA' } })).toBe(true);
    expect(leerBorrador(1, 2).datos).toEqual({ c1: 'a' });
  });
  it('sin sessionStorage no rompe', () => {
    vi.stubGlobal('sessionStorage', { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); }, removeItem() { throw new Error('bloqueado'); } });
    expect(guardarBorrador(1, 2, { datos: {} })).toBe(false);
    expect(leerBorrador(1, 2)).toBeNull();
    expect(() => borrarBorrador(1, 2)).not.toThrow();
  });
  it('un borrador dañado se ignora', () => {
    sessionStorage.setItem(claveBorrador(1, 2), '{no-json');
    expect(leerBorrador(1, 2)).toBeNull();
  });
});

describe('hayContenidoPropio', () => {
  const auto = { edad: '8', sino: 'false' };
  it('lo auto-completado y el "quién firma" automático no cuentan', () => {
    expect(hayContenidoPropio(auto, auto)).toBe(false);
    expect(hayContenidoPropio({ ...auto, __firma_meta__: '{"quien":"madre"}' }, auto)).toBe(false);
  });
  it('cualquier dato escrito, la firma o las observaciones sí cuentan', () => {
    expect(hayContenidoPropio({ ...auto, c1: 'Ana' }, auto)).toBe(true);
    expect(hayContenidoPropio({ ...auto, __firma_meta__: '{"nombre":"Ana"}' }, auto)).toBe(true);
    expect(hayContenidoPropio(auto, auto, 'nota')).toBe(true);
  });
});
