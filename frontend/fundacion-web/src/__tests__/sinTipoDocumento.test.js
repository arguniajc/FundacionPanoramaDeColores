import { describe, it, expect } from 'vitest';
import {
  opcionesParaCorregir, textoAviso, motivoSugerencia, avisoSeleccion, correccionesSugeridas, quitarCorregidos,
} from '@/domain/beneficiarios/sinTipoDocumento';

const FILAS = [
  { id: 'a', nombre: 'Ana',   numeroDocumento: null,         tipo: 'niño',   sugerencia: 'Sin documento' },
  { id: 'b', nombre: 'Beto',  numeroDocumento: 'AB123456',   tipo: 'niño',   sugerencia: null },
  { id: 'c', nombre: 'Carla', numeroDocumento: '1107123456', tipo: 'niño',   sugerencia: 'TI' },
  { id: 'd', nombre: 'Dora',  numeroDocumento: '123',        tipo: 'adulto', sugerencia: null },
];

describe('sinTipoDocumento', () => {
  it('ofrece el catálogo de niño o de adulto', () => {
    const nino   = opcionesParaCorregir('niño').map(o => o.value);
    const adulto = opcionesParaCorregir('adulto').map(o => o.value);
    expect(nino).toEqual(['RC', 'TI', 'CE', 'NUIP', 'PA', 'PPT', 'RAMV', 'Sin documento']);
    expect(adulto).toEqual(['CC', 'CE', 'NUIP', 'PA', 'PPT', 'RAMV', 'Sin documento']);
  });

  it('agrega la sugerencia si no está en la lista', () => {
    expect(opcionesParaCorregir('adulto', 'PEP').map(o => o.value)).toContain('PEP');
    expect(opcionesParaCorregir('adulto', 'CC')).toHaveLength(7);
  });

  it('texto del aviso en singular y plural', () => {
    expect(textoAviso(1)).toBe('1 beneficiario sin tipo de documento');
    expect(textoAviso(5)).toBe('5 beneficiarios sin tipo de documento');
  });

  it('explica la sugerencia', () => {
    expect(motivoSugerencia(FILAS[0])).toBe('No tiene número de documento');
    expect(motivoSugerencia(FILAS[1])).toMatch(/tiene letras/);
    expect(motivoSugerencia(FILAS[2])).toBe('Según la edad');
    expect(motivoSugerencia(FILAS[3])).toMatch(/longitud/);
  });

  it('avisa que "Sin documento" quita el número guardado', () => {
    expect(avisoSeleccion(FILAS[1], 'Sin documento')).toBe('Se quitará el número guardado.');
    expect(avisoSeleccion(FILAS[0], 'Sin documento')).toBe('');
    expect(avisoSeleccion(FILAS[1], 'PA')).toBe('');
  });

  it('arma el lote solo con las filas que tienen sugerencia', () => {
    expect(correccionesSugeridas(FILAS)).toEqual([
      { id: 'a', tipoDocumento: 'Sin documento' },
      { id: 'c', tipoDocumento: 'TI' },
    ]);
  });

  it('quita las filas corregidas', () => {
    expect(quitarCorregidos(FILAS, ['a', 'c']).map(f => f.id)).toEqual(['b', 'd']);
  });
});
