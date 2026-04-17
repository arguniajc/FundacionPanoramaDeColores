/**
 * Genera PDFs combinados (frente + reverso) para los beneficiarios que aún
 * tienen las fotos del documento guardadas por separado.
 *
 * Uso:
 *   $env:SUPABASE_SERVICE_KEY="eyJ..."   # PowerShell
 *   node scripts/generar-pdfs-documentos.js
 */

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const SUPABASE_URL = 'https://hfitfoevyqbhkqjeaegs.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY ?? '';
const BUCKET       = 'beneficiarios';

if (!SERVICE_KEY) {
  console.error('❌  Falta SUPABASE_SERVICE_KEY.');
  process.exit(1);
}

const headers = (extra = {}) => ({
  Authorization: `Bearer ${SERVICE_KEY}`,
  apikey: SERVICE_KEY,
  ...extra,
});

// ── Helpers REST ─────────────────────────────────────────────────────────────
async function get(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: headers({ Accept: 'application/json' }),
  });
  if (!r.ok) throw new Error(`GET ${path}: ${await r.text()}`);
  return r.json();
}

async function patch(path, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PATCH ${path}: ${await r.text()}`);
}

async function del(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!r.ok) throw new Error(`DELETE ${path}: ${await r.text()}`);
}

// ── Descargar imagen como ArrayBuffer ────────────────────────────────────────
async function descargarImagen(url) {
  const r = await fetch(url, { headers: headers() });
  if (!r.ok) throw new Error(`No se pudo descargar: ${url}`);
  const contentType = r.headers.get('content-type') ?? '';
  return { buffer: await r.arrayBuffer(), contentType };
}

// ── Incrustar imagen en pdf-lib según su tipo ────────────────────────────────
async function incrustarImagen(pdfDoc, buffer, contentType) {
  if (contentType.includes('png')) return pdfDoc.embedPng(buffer);
  return pdfDoc.embedJpg(buffer); // JPEG, WEBP convertido, etc.
}

// ── Subir PDF a Supabase Storage ─────────────────────────────────────────────
async function subirPdf(pdfBytes, entidadId) {
  const path     = `documentos/${entidadId}-${Date.now()}.pdf`;
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;

  const r = await fetch(uploadUrl, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/pdf', 'x-upsert': 'true' }),
    body: pdfBytes,
  });
  if (!r.ok) throw new Error(`Upload PDF: ${await r.text()}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

// ── Generar PDF A4 con frente arriba y reverso abajo ─────────────────────────
async function generarPdf(frenteBuffer, frenteCT, reversoBuffer, reversoCT) {
  const pdfDoc = await PDFDocument.create();
  const font   = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page   = pdfDoc.addPage([595, 842]); // A4 puntos
  const { width: W, height: H } = page.getSize();
  const m    = 40;
  const imgW = W - m * 2;
  const imgH = H / 2 - m * 2.2;

  const frenteImg  = await incrustarImagen(pdfDoc, frenteBuffer,  frenteCT);
  const reversoImg = await incrustarImagen(pdfDoc, reversoBuffer, reversoCT);

  // Etiqueta + imagen frente
  page.drawText('Frente del documento', {
    x: m, y: H / 2 + m * 1.4 + imgH + 4,
    size: 9, font, color: rgb(0.4, 0.4, 0.4),
  });
  page.drawImage(frenteImg, {
    x: m, y: H / 2 + m * 1.4,
    width: imgW, height: imgH,
  });

  // Etiqueta + imagen reverso
  page.drawText('Reverso del documento', {
    x: m, y: m + imgH + 6,
    size: 9, font, color: rgb(0.4, 0.4, 0.4),
  });
  page.drawImage(reversoImg, {
    x: m, y: m,
    width: imgW, height: imgH,
  });

  return pdfDoc.save();
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Obtener IDs de tipos de archivo
  console.log('\n🔍  Consultando catálogo de tipos de archivo…');
  const cats = await get('cat_tipo_archivo?select=id,nombre');
  const idFrente  = cats.find(c => c.nombre === 'Foto documento')?.id;
  const idReverso = cats.find(c => c.nombre === 'Foto documento (reverso)')?.id;

  if (!idFrente || !idReverso) {
    console.error('❌  No se encontraron los tipos "Foto documento" o "Foto documento (reverso)" en cat_tipo_archivo.');
    console.log('   Tipos disponibles:', cats.map(c => `${c.id}: ${c.nombre}`).join(', '));
    process.exit(1);
  }

  // 2. Traer todas las fotos de frente que NO sean PDF
  console.log('🔍  Buscando documentos con fotos separadas…');
  const frentes  = await get(`archivos?tipo_archivo_id=eq.${idFrente}&select=id,entidad_id,url`);
  const reversos = await get(`archivos?tipo_archivo_id=eq.${idReverso}&select=id,entidad_id,url`);

  // Filtrar los frentes que aún son imágenes (no PDF ya generado)
  const pendientes = frentes.filter(f =>
    !f.url.endsWith('.pdf') &&
    reversos.some(r => r.entidad_id === f.entidad_id)
  );

  if (pendientes.length === 0) {
    console.log('   ✅ Todos los documentos ya tienen PDF. Nada que hacer.\n');
    return;
  }

  console.log(`   Encontrados: ${pendientes.length} beneficiario(s) con fotos separadas\n`);

  let ok = 0, err = 0;

  for (const frente of pendientes) {
    const reverso = reversos.find(r => r.entidad_id === frente.entidad_id);
    process.stdout.write(`   Procesando beneficiario ${frente.entidad_id}… `);
    try {
      const { buffer: fBuf, contentType: fCT } = await descargarImagen(frente.url);
      const { buffer: rBuf, contentType: rCT } = await descargarImagen(reverso.url);

      const pdfBytes = await generarPdf(fBuf, fCT, rBuf, rCT);
      const pdfUrl   = await subirPdf(pdfBytes, frente.entidad_id);

      // Actualizar frente con la URL del PDF
      await patch(`archivos?id=eq.${frente.id}`, { url: pdfUrl });

      // Eliminar el registro del reverso (ya está dentro del PDF)
      await del(`archivos?id=eq.${reverso.id}`);

      console.log('✓');
      ok++;
    } catch (e) {
      console.log(`✗  ${e.message}`);
      err++;
    }
  }

  console.log(`\n📄  PDFs generados: ${ok}  |  Errores: ${err}`);
  console.log('✅  Proceso completo.\n');
}

main().catch(err => { console.error('\n❌ Error:', err.message); process.exit(1); });
