// Auditoría responsive: recorre cada ruta del panel (y sus pestañas) en móvil,
// tablet y escritorio, mide problemas de diseño y guarda capturas de página
// completa. También abre los diálogos principales en móvil.
// Ver playwright.audit.config.js para ejecutarla. No es una prueba: nunca falla
// por lo que mide; solo deja resultados en AUDITORIA_DIR.
import fs from 'node:fs';
import path from 'node:path';
import { test } from '../support/fixtures.js';
import { medirPagina } from './medir.js';
import { registrar as registrarA, RUTAS_A, DIALOGOS_A } from './mocks/grupoA.js';
import { registrar as registrarB, RUTAS_B, DIALOGOS_B } from './mocks/grupoB.js';
import { registrar as registrarC, RUTAS_C, DIALOGOS_C } from './mocks/grupoC.js';

export const DIR = path.resolve(process.env.AUDITORIA_DIR ?? 'test-results/auditoria-responsive');
const DATOS = path.join(DIR, 'datos');
fs.mkdirSync(DATOS, { recursive: true });

const VIEWPORTS = [
  { nombre: 'phone',   width: 390,  height: 844 },
  { nombre: 'tablet',  width: 768,  height: 1024 },
  { nombre: 'desktop', width: 1440, height: 900 },
];
const PHONE = VIEWPORTS[0];

const filtro = process.env.AUDITORIA_SOLO ? new RegExp(process.env.AUDITORIA_SOLO, 'i') : null;
const incluir = nombre => !filtro || filtro.test(nombre);

const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function preparar(page, api, sesion, { sinSesion, extra } = {}) {
  page.setDefaultTimeout(10_000);
  registrarA(api);
  registrarB(api);
  registrarC(api);
  // La auditoría no exige que todo tenga mock: anota lo que falte y sigue.
  if (!sinSesion) await sesion(extra ? { extra } : {});
}

/** Espera a que la página termine de cargar datos y animaciones. */
async function estabilizar(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('.MuiCircularProgress-root, .MuiSkeleton-root, .MuiLinearProgress-root')
    .first().waitFor({ state: 'detached', timeout: 6_000 }).catch(() => {});
  await page.waitForTimeout(600);
}

function guardar(id, datos) {
  fs.writeFileSync(path.join(DATOS, `${id}.json`), JSON.stringify(datos, null, 2));
}

function noMockeadas(api) {
  const lista = [...new Set(api.inesperadas)];
  api.inesperadas.length = 0; // la auditoría no falla por esto
  return lista;
}

const RUTAS = [...RUTAS_C.filter(r => r.sinSesion), ...RUTAS_C.filter(r => !r.sinSesion && /dashboard/i.test(r.nombre)),
  ...RUTAS_A, ...RUTAS_B, ...RUTAS_C.filter(r => !r.sinSesion && !/dashboard/i.test(r.nombre))];
const DIALOGOS = [...DIALOGOS_A, ...DIALOGOS_B, ...DIALOGOS_C];

// Lo que llegue sin mock después de la última medición tampoco hace fallar la auditoría
test.afterEach(({ api }) => { api.inesperadas.length = 0; });

test.describe('Páginas', () => {
  for (const ruta of RUTAS) {
    if (!incluir(ruta.nombre)) continue;
    for (const vp of VIEWPORTS) {
      test(`${ruta.nombre} @ ${vp.nombre}`, async ({ page, api, sesion }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await preparar(page, api, sesion, ruta);
        await page.goto(ruta.hash);
        await estabilizar(page);

        const vistas = [{ nombre: null }];
        for (const tab of ruta.tabs ?? []) vistas.push({ nombre: tab });
        // Si hay pestañas, la vista inicial es la primera pestaña: no se duplica
        if (ruta.tabs?.length) vistas.shift();

        for (const vista of vistas) {
          const id = [slug(ruta.nombre), vista.nombre && slug(vista.nombre), vp.nombre].filter(Boolean).join('-');
          let error = null;
          if (vista.nombre) {
            try {
              await page.getByRole('tab', { name: vista.nombre, exact: true }).first().click({ timeout: 5_000 });
              await estabilizar(page);
              // Pestañas que solo cargan datos tras pulsar un botón (p. ej. "Generar Reporte")
              const boton = ruta.clicTrasTab?.[vista.nombre];
              if (boton) {
                await page.getByRole('button', { name: boton }).first().click({ timeout: 5_000 });
                await estabilizar(page);
              }
            } catch (e) { error = `no se pudo abrir la pestaña: ${e.message.split('\n')[0]}`; }
          }
          const medidas = await page.evaluate(medirPagina, { movil: vp.nombre === 'phone' });
          await page.screenshot({ path: path.join(DIR, `${id}.png`), fullPage: true });
          guardar(id, { tipo: 'pagina', ruta: ruta.nombre, vista: vista.nombre, viewport: vp.nombre, error, sinMock: noMockeadas(api), ...medidas });
        }
      });
    }
  }
});

test.describe('Diálogos en móvil', () => {
  for (const dlg of DIALOGOS) {
    if (!incluir(dlg.nombre)) continue;
    test(`diálogo ${dlg.nombre} @ phone`, async ({ page, api, sesion }) => {
      await page.setViewportSize({ width: PHONE.width, height: PHONE.height });
      await preparar(page, api, sesion, dlg);
      await page.goto(dlg.hash);
      await estabilizar(page);
      const id = `dlg-${slug(dlg.nombre)}-phone`;
      let error = null;
      try {
        await dlg.abrir(page);
        await estabilizar(page);
      } catch (e) { error = `no se pudo abrir: ${e.message.split('\n')[0]}`; }
      const hayDialogo = await page.locator('.MuiDialog-paper, .MuiDrawer-modal .MuiDrawer-paper').count();
      const medidas = hayDialogo
        ? await page.evaluate(medirPagina, { movil: true, raiz: '.MuiDialog-paper, .MuiDrawer-modal .MuiDrawer-paper' })
        : await page.evaluate(medirPagina, { movil: true });
      await page.screenshot({ path: path.join(DIR, `${id}.png`), fullPage: true });
      guardar(id, { tipo: 'dialogo', ruta: dlg.nombre, viewport: 'phone', error, sinMock: noMockeadas(api), ...medidas });
    });
  }
});
