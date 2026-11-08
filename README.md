# Fundación Panorama de Colores

Plataforma digital de la Fundación Panorama de Colores — Arte, deporte y conciencia ambiental para niñas y niños del barrio Panorama, Yumbo (Valle del Cauca).

---

## Estructura del repositorio

```
/
├── backend/            API REST — .NET 10 + PostgreSQL
├── frontend/           Panel administrativo — React 19 + Vite (código fuente)
├── database/           Guía de migraciones; historico/ = scripts SQL antiguos (solo referencia)
├── scripts/            Scripts de migración histórica (ejecución única)
├── .github/workflows/  CI/CD — build, keep-alive, auto-bump service worker
├── Dockerfile          Contenedor del backend (Render.com)
└── README.md
│
└── docs/               ← GitHub Pages sirve desde aquí
    ├── index.html          Landing page principal
    ├── 404.html            Página de error personalizada
    ├── privacidad.html     Política de privacidad
    ├── gestion/            Panel administrativo compilado (/gestion/)
    ├── panel/              Redirect /panel/ → /gestion/
    ├── css/                Estilos del sitio público
    ├── js/                 Scripts del sitio público
    ├── images/             Imágenes del sitio público
    ├── sw.js               Service worker (PWA)
    ├── manifest.json       Configuración PWA
    ├── CNAME               Dominio: fundacionpanoramadecolores.org
    ├── sitemap.xml         SEO
    ├── robots.txt          SEO
    └── google*.html        Verificación Google Search Console
```

---

## URLs

| Recurso | URL |
|---|---|
| Sitio web público | https://fundacionpanoramadecolores.org |
| Panel administrativo | https://fundacionpanoramadecolores.org/gestion/ |
| API backend | https://fundacionpanoramadecolores-nez4.onrender.com |

---

## Levantar el proyecto localmente

### Backend (.NET 10)

```powershell
cd backend

# Crear archivo de configuración local (NO se commitea — está en .gitignore)
# backend/FundacionPanorama.API/appsettings.Development.json
# {
#   "ConnectionStrings": { "DefaultConnection": "Host=...;Database=...;Username=...;Password=..." },
#   "Jwt":      { "Key": "<texto aleatorio largo>" },
#   "Supabase": { "ServiceKey": "sb_secret_..." }
# }
# ⚠️ Si apunta a la BD de PRODUCCIÓN, al arrancar la API se ejecutan las migraciones sobre ella.

dotnet restore FundacionPanorama.slnx
dotnet run --project FundacionPanorama.API
# API disponible en http://localhost:5000
```

### Frontend (React + Vite)

```powershell
cd frontend/fundacion-web

# Crear archivo de entorno local (NO se commitea — está en .gitignore)
# frontend/fundacion-web/.env.local
# VITE_API_URL=http://localhost:5000

npm install
npm run dev
# Panel disponible en http://localhost:5173
```

### Variables de entorno en producción (Render)

Los secretos **no** están en `appsettings.json`: la API se niega a arrancar si falta alguno y dice cuál.

| Variable | Uso |
|---|---|
| `ConnectionStrings__DefaultConnection` | Cadena de conexión a Supabase (pooler). La API exige TLS verificado (`VerifyFull`) contra la CA de Supabase incluida en `Certificados/`. |
| `Jwt__Key` | Clave de firma de las sesiones (texto aleatorio largo). Cambiarla cierra todas las sesiones. |
| `Supabase__ServiceKey` | Clave secreta `sb_secret_...` del Storage. |
| `OcrSpace__ApiKey` | (Opcional) clave de OCR.space para leer facturas. Sin ella se usa la clave de demostración pública. |
| `Correos__ColaActiva` | (Opcional) `false` apaga el proceso que envía la cola de correos y el resumen diario. Por defecto activo. |
| `AllowedHosts` | (Opcional) p. ej. `fundacionpanoramadecolores-nez4.onrender.com;localhost`. Por defecto `*`; si se restringe, comprobar que el health check de Render siga sano. |

Los parámetros de nómina (salario mínimo, auxilio de transporte, tasas) **no** son variables de entorno: se editan en *Configuración → Nómina* y deben actualizarse cada enero.

