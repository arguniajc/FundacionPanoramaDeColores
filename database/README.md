# Base de datos

## Fuente única de verdad

El esquema de PostgreSQL (Supabase) se define **solo** en
[`backend/FundacionPanorama.API/Data/DbMigrations.cs`](../backend/FundacionPanorama.API/Data/DbMigrations.cs).

- `DbMigrations.RunAsync` se ejecuta **en cada arranque de la API**.
- Primero verifica la conexión; si falla, cancela todas las migraciones (evita
  disparar el circuit breaker del pooler de Supabase).
- Cada paso es **idempotente**: sobre una BD vacía crea todo el esquema en orden;
  sobre una BD al día no cambia nada.
- Si un paso falla, se registra un aviso (`⚠️ Migración omitida [...]`) y el
  arranque continúa. Revisa los logs después de cada despliegue.

Orden dentro de `RunAsync`:

1. `_migraciones_ejecutadas` (control de migraciones únicas).
2. `CrearEsquemaBaseAsync`: esquema base (antes `01_schema.sql`). Cada tabla se
   crea con sus índices, trigger y semillas **solo si la tabla no existe**.
3. Pasos incrementales (columnas, tablas nuevas, índices, semillas, FKs).
4. Campos obligatorios (`SET NOT NULL` protegido, antes `05`/`07`).

## Cómo agregar una migración

Añade el paso **al final** de `RunAsync` (nunca en medio: el orden importa
para crear una BD desde cero).

**Cambio de esquema** → `Migrar(sql, etiqueta)`, escrito para poder repetirse
en cada arranque sin efecto:

```csharp
await Migrar("ALTER TABLE donantes ADD COLUMN IF NOT EXISTS nit VARCHAR(30)", "donantes.nit");
await Migrar("CREATE INDEX IF NOT EXISTS idx_donantes_nit ON donantes(nit)", "donantes.idx_nit");
await Migrar("""
    CREATE TABLE IF NOT EXISTS mi_tabla (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ...
    )
    """, "mi_tabla");
// Constraints: no existe ADD CONSTRAINT IF NOT EXISTS, usa un bloque DO
await Migrar("""
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_x') THEN
            ALTER TABLE t ADD CONSTRAINT fk_x FOREIGN KEY (c) REFERENCES otra(id) NOT VALID;
        END IF;
    END $$
    """, "t.fk_x");
// Semillas
await Migrar("INSERT INTO cat_x (codigo, nombre) VALUES ('A','A') ON CONFLICT (codigo) DO NOTHING", "cat_x.seed");
```

**Transformación de datos de una sola vez** (rellenar, mover, normalizar) →
`MigrarUnaVez(sql, etiqueta)`. Registra la etiqueta en
`_migraciones_ejecutadas` y no vuelve a ejecutarse. La etiqueta es la
identidad del paso: **nunca la cambies ni la reutilices**.

Reglas:

- Nada de `DROP` / cambios de tipo / reescrituras masivas en `Migrar`: se
  repetirían en cada arranque. Si es inevitable, usa `MigrarUnaVez` y piénsalo
  dos veces (producción no tiene vuelta atrás).
- Etiquetas únicas y descriptivas (`tabla.columna`, `tabla.idx_x`).
- No edites pasos ya desplegados para cambiar su efecto: añade uno nuevo.
- Las FKs sobre tablas con datos van con `NOT VALID`.
- `SET NOT NULL` → usa `SqlNotNullSiNoHayNulos(tabla, columna)`.

## `historico/`

Scripts SQL numerados (`01`…`07`) que se ejecutaron a mano en Supabase antes de
consolidar todo en `DbMigrations.cs`. Son **solo referencia**: no se ejecutan ni
deben ejecutarse. Su esquema ya está cubierto por `DbMigrations.cs`; las
transformaciones de datos (`02_migracion.sql`, el `UPDATE` de `05`, los rellenos
de `07`) fueron puntuales y no se portaron.
