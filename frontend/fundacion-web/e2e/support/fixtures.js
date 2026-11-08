// Fixtures compartidas de las pruebas e2e.
//
//  - `api`: API falsa. Intercepta TODO lo que va a http://api.test (la URL con la
//    que se compila la app para e2e) y responde con los manejadores registrados
//    con api.on(método, ruta, respuesta). Lo que no tenga manejador responde 501
//    y queda anotado: al terminar la prueba se exige que no haya ninguna petición
//    inesperada (ni a la API ni a otros orígenes externos).
//  - `sesion`: guarda en localStorage una sesión de administrador (las mismas
//    claves que authStorage.js) antes de que cargue la página. El login real con
//    Google nunca se automatiza.
//  - Google Identity Services se reemplaza por un script falso que dibuja un
//    botón "Iniciar sesión con Google"; las fuentes de Google se responden vacías.
import { test as base, expect } from '@playwright/test';
import { BENEFICIARIOS, CONFIG_PUBLICA, STATS_BENEFICIARIOS, USUARIO, crearJwt, resumenBeneficiario } from './datos.js';

export const API = 'http://api.test';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type',
};

// Sustituto de https://accounts.google.com/gsi/client: misma API mínima que usa
// @react-oauth/google (initialize + renderButton). Al pulsar el botón entrega un
// "credential" de prueba al callback, como haría Google. Respeta size y width
// para que la auditoría mida el botón con el tamaño que tendría en producción.
const GSI_FALSO = `
  window.google = { accounts: { id: {
    initialize(cfg) { window.__gsiConfig = cfg; },
    renderButton(el, opciones = {}) {
      if (!el) return;
      el.innerHTML = '';
      const b = document.createElement('button');
      b.type = 'button';
      // Mismo tamaño que el botón real: alto según size (large 40px, por defecto) y el ancho pedido
      const alto = { large: 40, medium: 32, small: 20 }[opciones.size ?? 'large'] ?? 40;
      b.style.height = alto + 'px';
      if (opciones.width) b.style.width = opciones.width + 'px';
      b.textContent = 'Iniciar sesión con Google';
      b.setAttribute('data-testid', 'google-login');
      b.onclick = () => window.__gsiConfig.callback({ credential: 'credencial-google-falsa', select_by: 'btn' });
      el.appendChild(b);
    },
    prompt() {}, cancel() {}, disableAutoSelect() {},
  } } };
`;

class ApiFalsa {
  constructor() {
    this.manejadores = [];
    this.peticiones  = [];
    this.inesperadas = [];
  }

  /**
   * Registra una respuesta. `ruta` es el pathname exacto ('/api/alertas') o una RegExp.
   * `respuesta` es el JSON a devolver con 200, o una función ({ url, metodo, body }) =>
   * { status?, json } para decidir según la petición. El último registrado tiene prioridad.
   */
  on(metodo, ruta, respuesta) {
    this.manejadores.unshift({ metodo: metodo.toUpperCase(), ruta, respuesta });
    return this;
  }

  /** Peticiones recibidas que coinciden con método y ruta. */
  llamadas(metodo, ruta) {
    return this.peticiones.filter(p => p.metodo === metodo.toUpperCase() && coincide(ruta, p.url.pathname));
  }

  async atender(route) {
    const req    = route.request();
    const metodo = req.method();
    if (metodo === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });

    const url  = new URL(req.url());
    let body = null;
    try { body = req.postDataJSON(); } catch { body = req.postData(); }
    const peticion = { metodo, url, body, headers: req.headers() };
    this.peticiones.push(peticion);

    const m = this.manejadores.find(h => h.metodo === metodo && coincide(h.ruta, url.pathname));
    if (!m) {
      this.inesperadas.push(`${metodo} ${url.pathname}${url.search}`);
      return route.fulfill({ status: 501, headers: CORS, json: { mensaje: `Sin mock e2e para ${metodo} ${url.pathname}` } });
    }
    const r = typeof m.respuesta === 'function' ? await m.respuesta(peticion) : { json: m.respuesta };
    return route.fulfill({ status: r.status ?? 200, headers: CORS, json: r.json });
  }
}

function coincide(ruta, pathname) {
  return ruta instanceof RegExp ? ruta.test(pathname) : ruta === pathname;
}

/** Respuestas que pide el layout del panel y el dashboard en cualquier página. */
function registrarBase(api) {
  api
    .on('GET', '/api/configuracion/publica', CONFIG_PUBLICA)
    .on('GET', '/api/alertas', [])
    .on('GET', '/api/beneficiarios/stats-ninos', {})
    .on('GET', '/api/talento-humano/stats', { contratosProximosVencer: 0, novedadesPendientes: 0 })
    .on('GET', '/api/inventario/stats', { stockBajo: 0, sinStock: 0 })
    .on('GET', '/api/inventario/comodatos-proximos', [])
    // Registro de auditoría que el panel envía tras cada exportación a Excel/PDF
    .on('POST', '/api/archivos/log-exportacion', {});
}

