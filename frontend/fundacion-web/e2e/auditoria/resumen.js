// globalTeardown de la auditoría responsive: junta los JSON de cada caso en
// resumen.md (y resultados.json) dentro de AUDITORIA_DIR. Si se define
// AUDITORIA_COMPARAR=<otra carpeta de auditoría>, añade la columna "antes".
// También se puede ejecutar a mano: node e2e/auditoria/resumen.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function leer(dir) {
  const datos = path.join(dir, 'datos');
  if (!fs.existsSync(datos)) return {};
  const out = {};
  for (const f of fs.readdirSync(datos).filter(f => f.endsWith('.json')))
    out[f.replace(/\.json$/, '')] = JSON.parse(fs.readFileSync(path.join(datos, f), 'utf8'));
  return out;
}

const cifras = r => r ? {
  desborde: r.desborde ?? 0,
  fuera: r.nFuera ?? 0,
  tablas: r.tablas?.length ?? 0,
  fijos: r.fijos?.length ?? 0,
  elipsis: r.nElipsis ?? 0,
  tactiles: r.nTactiles ?? 0,
  dialogo: r.dialogo ? (r.dialogo.pantallaCompleta ? 'completo' : `${r.dialogo.ancho}px`) : '',
} : null;

const fmt = c => c
  ? `${c.desborde}px / ${c.fuera} / ${c.tablas} / ${c.fijos} / ${c.elipsis} / ${c.tactiles}${c.dialogo ? ` / ${c.dialogo}` : ''}`
  : '—';

export default function resumen() {
  const dir = path.resolve(process.env.AUDITORIA_DIR ?? 'test-results/auditoria-responsive');
  const ahora = leer(dir);
  const antes = process.env.AUDITORIA_COMPARAR ? leer(path.resolve(process.env.AUDITORIA_COMPARAR)) : null;
  const ids = Object.keys(ahora).sort();

  const lineas = [
    '# Auditoría responsive',
    '',
    'Columnas: desborde horizontal / elementos fuera del viewport / tablas sin scroll / fijos que tapan / textos con elipsis / táctiles < 40px (solo móvil) [/ ancho del diálogo]',
    '',
    antes ? '| caso | antes | ahora | error |' : '| caso | ahora | error |',
    antes ? '|---|---|---|---|' : '|---|---|---|',
  ];
  const tot = { desborde: 0, fuera: 0, tablas: 0, fijos: 0, tactiles: 0, dialogosNoCompletos: 0 };
  const totAntes = { desborde: 0, fuera: 0, tablas: 0, fijos: 0, tactiles: 0, dialogosNoCompletos: 0 };
  const sumar = (t, c, r) => {
    if (!c) return;
    if (c.desborde > 0) t.desborde++;
    t.fuera += c.fuera; t.tablas += c.tablas; t.fijos += c.fijos; t.tactiles += c.tactiles;
    if (r?.tipo === 'dialogo' && r.dialogo && !r.dialogo.pantallaCompleta) t.dialogosNoCompletos++;
  };
  for (const id of ids) {
    const c = cifras(ahora[id]);
    const a = antes ? cifras(antes[id]) : null;
    sumar(tot, c, ahora[id]);
    if (antes) sumar(totAntes, a, antes[id]);
    const err = ahora[id].error ? ahora[id].error.slice(0, 60) : '';
    lineas.push(antes ? `| ${id} | ${fmt(a)} | ${fmt(c)} | ${err} |` : `| ${id} | ${fmt(c)} | ${err} |`);
  }
  lineas.push('', '## Totales', '',
    '(casos con desborde horizontal, elementos fuera, tablas sin scroll, fijos que tapan, táctiles pequeños, diálogos no a pantalla completa en móvil)', '');
  if (antes) lineas.push(`- antes: ${JSON.stringify(totAntes)}`);
  lineas.push(`- ahora: ${JSON.stringify(tot)}`, '');

  lineas.push('## Detalle de problemas', '');
  for (const id of ids) {
    const r = ahora[id];
    const det = [];
    if (r.desborde > 0) det.push(`desborde horizontal ${r.desborde}px`);
    for (const f of r.fuera ?? []) det.push(`fuera del viewport: ${f.el} [${f.left}..${f.right}]`);
    for (const t of r.tablas ?? []) det.push(`tabla sin scroll: ${t}`);
    for (const f of r.fijos ?? []) det.push(`fijo que tapa: ${f}`);
    for (const e of r.elipsis ?? []) det.push(`elipsis: ${e}`);
    if (r.nTactiles) det.push(`táctiles < 40px (${r.nTactiles}): ${(r.tactiles ?? []).slice(0, 6).join(' | ')}`);
    if (r.sinMock?.length) det.push(`sin mock: ${r.sinMock.join(', ')}`);
    if (r.error) det.push(`error: ${r.error}`);
    if (!det.length) continue;
    lineas.push(`### ${id}`, ...det.map(d => `- ${d}`), '');
  }

  fs.writeFileSync(path.join(dir, 'resumen.md'), lineas.join('\n'));
  fs.writeFileSync(path.join(dir, 'resultados.json'), JSON.stringify(ahora, null, 2));
  console.log(`\nAuditoría responsive: ${ids.length} casos → ${path.join(dir, 'resumen.md')}`);
  if (antes) console.log('antes:', totAntes);
  console.log('ahora:', tot);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) resumen();
