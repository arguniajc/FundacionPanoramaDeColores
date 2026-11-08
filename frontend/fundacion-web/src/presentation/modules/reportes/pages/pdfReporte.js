/**
 * Exportación de reportes a PDF con apariencia SIEMPRE clara.
 *
 * html2canvas captura un CLON del documento: en modo oscuro se recolorea ese clon
 * (nunca la pantalla del usuario, así no hay parpadeo) convirtiendo cada color de la
 * paleta oscura en su par de la paleta clara. Los colores que no son de la paleta se
 * ajustan por luminosidad (texto claro → texto oscuro, fondos oscuros → blanco).
 *
 * Después la imagen se reparte en páginas A4 cortando, cuando se puede, por filas
 * vacías (entre tarjetas) para no partir gráficas o textos por la mitad.
 */
import { PALETA, colorEstado } from '@/shared/theme/paleta';

// ── Colores ──────────────────────────────────────────────────────────────────

/** Convierte '#RGB', '#RRGGBB', 'rgb()' o 'rgba()' en { r, g, b, a }; null si no se reconoce. */
export function parsearColor(valor) {
  if (!valor) return null;
  const v = String(valor).trim().toLowerCase();
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map(c => c + c).join('') : hex[1];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  }
  const rgb = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/);
  if (rgb) {
    let a = rgb[4] === undefined ? 1 : parseFloat(rgb[4]);
    if (rgb[4]?.endsWith('%')) a /= 100;
    return { r: Math.round(+rgb[1]), g: Math.round(+rgb[2]), b: Math.round(+rgb[3]), a };
  }
  return null;
}

