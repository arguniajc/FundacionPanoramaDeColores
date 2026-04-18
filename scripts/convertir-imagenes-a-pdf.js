/**
 * Convierte a PDF todos los registros de tipo "Foto documento" que en Supabase
 * son imágenes (JPEG / PNG) en lugar de PDFs reales.
 *
 * Uso:
 *   SUPABASE_SERVICE_KEY="eyJ..." node scripts/convertir-imagenes-a-pdf.js
 *
 * Lo que hace por cada registro afectado:
 *   1. Descarga la imagen desde Supabase Storage
 *   2. Crea un PDF A4 con esa imagen usando pdf-lib
 *   3. Sube el PDF al bucket beneficiarios/documentos/<nuevo-uuid>.pdf
 *   4. Actualiza la URL en la tabla `archivos`
 */

const { PDFDocument } = require('pdf-lib');

const SUPABASE_URL = 'https://hfitfoevyqbhkqjeaegs.supabase.co';
const BUCKET       = 'beneficiarios';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY ?? '';

if (!SERVICE_KEY) {
  console.error('❌  Falta SUPABASE_SERVICE_KEY. Ejecútalo así:');
  console.error('    SUPABASE_SERVICE_KEY="eyJ..." node scripts/convertir-imagenes-a-pdf.js');
  process.exit(1);
}

const hdrs = (extra = {}) => ({
  Authorization: `Bearer ${SERVICE_KEY}`,
  apikey:        SERVICE_KEY,
  ...extra,
});

// ── Detectar si un buffer es PDF por magic bytes ─────────────────────────────
function esPdf(buffer) {
  const b = Buffer.from(buffer);
  return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; // %PDF
}

// ── Descargar archivo desde Supabase ─────────────────────────────────────────
async function descargar(url) {
  const res = await fetch(url, { headers: hdrs() });
  if (!res.ok) throw new Error(`descargar (${res.status}): ${await res.text()}`);
  const buffer      = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
  return { buffer, contentType };
}

// ── Subir PDF al bucket ───────────────────────────────────────────────────────
async function subirPdf(path, pdfBuffer) {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
  const res = await fetch(url, {
    method:  'POST',
    headers: hdrs({ 'Content-Type': 'application/pdf', 'x-upsert': 'true' }),
    body:    pdfBuffer,
  });
  if (!res.ok) throw new Error(`subir PDF (${res.status}): ${await res.text()}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

// ── Actualizar URL en tabla archivos ─────────────────────────────────────────
async function actualizarUrl(id, nuevaUrl) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/archivos?id=eq.${id}`, {
    method:  'PATCH',
    headers: hdrs({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body:    JSON.stringify({ url: nuevaUrl }),
  });
  if (!res.ok) throw new Error(`actualizar fila ${id} (${res.status}): ${await res.text()}`);
}

// ── Convertir imagen a PDF con pdf-lib ────────────────────────────────────────
async function imagenAPdf(buffer, contentType) {
  const pdfDoc = await PDFDocument.create();
  // A4 en puntos: 595.28 x 841.89
  const page   = pdfDoc.addPage([595.28, 841.89]);

  let img;
  const ct = contentType.toLowerCase();
  if (ct.includes('png')) {
    img = await pdfDoc.embedPng(buffer);
  } else {
    // JPEG, WEBP tratado como JPEG
    img = await pdfDoc.embedJpg(buffer);
  }

  const { width, height } = img.scale(1);
  const margen  = 28; // ~1 cm
  const maxW    = page.getWidth()  - margen * 2;
  const maxH    = page.getHeight() - margen * 2;

  // Escalar manteniendo proporción
  const escala  = Math.min(maxW / width, maxH / height);
  const imgW    = width  * escala;
  const imgH    = height * escala;
  const x       = margen + (maxW - imgW) / 2;
  const y       = margen + (maxH - imgH) / 2;

  page.drawImage(img, { x, y, width: imgW, height: imgH });

  return pdfDoc.save();
}

// ── Obtener todos los archivos de tipo "Foto documento" ───────────────────────
async function obtenerRegistros() {
  // Traer todos los archivos activos de tipo "Foto documento"
  // JOIN con cat_tipo_archivo filtrando por nombre
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/archivos?select=id,url,tipo_archivo_id,cat_tipo_archivo(nombre)&activo=eq.true`,
    { headers: hdrs({ Accept: 'application/json' }) }
  );
  if (!res.ok) throw new Error(`leer archivos (${res.status}): ${await res.text()}`);
  const rows = await res.json();

  // Filtrar solo los de tipo "Foto documento" (no reverso)
  return rows.filter(r => {
    const nombre = r.cat_tipo_archivo?.nombre ?? '';
    return nombre === 'Foto documento';
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔍  Consultando registros de tipo "Foto documento"…');
  const registros = await obtenerRegistros();
  console.log(`   Total encontrados: ${registros.length}`);

  // Filtrar solo los que son imágenes (no PDFs)
  console.log('\n📥  Descargando y verificando tipo de archivo…');
  const pendientes = [];

  for (const reg of registros) {
    try {
      process.stdout.write(`   Verificando ${reg.id.substring(0, 8)}… `);
      const { buffer, contentType } = await descargar(reg.url);
      if (esPdf(buffer)) {
        console.log('✓ ya es PDF, omitir');
      } else {
        console.log(`⚠️  imagen (${contentType}) — necesita conversión`);
        pendientes.push({ ...reg, buffer, contentType });
      }
    } catch (e) {
      console.log(`✗  error al verificar: ${e.message}`);
    }
  }

  if (pendientes.length === 0) {
    console.log('\n✅  Todos los documentos ya son PDFs reales. Nada que hacer.\n');
    return;
  }

  console.log(`\n🔄  Convirtiendo ${pendientes.length} imagen(es) a PDF…\n`);

  let ok = 0, errores = 0;
  for (const reg of pendientes) {
    try {
      process.stdout.write(`   [${ok + errores + 1}/${pendientes.length}] ${reg.id.substring(0, 8)}… `);

      // Convertir imagen → PDF
      const pdfBytes = await imagenAPdf(reg.buffer, reg.contentType);

      // Generar nuevo path en el bucket
      const { randomUUID } = await import('crypto');
      const nuevaRuta = `documentos/${randomUUID()}.pdf`;

      // Subir PDF a Supabase
      const nuevaUrl = await subirPdf(nuevaRuta, pdfBytes);

      // Actualizar URL en la BD
      await actualizarUrl(reg.id, nuevaUrl);

      console.log(`✓  → ${nuevaRuta}`);
      ok++;
    } catch (e) {
      console.log(`✗  ${e.message}`);
      errores++;
    }
  }

  console.log(`\n📊  Resultado: ${ok} convertidos, ${errores} errores`);
  if (ok > 0) {
    console.log('✅  Migración completa. Los documentos ahora son PDFs reales en Supabase.\n');
  }
}

main().catch(err => { console.error('\n❌ Error fatal:', err.message); process.exit(1); });