/**
 * Respuesta de un listado vacío que sirve tanto si la página lo pide paginado
 * (envía `pagina` → { data, total, pagina, porPagina }) como si espera un arreglo.
 */
export function listadoVacio({ url }) {
  if (!url.searchParams.has('pagina')) return { json: [] };
  return { json: {
    data: [], total: 0,
    pagina: Number(url.searchParams.get('pagina')),
    porPagina: Number(url.searchParams.get('porPagina') ?? 15),
  } };
}

/**
 * GET /api/beneficiarios (resumen) con búsqueda simple por nombre o documento,
 * GET /api/beneficiarios/exportar (ficha completa) y GET /api/beneficiarios/{id} (detalle).
 */
export function mockListaBeneficiarios(api) {
  const filtrar = url => {
    const q = (url.searchParams.get('buscar') ?? '').toLowerCase();
    return BENEFICIARIOS.filter(b =>
      !q || b.nombreMenor.toLowerCase().includes(q) || b.numeroDocumento.includes(q));
  };
  api.on('GET', /^\/api\/beneficiarios\/\d+$/, ({ url }) => {
    const id = Number(url.pathname.split('/').pop());
    return { json: BENEFICIARIOS.find(b => b.id === id) ?? BENEFICIARIOS[0] };
  });
  api.on('GET', '/api/beneficiarios', ({ url }) => {
    const data = filtrar(url).map(resumenBeneficiario);
    return { json: { data, total: data.length, pagina: Number(url.searchParams.get('pagina')), porPagina: 15 } };
  });
  api.on('GET', '/api/beneficiarios/exportar', ({ url }) => {
    const data = filtrar(url);
    return { json: { data, total: data.length, pagina: Number(url.searchParams.get('pagina')), porPagina: 100 } };
  });
  api.on('GET', '/api/beneficiarios/stats', STATS_BENEFICIARIOS);
}

export const test = base.extend({
  // auto: se instala en todas las pruebas, aunque no pidan `api`
  api: [async ({ page }, use) => {
    const api = new ApiFalsa();
    registrarBase(api);

    // La CSP de index.html no debe bloquear nada de la propia app (scripts, estilos, API…)
    const violacionesCsp = [];
    page.on('console', m => {
      if (m.type() === 'error' && /Content Security Policy/i.test(m.text())) violacionesCsp.push(m.text());
    });

    // 1) Cualquier origen externo no previsto: se anota y se aborta.
    //    (las rutas registradas después tienen prioridad sobre esta)
    await page.route(url => url.hostname !== 'localhost', route => {
      api.inesperadas.push(`EXTERNO ${route.request().method()} ${route.request().url()}`);
      return route.abort('blockedbyclient');
    });
    // 2) Stubs genéricos deliberados: Google Identity Services y Google Fonts.
    await page.route('https://accounts.google.com/gsi/client', route =>
      route.fulfill({ contentType: 'text/javascript', body: GSI_FALSO }));
    await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route =>
      route.fulfill({ contentType: 'text/css', body: '' }));
    // 3) La API falsa.
    await page.route(url => url.origin === API, route => api.atender(route));

    await use(api);

    expect(api.inesperadas, 'peticiones sin mock (agrega api.on(...) en la prueba)').toEqual([]);
    expect(violacionesCsp, 'la política de seguridad (CSP) bloqueó algo de la app').toEqual([]);
  }, { auto: true }],

  /** Sesión de administrador sembrada en localStorage antes de cargar la app. */
  sesion: async ({ page }, use) => {
    // extra → localStorage; extraSesion → sessionStorage (p. ej. el borrador del formulario)
    const sembrar = async ({ rol = 'administrador', permisos = {}, token = crearJwt(), extra = {}, extraSesion = {} } = {}) => {
      await page.addInitScript(({ token, user, rol, permisos, extra, extraSesion }) => {
        // Solo en la primera carga de la pestaña: si la app cierra la sesión y
        // recarga, no se vuelve a sembrar.
        if (sessionStorage.getItem('e2e_sesion_sembrada')) return;
        sessionStorage.setItem('e2e_sesion_sembrada', '1');
        localStorage.setItem('admin_token', token);
        localStorage.setItem('admin_user', JSON.stringify(user));
        localStorage.setItem('admin_rol', rol);
        localStorage.setItem('admin_permisos', JSON.stringify(permisos));
        for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
        for (const [k, v] of Object.entries(extraSesion)) sessionStorage.setItem(k, v);
      }, { token, user: USUARIO, rol, permisos, extra, extraSesion });
      return token;
    };
    await use(sembrar);
  },
});

export { expect };
