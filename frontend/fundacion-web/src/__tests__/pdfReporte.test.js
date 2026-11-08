import { describe, it, expect } from 'vitest';
import {
  parsearColor, crearMapaColores, colorClaro, aclararClon, filaUniforme, calcularCortes,
} from '@/presentation/modules/reportes/pages/pdfReporte';
import { PALETA, colorEstado } from '@/shared/theme/paleta';

const rgb = (hex) => { const c = parsearColor(hex); return `rgb(${c.r}, ${c.g}, ${c.b})`; };

describe('reporte PDF: colores', () => {
  const mapa = crearMapaColores();

  it('reconoce hex, rgb y rgba', () => {
    expect(parsearColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parsearColor('rgba(52, 211, 153, 0.14)')).toEqual({ r: 52, g: 211, b: 153, a: 0.14 });
    expect(parsearColor('rgb(1 2 3 / 50%)')).toEqual({ r: 1, g: 2, b: 3, a: 0.5 });
    expect(parsearColor('transparent')).toBeNull();
  });

  it('convierte los tokens oscuros de la paleta en sus pares claros', () => {
    expect(colorClaro(rgb(PALETA.dark.texto), mapa, 'texto')).toBe(rgb(PALETA.light.texto));
    expect(colorClaro(rgb(PALETA.dark.superficie), mapa, 'fondo')).toBe(rgb(PALETA.light.superficie));
    expect(colorClaro(rgb(PALETA.dark.borde), mapa, 'borde')).toBe(rgb(PALETA.light.borde));
    expect(colorClaro(rgb(PALETA.dark.exito.main), mapa, 'texto')).toBe(rgb(PALETA.light.exito.main));
  });

  it('los fondos de tono semitransparentes pasan a su fondo claro sin tapar el color sólido', () => {
    expect(colorClaro(colorEstado('exito', 'dark').fondo, mapa, 'fondo')).toBe(rgb(colorEstado('exito', 'light').fondo));
    // alpha(success, 0.06): mismo rgb que el sólido → éxito claro con la misma transparencia
    expect(colorClaro('rgba(52, 211, 153, 0.06)', mapa, 'fondo')).toBe('rgba(21, 128, 61, 0.06)');
  });

  it('en las gráficas solo cambia los neutros (las series conservan su color)', () => {
    expect(colorClaro(rgb(PALETA.dark.borde), mapa, 'svg')).toBe(rgb(PALETA.light.borde));
    expect(colorClaro(rgb(PALETA.dark.primario.main), mapa, 'svg')).toBeNull();
    expect(colorClaro('rgb(16, 185, 129)', mapa, 'svg')).toBeNull();
  });

  it('ajusta colores fuera de la paleta por luminosidad y respeta el blanco sobre color', () => {
    expect(colorClaro('rgb(240, 240, 240)', mapa, 'texto')).toBe(rgb(PALETA.light.texto));
    expect(colorClaro('rgb(255, 255, 255)', mapa, 'texto')).toBeNull();
    expect(colorClaro('rgb(5, 5, 8)', mapa, 'fondo')).toBe(rgb(PALETA.light.superficie));
    expect(colorClaro('rgba(255, 255, 255, 0.12)', mapa, 'borde')).toBe('rgba(0, 0, 0, 0.12)');
    expect(colorClaro('rgba(0, 0, 0, 0)', mapa, 'fondo')).toBeNull();
  });

  it('usa el primario personalizado cuando se indica', () => {
    const m = crearMapaColores([['#C0A0FF', '#7700CC']]);
    expect(colorClaro('rgb(192, 160, 255)', m, 'texto')).toBe('rgb(119, 0, 204)');
  });

  it('aclara el clon con !important sin tocar lo que ya es claro', () => {
    const crearEl = (tagName, estilos, ns = 'http://www.w3.org/1999/xhtml') => {
      const escritos = {};
      return {
        tagName, namespaceURI: ns, estilos, escritos,
        style: { setProperty: (p, v, prio) => { escritos[p] = `${v}${prio ? ' !' + prio : ''}`; } },
      };
    };
    const texto = crearEl('P', { color: rgb(PALETA.dark.texto), 'background-color': 'rgba(0, 0, 0, 0)' });
    const linea = crearEl('line', { stroke: rgb(PALETA.dark.borde), fill: 'none' }, 'http://www.w3.org/2000/svg');
    const raiz  = crearEl('DIV', { 'background-color': rgb(PALETA.dark.superficie), color: rgb(PALETA.light.texto) });
    raiz.querySelectorAll = () => [texto, linea];
    const estilos = (el) => ({ getPropertyValue: (p) => el.estilos[p] ?? '' });

    aclararClon(raiz, crearMapaColores(), estilos);
    expect(texto.escritos.color).toBe(`${rgb(PALETA.light.texto)} !important`);
    expect(texto.escritos['background-color']).toBeUndefined();
    expect(linea.escritos.stroke).toBe(`${rgb(PALETA.light.borde)} !important`);
    expect(raiz.escritos['background-color']).toBe(`${PALETA.light.superficie} !important`);
    expect(raiz.escritos.color).toBeUndefined();
  });
});

describe('reporte PDF: paginación', () => {
  it('detecta filas de un solo color', () => {
    expect(filaUniforme(new Uint8ClampedArray([255, 255, 255, 255, 250, 252, 255, 255]))).toBe(true);
    expect(filaUniforme(new Uint8ClampedArray([255, 255, 255, 255, 200, 200, 200, 255]))).toBe(false);
  });

  it('una sola página si el contenido cabe', () => {
    expect(calcularCortes(500, 800, 1000, () => true)).toEqual([{ inicio: 0, fin: 500 }]);
  });

  it('corta en la fila limpia más cercana al límite y no repite ni salta contenido', () => {
    const limpias = new Set([700, 1650]);
    const cortes = calcularCortes(2500, 800, 1000, (y) => limpias.has(y));
    expect(cortes).toEqual([
      { inicio: 0, fin: 700 },
      { inicio: 700, fin: 1650 },
      { inicio: 1650, fin: 2500 },
    ]);
  });

  it('si no hay filas limpias cerca corta en el límite de la página', () => {
    const cortes = calcularCortes(2500, 800, 1000, () => false);
    expect(cortes).toEqual([
      { inicio: 0, fin: 800 },
      { inicio: 800, fin: 1800 },
      { inicio: 1800, fin: 2500 },
    ]);
  });
});
