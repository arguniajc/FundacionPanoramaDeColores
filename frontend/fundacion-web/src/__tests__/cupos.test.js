import { describe, expect, it } from 'vitest';
import { UMBRAL_CASI_LLENO, estadoCupo } from '@/shared/utils/cupos';

describe('estadoCupo', () => {
  it('muestra "N de M cupos" en verde por debajo del 80 %', () => {
    expect(estadoCupo({ cupoMaximo: 40, inscritosActivos: 12 })).toMatchObject({
      texto: '12 de 40 cupos', tono: 'exito', lleno: false, disponibles: 28, limitado: true,
    });
  });

  it('pasa a ámbar desde el 80 % de ocupación', () => {
    expect(UMBRAL_CASI_LLENO).toBe(0.8);
    expect(estadoCupo({ cupoMaximo: 10, inscritosActivos: 7 }).tono).toBe('exito');
    expect(estadoCupo({ cupoMaximo: 10, inscritosActivos: 8 }).tono).toBe('aviso');
    expect(estadoCupo({ cupoMaximo: 10, inscritosActivos: 9 })).toMatchObject({ tono: 'aviso', disponibles: 1 });
  });

  it('lleno en rojo cuando los inscritos alcanzan o superan el cupo', () => {
    expect(estadoCupo({ cupoMaximo: 10, inscritosActivos: 10 })).toMatchObject({ lleno: true, tono: 'error', disponibles: 0, porcentaje: 1 });
    // Cupo reducido por debajo de los inscritos: sigue lleno, sin negativos ni barra > 100 %
    expect(estadoCupo({ cupoMaximo: 5, inscritosActivos: 7 })).toMatchObject({ lleno: true, disponibles: 0, porcentaje: 1 });
  });

  it('sin cupo máximo nunca está lleno', () => {
    expect(estadoCupo({ cupoMaximo: null, inscritosActivos: 3 })).toMatchObject({
      limitado: false, lleno: false, texto: 'Sin límite de cupos · 3 inscritos', disponibles: null,
    });
    expect(estadoCupo({ cupoMaximo: null, inscritosActivos: 1 }).texto).toBe('Sin límite de cupos · 1 inscrito');
    expect(estadoCupo({ cupoMaximo: 0 }).texto).toBe('Sin límite de cupos');
  });

  it('si el servidor no envía inscritosActivos solo muestra el cupo máximo y no bloquea', () => {
    expect(estadoCupo({ cupoMaximo: 40 })).toMatchObject({ texto: 'Cupo máximo: 40', lleno: false, conocido: false });
    expect(estadoCupo(undefined)).toMatchObject({ texto: 'Sin límite de cupos', lleno: false });
  });
});
