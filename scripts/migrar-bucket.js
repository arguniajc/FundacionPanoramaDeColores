/**
 * Migra todos los archivos de fotos-inscripciones → beneficiarios
 * y actualiza las URLs en la tabla `archivos`.
 *
 * Uso: node scripts/migrar-bucket.js
 */

const SUPABASE_URL  = 'https://hfitfoevyqbhkqjeaegs.supabase.co';
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_KEY ?? '';
const BUCKET_ORIGEN = 'fotos-inscripciones';
const BUCKET_DEST   = 'beneficiarios';

if (!SERVICE_KEY) {
  console.error('❌  Falta SUPABASE_SERVICE_KEY. Ejecútalo así:');
  console.error('    SUPABASE_SERVICE_KEY="eyJ..." node scripts/migrar-bucket.js');
  process.exit(1);
}

const headers = (extra = {}) => ({
  Authorization: `Bearer ${SERVICE_KEY}`,
  apikey: SERVICE_KEY,
  ...extra,
});

// ── Listar objetos en un prefijo del bucket ──────────────────────────────────
async function listar(bucket, prefix = '') {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } }),
  });
  if (!res.ok) throw new Error(`listar ${bucket}/${prefix}: ${await res.text()}`);
  return res.json();
}

// ── Listar todos los archivos recursivamente ─────────────────────────────────
async function listarTodos(bucket, prefix = '') {
  const items   = await listar(bucket, prefix);
  const archivos = [];
  for (const item of items) {
    if (item.id) {
      archivos.push(prefix ? `${prefix}/${item.name}` : item.name);
    } else {
      // es carpeta
      const sub = prefix ? `${prefix}/${item.name}` : item.name;
      archivos.push(...await listarTodos(bucket, sub));
    }
  }
  return archivos;
}

// ── Descargar un archivo ─────────────────────────────────────────────────────
async function descargar(bucket, path) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`descargar ${path}: ${await res.text()}`);
  return { buffer: await res.arrayBuffer(), contentType: res.headers.get('content-type') ?? 'application/octet-stream' };
}

// ── Subir un archivo ─────────────────────────────────────────────────────────
async function subir(bucket, path, buffer, contentType) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
    {
      method: 'POST',
      headers: headers({ 'Content-Type': contentType, 'x-upsert': 'true' }),
      body: buffer,
    }
  );
  if (!res.ok) throw new Error(`subir ${path}: ${await res.text()}`);
}

// ── Actualizar URLs en la tabla archivos vía PostgREST ───────────────────────
async function actualizarUrls() {
  // Obtener todos los registros con la URL del bucket viejo
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/archivos?url=like.*${BUCKET_ORIGEN}*&select=id,url`,
    { headers: headers({ Accept: 'application/json' }) }
  );
  if (!res.ok) throw new Error(`leer archivos: ${await res.text()}`);
  const rows = await res.json();

  if (rows.length === 0) {
    console.log('   No hay registros en BD que apunten al bucket viejo.');
    return;
  }

  console.log(`   Actualizando ${rows.length} registro(s) en la BD…`);
  for (const row of rows) {
    const nuevaUrl = row.url.replace(
      `/storage/v1/object/public/${BUCKET_ORIGEN}/`,
      `/storage/v1/object/public/${BUCKET_DEST}/`
    );
    const upd = await fetch(
      `${SUPABASE_URL}/rest/v1/archivos?id=eq.${row.id}`,
      {
        method: 'PATCH',
        headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({ url: nuevaUrl }),
      }
    );
    if (!upd.ok) throw new Error(`actualizar fila ${row.id}: ${await upd.text()}`);
    console.log(`   ✓ ${row.url.split('/').pop()} → ${BUCKET_DEST}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔍  Listando archivos en "${BUCKET_ORIGEN}"…`);
  const archivos = await listarTodos(BUCKET_ORIGEN);

  if (archivos.length === 0) {
    console.log('   El bucket de origen está vacío. Nada que migrar.\n');
    return;
  }

  console.log(`   Encontrados: ${archivos.length} archivo(s)\n`);

  let ok = 0, err = 0;
  for (const path of archivos) {
    try {
      process.stdout.write(`   Copiando ${path}… `);
      const { buffer, contentType } = await descargar(BUCKET_ORIGEN, path);
      await subir(BUCKET_DEST, path, buffer, contentType);
      console.log('✓');
      ok++;
    } catch (e) {
      console.log(`✗  ${e.message}`);
      err++;
    }
  }

  console.log(`\n📦  Archivos copiados: ${ok}  |  Errores: ${err}`);

  console.log('\n🗄️   Actualizando URLs en la base de datos…');
  await actualizarUrls();

  console.log('\n✅  Migración completa.');
  console.log('   Puedes eliminar el bucket "fotos-inscripciones" desde el dashboard de Supabase.\n');
}

main().catch(err => { console.error('\n❌ Error:', err.message); process.exit(1); });