---

## Arquitectura del backend

```
FundacionPanorama.API             Controllers (solo HTTP: rutas, permisos, códigos), Program.cs, DbMigrations
FundacionPanorama.Application     Features/<Módulo>/ → <Módulo>Service (reglas), DTOs/, Interfaces/; Shared/ (Validar, Paginacion → ListaPaginada)
FundacionPanorama.Infrastructure  Persistence/Repositories (todo el SQL, Npgsql vía DbConnectionFactory), Registro/
FundacionPanorama.Domain          Tipos compartidos (Result, DatoInvalidoException…)
FundacionPanorama.Tests           xUnit + Moq (unitarias)
FundacionPanorama.IntegrationTests xUnit contra un PostgreSQL TEMPORAL (nunca producción)
```

- Todos los módulos siguen **Controller → Service → Repository**. Sin ORM: SQL explícito con Npgsql.
- **Permisos**: cada endpoint lleva `[RequierePermiso("modulo", "accion")]` (o `[RequiereAlgunPermiso("mod:accion", …)]` si lo comparten varios módulos) según el catálogo de *Seguridad*. Las lecturas con datos personales también exigen permiso (`ver`); borrar exige `eliminar` y exportar exige `exportar`. Una prueba (`PermisosSegurosTests`) falla si un endpoint con datos personales queda sin permiso. Roles, módulos y acciones válidos: `CatalogoPermisos`.
- **Sesión**: cada petición confirma en la BD (caché de 1 min) que el usuario siga activo y con el mismo rol (`AccesoUsuarios`).
- **Validación**: las reglas de negocio van en el servicio con `Validar`/`Exigir`, que lanzan `DatoInvalidoException` → **400** con el mensaje para el usuario. Los errores de la BD conocidos (texto largo, duplicado, dato inexistente, en uso) se traducen a 400/409 en `TraductorErrores`.
- **Auditoría**: `AuditoriaSql.RegistrarAsync` (dentro de una transacción usa *savepoint*, así un fallo de auditoría no deshace la operación) o `BaseController.AuditarAsync`.
- **Errores**: una excepción no controlada responde `{ mensaje, codigo }` sin detalles internos; con el código se busca el detalle en el log de Render.
- **Correos**: los avisos internos y el resumen diario de alertas se encolan en `cola_correos` y los envía `ColaCorreosWorker` con reintentos. El resumen diario viene apagado: se activa en *Configuración → Correo*.
- **Archivos**: fotos y documentos personales van a un bucket **privado** (en la BD: `privado://carpeta/archivo`) y se ven con enlaces firmados de 1 hora (`POST /api/archivos/firmar`). Solo la carpeta `web` (imágenes de la página) es pública. Los archivos antiguos se migran desde *Seguridad → Almacenamiento*.

## Convenciones del panel (frontend)

- **Errores de la API**: `mensajeErrorApi(err, { accion })` (o `err.mensajeUsuario`) da un mensaje claro en español. Nunca un `catch` silencioso al crear, editar o eliminar.
- **Validación de formularios**: reglas en `shared/utils/validacion.js` con `useValidacion` y `ResumenErrores`; beneficiarios en `domain/beneficiarios/validacionBeneficiario.js`. Cada mensaje dice qué está mal y da un ejemplo; los botones no se deshabilitan sin explicación.
- **Archivos privados**: `useArchivoUrl`, `resolverArchivo` y `abrirArchivo` (`shared/utils/archivos.js`). Antes de subir, `validarArchivo` (`shared/utils/archivosPermitidos.js`) revisa tipo y tamaño (imágenes 5 MB, PDF 10 MB).
- **Colores y modo oscuro**: nunca hex sueltos; usar el tema (`text.primary`, `divider`, `primary.main`…) o `colorEstado(tono, modo)` de `shared/theme/paleta.js`. Para texto en el color de marca: `var(--color-primario-texto)`.
- **Exportar**: siempre con `exportarExcel` (registra la exportación en el servidor) y botón visible con `puedo(modulo, 'exportar')` en los módulos que tienen esa acción.
- **Listados**: el servidor pagina (`{ data, total, pagina, porPagina }`); para exportar todo, `obtenerTodasLasPaginas` (`shared/utils/paginas.js`).
- **Fechas**: `fechaLocalISO()` y `parsearFechaISO()` (`shared/utils/fecha.js`). No usar `toISOString()` para fechas: es UTC y después de las 7 p. m. da el día siguiente.
- **Avisos desde código que no es un componente**: `notificar(mensaje, 'error')` (`shared/utils/notificar.js`).

