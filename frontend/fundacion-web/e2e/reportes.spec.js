import { test, expect } from './support/fixtures.js';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const REPORTE_BENEFICIARIOS = {
  anio: 2026,
  resumen: { total: 120, activos: 110, inactivos: 10, conDiscapacidad: 4, conAutorizacion: 100 },
  porEdad: [{ etiqueta: '0 – 5 años', cantidad: 20 }, { etiqueta: '6 – 8 años', cantidad: 40 }, { etiqueta: '9 – 11 años', cantidad: 60 }],
  porGenero: [{ etiqueta: 'Femenino', cantidad: 60 }, { etiqueta: 'Masculino', cantidad: 60 }],
  porPrograma: [{ etiqueta: 'Arte', cantidad: 50 }, { etiqueta: 'Deporte', cantidad: 70 }],
  porGrado: [{ etiqueta: '1°', cantidad: 30 }, { etiqueta: '2°', cantidad: 90 }],
  nuevosPorMes: MESES.map((mes, i) => ({ mes, cantidad: (i * 7) % 15 })),
};

test.describe('Reportes', () => {
  test('el PDF sale con fondo blanco aunque la pantalla esté en modo oscuro', async ({ page, api, sesion }) => {
    await sesion({ extra: { themeMode: 'dark' } });
    api.on('GET', '/api/reportes/beneficiarios', REPORTE_BENEFICIARIOS);
    // Guarda las imágenes que se pasan al PDF (canvas → PNG) para revisarlas
    await page.addInitScript(() => {
      window.__imagenesPdf = [];
      const original = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function (...args) {
        const url = original.apply(this, args);
        window.__imagenesPdf.push(url);
        return url;
      };
    });

    await page.goto('#/sede/reportes');
    await expect(page.getByText('Total registrados').first()).toBeVisible();
    // Deja terminar la animación de las gráficas
    await page.waitForTimeout(1600);

    await page.evaluate(() => { window.__imagenesPdf = []; });
    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar PDF' }).click();
    expect((await descarga).suggestedFilename()).toMatch(/^reporte_beneficiarios_\d{4}-\d{2}-\d{2}\.pdf$/);

    // La pantalla sigue en modo oscuro
    expect(await page.evaluate(() => document.documentElement.dataset.modo)).toBe('dark');

    // Las páginas del PDF son claras: casi ningún píxel oscuro y luminosidad media alta
    const analisis = await page.evaluate(async () => {
      const resultados = [];
      for (const url of window.__imagenesPdf) {
        const img = new Image();
        img.src = url;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, c.width, c.height);
        let oscuros = 0, suma = 0, total = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) continue; // transparente
          total++;
          const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          suma += l;
          if (l < 60) oscuros++;
        }
        // html2canvas pinta canvas vacíos (transparentes) para detectar capacidades: se ignoran
        if (total) resultados.push({ media: suma / total, oscuros: oscuros / total });
      }
      return resultados;
    });
    expect(analisis.length).toBeGreaterThan(0);
    for (const pagina of analisis) {
      expect(pagina.media).toBeGreaterThan(200);
      expect(pagina.oscuros).toBeLessThan(0.08);
    }
    expect(api.llamadas('POST', '/api/archivos/log-exportacion')).toHaveLength(1);
  });
});