const clave    = ({ r, g, b }) => `${r},${g},${b}`;
const claveA   = (c) => `${clave(c)},${Math.round(c.a * 1000) / 1000}`;
const aCss     = ({ r, g, b, a }) => (a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${Math.round(a * 1000) / 1000})`);

/** Luminancia relativa (0 negro … 1 blanco). */
export function luminancia({ r, g, b }) {
  const lin = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// Tokens neutros: los únicos que se cambian dentro de las gráficas (SVG), para no
// alterar los colores de las series.
const NEUTROS = ['fondo', 'superficie', 'superficie2', 'borde', 'texto', 'textoSuave', 'textoTenue'];

/**
 * Construye el mapa oscuro → claro a partir de la paleta central.
 * @param {Array<[string, string]>} extras pares adicionales (p. ej. primario personalizado)
 */
export function crearMapaColores(extras = []) {
  const exactos = new Map();     // rgba exacto → color claro
  const porRgb  = new Map();     // solo rgb (se conserva la transparencia original)
  const neutros = new Map();     // rgb → color claro (solo neutros, para SVG)

  const agregar = (oscuro, claro, { neutro = false } = {}) => {
    const o = parsearColor(oscuro);
    const c = parsearColor(claro);
    if (!o || !c) return;
    exactos.set(claveA(o), c);
    // Los colores semitransparentes (fondos de tono) solo se cambian si coinciden
    // exactamente: comparten rgb con el color sólido y lo taparían.
    if (o.a < 1) return;
    if (!porRgb.has(clave(o))) porRgb.set(clave(o), c);
    if (neutro) neutros.set(clave(o), c);
  };

  // Primero los pares explícitos (primario personalizado), luego tonos y paleta
  extras.forEach(([o, c]) => agregar(o, c));
  for (const tono of ['exito', 'aviso', 'error', 'info', 'marca', 'neutro']) {
    const o = colorEstado(tono, 'dark');
    const c = colorEstado(tono, 'light');
    agregar(o.fondo, c.fondo);
    agregar(o.texto, c.texto);
  }
  const { dark, light } = PALETA;
  for (const k of Object.keys(dark)) {
    if (typeof dark[k] === 'string') {
      agregar(dark[k], light[k], { neutro: NEUTROS.includes(k) });
    } else {
      for (const sub of Object.keys(dark[k])) {
        // contrastText oscuro (texto sobre botones claros) pasa a blanco
        agregar(dark[k][sub], light[k][sub]);
      }
    }
  }
  return { exactos, porRgb, neutros };
}

const NEGRO = { r: 0, g: 0, b: 0 };

/**
 * Color claro equivalente a `valor` (un color computado del navegador).
 * @param {'texto'|'fondo'|'borde'|'svg'|'svgTexto'} tipo uso del color
 * @returns {string|null} color CSS nuevo o null si se deja igual
 */
export function colorClaro(valor, mapa, tipo) {
  const c = parsearColor(valor);
  if (!c || c.a === 0) return null;
  const esSvg = tipo === 'svg' || tipo === 'svgTexto';

  const exacto = !esSvg && mapa.exactos.get(claveA(c));
  if (exacto) return aCss(exacto);
  const mismoRgb = (esSvg ? mapa.neutros : mapa.porRgb).get(clave(c));
  if (mismoRgb) return aCss({ ...mismoRgb, a: c.a * mismoRgb.a });

  const blanco = c.r === 255 && c.g === 255 && c.b === 255;
  const lum = luminancia(c);
  const textoClaro = parsearColor(PALETA.light.texto);
  switch (tipo) {
    case 'texto':
    case 'svgTexto':
      // El blanco puro suele ir sobre fondos de color (botones, chips): se respeta
      if (blanco && c.a >= 1) return null;
      return lum > 0.5 ? aCss({ ...textoClaro, a: c.a }) : null;
    case 'fondo':
      // Velos blancos semitransparentes (skeleton, hover) → velos negros
      if (blanco && c.a < 1) return aCss({ ...NEGRO, a: Math.min(c.a, 0.11) });
      return lum < 0.06 ? aCss({ ...parsearColor(PALETA.light.superficie), a: c.a }) : null;
    case 'borde':
    case 'svg':
      if (blanco && c.a < 1) return aCss({ ...NEGRO, a: c.a });
      return lum < 0.06 ? aCss({ ...parsearColor(PALETA.light.borde), a: c.a }) : null;
    default:
      return null;
  }
}

const PROPIEDADES_HTML = [
  ['color', 'texto'],
  ['background-color', 'fondo'],
  ['border-top-color', 'borde'],
  ['border-right-color', 'borde'],
  ['border-bottom-color', 'borde'],
  ['border-left-color', 'borde'],
  ['outline-color', 'borde'],
];

/**
 * Recolorea en claro el subárbol `raiz` (el clon que entrega html2canvas en `onclone`).
 * @param {Element} raiz
 * @param {object} mapa resultado de crearMapaColores()
 * @param {(el: Element) => CSSStyleDeclaration} estilos getComputedStyle del documento clonado
 */
export function aclararClon(raiz, mapa, estilos) {
  const elementos = [raiz, ...raiz.querySelectorAll('*')];
  // Primero se leen todos los estilos y luego se escriben (evita recalcular estilos por cada cambio)
  const cambios = [];
  for (const el of elementos) {
    const cs = estilos(el);
    if (!cs) continue;
    const esSvg = typeof el.namespaceURI === 'string' && el.namespaceURI.includes('svg');
    if (esSvg) {
      const tag = String(el.tagName).toLowerCase();
      const tipo = tag === 'text' || tag === 'tspan' ? 'svgTexto' : 'svg';
      for (const prop of ['fill', 'stroke']) {
        const nuevo = colorClaro(cs.getPropertyValue(prop), mapa, tipo);
        if (nuevo) cambios.push([el, prop, nuevo]);
      }
    } else {
      for (const [prop, tipo] of PROPIEDADES_HTML) {
        const nuevo = colorClaro(cs.getPropertyValue(prop), mapa, tipo);
        if (nuevo) cambios.push([el, prop, nuevo]);
      }
    }
  }
  for (const [el, prop, valor] of cambios) el.style.setProperty(prop, valor, 'important');
  raiz.style.setProperty('background-color', PALETA.light.superficie, 'important');
  return cambios.length;
}

// ── Paginación ───────────────────────────────────────────────────────────────

/** true si la fila de píxeles RGBA es de un solo color (no corta texto ni bordes). */
export function filaUniforme(datos, tolerancia = 10) {
  const r = datos[0], g = datos[1], b = datos[2];
  for (let i = 4; i < datos.length; i += 4) {
    if (Math.abs(datos[i] - r) > tolerancia || Math.abs(datos[i + 1] - g) > tolerancia || Math.abs(datos[i + 2] - b) > tolerancia) {
      return false;
    }
  }
  return true;
}

/**
 * Reparte una imagen de `altoTotal` px en páginas. Cada corte se intenta hacer en
 * una fila "limpia" (esFilaLimpia) buscando hacia arriba hasta `busqueda` (fracción
 * de la página); si no hay ninguna se corta en el límite.
 * @returns {Array<{ inicio: number, fin: number }>}
 */
export function calcularCortes(altoTotal, altoPrimera, altoResto, esFilaLimpia, busqueda = 0.3) {
  const paginas = [];
  let inicio = 0;
  while (inicio < altoTotal) {
    const disponible = Math.max(1, Math.floor(paginas.length === 0 ? altoPrimera : altoResto));
    const limite = inicio + disponible;
    let fin = Math.min(limite, altoTotal);
    if (limite < altoTotal) {
      const tope = Math.max(inicio + 1, Math.floor(limite - disponible * busqueda));
      for (let y = limite; y >= tope; y--) {
        if (esFilaLimpia(y)) { fin = y; break; }
      }
    }
    paginas.push({ inicio, fin });
    inicio = fin;
  }
  return paginas;
}

// ── Exportación ──────────────────────────────────────────────────────────────

/**
 * Genera y descarga el PDF de `elemento`.
 * @param {object} opciones
 * @param {HTMLElement} opciones.elemento contenido a capturar
 * @param {string} opciones.titulo        nombre del reporte (cabecera)
 * @param {string} opciones.archivo       nombre del archivo .pdf
 * @param {boolean} opciones.oscuro       si la pantalla está en modo oscuro
 * @param {Array<[string,string]>} [opciones.paresColor] pares oscuro → claro adicionales
 */
export async function exportarReportePdf({ elemento, titulo, archivo, oscuro, paresColor = [] }) {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF }   = await import('jspdf');
  const mapa = oscuro ? crearMapaColores(paresColor) : null;

  const canvas = await html2canvas(elemento, {
    scale: 2, useCORS: true, backgroundColor: PALETA.light.superficie, logging: false,
    onclone: (doc, clon) => {
      doc.documentElement.dataset.modo = 'light';
      doc.documentElement.style.colorScheme = 'light';
      if (mapa) aclararClon(clon, mapa, (el) => doc.defaultView.getComputedStyle(el));
    },
  });

  const pdf    = new jsPDF('p', 'mm', 'a4');
  const pgW    = pdf.internal.pageSize.getWidth();
  const pgH    = pdf.internal.pageSize.getHeight();
  const MARGEN = 8;
  const CABECERA = 32;
  const anchoMm  = pgW - MARGEN * 2;
  const pxPorMm  = canvas.width / anchoMm;

  // Cabecera morada (solo en la primera página)
  pdf.setFillColor(78, 27, 149);
  pdf.rect(0, 0, pgW, 10, 'F');
  pdf.setFontSize(13); pdf.setTextColor(255, 255, 255);
  pdf.text('Fundación Panorama de Colores', MARGEN, 7);
  pdf.setFontSize(11); pdf.setTextColor(50, 50, 50);
  pdf.text(`Reporte: ${titulo}`, MARGEN, 18);
  pdf.setFontSize(9);  pdf.setTextColor(120, 120, 120);
  pdf.text(`Generado el ${new Date().toLocaleDateString('es-CO', { dateStyle: 'long' })}`, MARGEN, 25);

  const ctx = canvas.getContext('2d');
  const esFilaLimpia = (y) => filaUniforme(ctx.getImageData(0, y, canvas.width, 1).data);
  const cortes = calcularCortes(
    canvas.height,
    (pgH - CABECERA - MARGEN) * pxPorMm,
    (pgH - MARGEN * 2) * pxPorMm,
    esFilaLimpia,
  );

  cortes.forEach(({ inicio, fin }, i) => {
    const trozo = document.createElement('canvas');
    trozo.width  = canvas.width;
    trozo.height = fin - inicio;
    const t = trozo.getContext('2d');
    t.fillStyle = PALETA.light.superficie;
    t.fillRect(0, 0, trozo.width, trozo.height);
    t.drawImage(canvas, 0, inicio, canvas.width, trozo.height, 0, 0, canvas.width, trozo.height);
    if (i > 0) pdf.addPage();
    pdf.addImage(trozo.toDataURL('image/png'), 'PNG', MARGEN, i === 0 ? CABECERA : MARGEN,
      anchoMm, trozo.height / pxPorMm, '', 'FAST');
  });

  pdf.save(archivo);
}