---

## Tests

```powershell
# Backend (xUnit): reglas, servicios, permisos, almacenamiento
dotnet test backend/FundacionPanorama.Tests/FundacionPanorama.Tests.csproj -c Release

# Backend, integración: SQL real contra un PostgreSQL TEMPORAL que se crea y se borra solo
# (Docker/Testcontainers, o un PostgreSQL local instalado con initdb en una carpeta temporal).
# Nunca lee appsettings ni se conecta a la BD de producción. Sin Postgres disponible, se omiten.
dotnet test backend/FundacionPanorama.IntegrationTests

# Frontend, unitarios (Vitest): validación, mensajes de error, fechas, archivos
cd frontend/fundacion-web
npm test

# Frontend, punta a punta (Playwright, con la API simulada: no toca la BD)
npx playwright install chromium   # solo la primera vez
npm run e2e
```

---

## Deploy del frontend

```powershell
cd frontend/fundacion-web
npm run build

# Copiar compilado a docs/gestion/
robocopy dist ..\..\docs\gestion /MIR /NJH /NJS /NFL /NDL

# Commit y push — GitHub Pages publica automáticamente
cd ..\..
git add docs/gestion/ frontend/
git commit -m "feat: descripción del cambio"
git push
```

Guía completa de convenciones y patrones: [frontend/fundacion-web/CONTRIBUTING.md](frontend/fundacion-web/CONTRIBUTING.md)

---

## Base de datos

El esquema se gestiona solo desde código: `backend/FundacionPanorama.API/Data/DbMigrations.cs` se ejecuta en cada arranque de la API y es idempotente (levanta una BD vacía desde cero y no hace nada sobre una ya actualizada). Cómo agregar una migración: [database/README.md](database/README.md).

Los scripts SQL numerados antiguos están en `database/historico/` solo como referencia: no se ejecutan.

---

## CI/CD

| Workflow | Disparo | Descripción |
|---|---|---|
| `ci-build.yml` | Push / PR a master | Backend: paquetes vulnerables, build y tests; integración contra PostgreSQL temporal (Docker). Frontend: `npm audit`, lint, tests y build |
| `e2e.yml` | Push / PR a master | Tests de punta a punta (Playwright) |
| `keep-alive.yml` | Cada 14 minutos | Ping al backend para evitar suspensión en Render.com |
| `bump-sw-cache.yml` | Push en css/, js/, images/ | Auto-versiona el service worker de la landing |

Dependabot (`.github/dependabot.yml`) abre cada semana PRs con actualizaciones de NuGet y npm. `xlsx` se instala desde el CDN oficial de SheetJS, que ya no publica en npm.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | .NET 10, ASP.NET Core, Npgsql (SQL explícito, sin ORM), PostgreSQL |
| Frontend | React 19, Vite 8, Material UI v9, React Router v7 |
| Tests | xUnit + Moq (backend), Testcontainers/PostgreSQL temporal (integración), Vitest (unitarios), Playwright (punta a punta y auditoría responsive en `e2e/auditoria/`) |
| Base de datos | PostgreSQL (Supabase) |
| Hosting web | GitHub Pages |
| Hosting API | Render.com (Docker) |
| CI/CD | GitHub Actions |

---

## Colores corporativos

Identidad de la fundación (página pública). El panel usa una paleta propia con modo claro y oscuro definida en `frontend/fundacion-web/src/shared/theme/paleta.js`.

| Rol | Hex |
|---|---|
| Primario — Púrpura (CTA principal) | `#4E1B95` |
| Primario — Verde (énfasis / íconos) | `#2D984F` |
| Secundario — Naranja (contraste / alertas) | `#F59D1E` |
| Secundario — Cian (fondos ligeros) | `#B4E8E8` |
