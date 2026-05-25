# scripts/

Scripts de migración histórica — **ya ejecutados, no volver a correr en producción.**

Se conservan como referencia por si se necesitan en un entorno nuevo.

## Requisitos

```powershell
cd scripts
npm install
```

## Scripts

### `migrar-bucket.js`
Migró todos los archivos del bucket `fotos-inscripciones` → `beneficiarios` en Supabase Storage y actualizó las URLs en la tabla `archivos`.

```powershell
$env:SUPABASE_SERVICE_KEY="eyJ..."
node scripts/migrar-bucket.js
```

### `convertir-imagenes-a-pdf.js`
Convirtió los registros de tipo "Foto documento" que estaban como JPEG/PNG en PDFs reales usando pdf-lib.

```powershell
$env:SUPABASE_SERVICE_KEY="eyJ..."
node scripts/convertir-imagenes-a-pdf.js
```

### `generar-pdfs-documentos.js`
Generó PDFs combinados (frente + reverso) para beneficiarios que tenían las fotos del documento guardadas por separado.

```powershell
$env:SUPABASE_SERVICE_KEY="eyJ..."
node scripts/generar-pdfs-documentos.js
```
