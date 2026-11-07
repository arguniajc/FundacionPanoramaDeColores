// Mediciones de diseño responsive que se ejecutan DENTRO de la página
// (page.evaluate(medirPagina, opciones)). Devuelve un objeto serializable.
//
//  - desborde:      ancho que sobra en horizontal (documento o contenedor principal)
//  - fuera:         elementos cuya caja se sale del viewport (solo la raíz del problema)
//  - elipsis:       textos recortados con "…"
//  - tactiles:      controles interactivos de menos de 40 px (solo móvil)
//  - fijos:         elementos fixed/sticky que tapan una parte grande de la pantalla
//  - tablas:        tablas más anchas que su contenedor sin scroll horizontal propio
//  - letraPequena:  textos visibles con fuente < 11 px
export function medirPagina({ movil, raiz }) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const root = raiz ? [...document.querySelectorAll(raiz)].pop() : document.body;
  if (!root) return { error: `no se encontró ${raiz}` };

  const css = el => getComputedStyle(el);
  const visible = el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const s = css(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) !== 0;
  };
  const desc = el => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += `#${el.id}`;
    const cls = [...el.classList].filter(c => !/^css-/.test(c)).slice(0, 3);
    if (cls.length) s += '.' + cls.join('.');
    const label = el.getAttribute('aria-label') || el.getAttribute('title');
    const txt = (label || el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    return txt ? `${s} "${txt}"` : s;
  };
  const scrollX = el => /(auto|scroll)/.test(css(el).overflowX);
  const recortaX = el => css(el).overflowX !== 'visible';

  // Contenedor principal del panel: el área con overflow:auto más grande.
  let principal = null;
  if (!raiz) {
    let area = 0;
    for (const el of document.querySelectorAll('body *')) {
      if (!scrollX(el) || el.closest('.MuiDrawer-root, .MuiDialog-root, .MuiPopover-root')) continue;
      const r = el.getBoundingClientRect();
      if (r.width >= W * 0.55 && r.width * r.height > area) { area = r.width * r.height; principal = el; }
    }
  }
  const esRaizScroll = el => el === principal || el === document.body || el === document.documentElement || el === root;

  const desborde = Math.max(
    document.documentElement.scrollWidth - W,
    principal ? principal.scrollWidth - principal.clientWidth : 0,
    raiz ? root.scrollWidth - root.clientWidth : 0,
    0,
  );

  // Caja que limita horizontalmente al elemento (null = el viewport)
  const limite = el => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (esRaizScroll(p)) return null;
      if (recortaX(p)) return p;
    }
    return null;
  };

  const todos = [...root.querySelectorAll('*')].filter(el =>
    !el.closest('svg') || el.tagName.toLowerCase() === 'svg');

  // 1) Elementos fuera del viewport (raíz del problema: el padre sí cabe)
  const fueraSet = new Set();
  for (const el of todos) {
    if (!visible(el)) continue;
    const pos = css(el).position;
    if (pos === 'fixed') continue;
    if (el.closest('.MuiDrawer-root:not(.MuiDrawer-docked)')) continue; // menú móvil cerrado/abierto
    if (el.closest('.MuiDrawer-docked')) continue;
    if (limite(el)) continue;                    // dentro de un contenedor que recorta/scrollea
    const r = el.getBoundingClientRect();
    if (r.width <= 2 || r.height <= 2) continue; // inputs ocultos, decoraciones
    if (r.right > W + 1 || r.left < -1) fueraSet.add(el);
  }
  const fuera = [...fueraSet]
    .filter(el => !fueraSet.has(el.parentElement))
    .map(el => {
      const r = el.getBoundingClientRect();
      return { el: desc(el), left: Math.round(r.left), right: Math.round(r.right), ancho: Math.round(r.width) };
    });

  // 2) Texto recortado con elipsis
  const elipsis = [];
  for (const el of todos) {
    if (!visible(el)) continue;
    const s = css(el);
    if (s.textOverflow !== 'ellipsis') continue;
    if (el.scrollWidth > el.clientWidth + 1 && (el.innerText || '').trim())
      elipsis.push(desc(el));
  }

  // 3) Objetivos táctiles pequeños (móvil)
  const tactiles = [];
  if (movil) {
    const sel = 'button, a[href], [role="button"], [role="tab"], [role="checkbox"], [role="switch"], [role="combobox"], input[type="checkbox"], input[type="radio"], .MuiChip-clickable, .MuiChip-deleteIcon';
    for (const el of root.querySelectorAll(sel)) {
      if (!visible(el)) continue;
      if (el.closest('.MuiDrawer-root, .fc')) continue;
      // Un checkbox/radio nativo de MUI es invisible: se mide su ButtonBase contenedor
      let objetivo = el;
      if (el.tagName === 'INPUT') objetivo = el.closest('.MuiButtonBase-root') ?? el;
      const r = objetivo.getBoundingClientRect();
      if (r.width < 40 || r.height < 40)
        tactiles.push(`${desc(objetivo)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  }

  // 4) Fijos / sticky que tapan contenido
  const fijos = [];
  for (const el of document.querySelectorAll('body *')) {
    const s = css(el);
    if (s.position !== 'fixed' && s.position !== 'sticky') continue;
    if (!visible(el)) continue;
    if (el.closest('.MuiDialog-root, .MuiModal-root, .MuiPopover-root, .MuiDrawer-docked, .MuiSnackbar-root')) continue;
    if (s.position === 'sticky' && el.closest('thead, .fc')) continue;
    const r = el.getBoundingClientRect();
    const tapa = (Math.min(r.bottom, H) - Math.max(r.top, 0)) * (Math.min(r.right, W) - Math.max(r.left, 0));
    if (tapa > W * H * 0.15) fijos.push(`${desc(el)} ${s.position} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }

  // 5) Tablas más anchas que su contenedor sin scroll propio
  const tablas = [];
  for (const t of root.querySelectorAll('table')) {
    if (!visible(t) || t.closest('.fc')) continue;
    let cont = null;
    for (let p = t.parentElement; p && p !== document.body; p = p.parentElement) {
      if (esRaizScroll(p)) break;
      if (scrollX(p)) { cont = p; break; }
    }
    const r = t.getBoundingClientRect();
    if (!cont && (r.right > W + 1 || t.scrollWidth > t.parentElement.clientWidth + 1))
      tablas.push(`${desc(t).slice(0, 80)} ancho=${Math.round(r.width)}`);
  }

  // 6) Letra demasiado pequeña (< 11 px) en texto visible
  let letraPequena = 0;
  const ejemplosLetra = [];
  for (const el of todos) {
    if (!el.childNodes.length) continue;
    const tieneTexto = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!tieneTexto || !visible(el)) continue;
    const fs = parseFloat(css(el).fontSize);
    if (fs < 11) {
      letraPequena++;
      if (ejemplosLetra.length < 8) ejemplosLetra.push(`${desc(el)} ${fs}px`);
    }
  }

  let dialogo = null;
  if (raiz) {
    const r = root.getBoundingClientRect();
    dialogo = { ancho: Math.round(r.width), alto: Math.round(r.height), pantallaCompleta: r.width >= W - 1 };
  }

  return {
    W, H, dialogo,
    desborde,
    fuera: fuera.slice(0, 30), nFuera: fuera.length,
    elipsis: elipsis.slice(0, 20), nElipsis: elipsis.length,
    tactiles: tactiles.slice(0, 40), nTactiles: tactiles.length,
    fijos,
    tablas,
    letraPequena, ejemplosLetra,
  };
}
