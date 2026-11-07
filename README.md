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
| `OcrSpace__ApiKey` | (Opcional) clave de OCR.space para leer facturas. |

---

## Arquitectura del backend

```
FundacionPanorama.API             Controllers (solo HTTP: rutas, permisos, códigos), Program.cs, DbMigrations
FundacionPanorama.Application     Features/<Módulo>/ → <Módulo>Service (reglas), DTOs/, Interfaces/
FundacionPanorama.Infrastructure  Persistence/Repositories (todo el SQL, Npgsql vía DbConnectionFactory), Registro/
FundacionPanorama.Domain          Tipos compartidos (Result, PagedResult…)
FundacionPanorama.Tests           xUnit + Moq
```

- Todos los módulos siguen **Controller → Service → Repository**. Sin ORM: SQL explícito con Npgsql.
- **Permisos**: cada endpoint de escritura lleva `[RequierePermiso("modulo", "accion")]` según el catálogo de *Seguridad*; las lecturas exigen sesión.
- **Auditoría**: `AuditoriaSql.RegistrarAsync` (dentro de una transacción usa *savepoint*, así un fallo de auditoría no deshace la operación) o `BaseController.AuditarAsync`.
- **Errores**: una excepción no controlada responde `{ mensaje, codigo }` sin detalles internos; con el código se busca el detalle en el log de Render.
- **Archivos**: fotos y documentos personales van a un bucket **privado** (en la BD: `privado://carpeta/archivo`) y se ven con enlaces firmados de 1 hora (`POST /api/archivos/firmar`). Solo la carpeta `web` (imágenes de la página) es pública. Los archivos antiguos se migran desde *Seguridad → Almacenamiento*.

## Convenciones del panel (frontend)

- **Errores de la API**: `mensajeErrorApi(err, { accion })` (o `err.mensajeUsuario`) da un mensaje claro en español. Nunca un `catch` silencioso al crear, editar o eliminar.
- **Validación de formularios**: reglas en `shared/utils/validacion.js` con `useValidacion` y `ResumenErrores`; beneficiarios en `domain/beneficiarios/validacionBeneficiario.js`. Cada mensaje dice qué está mal y da un ejemplo; los botones no se deshabilitan sin explicación.
- **Archivos privados**: `useArchivoUrl`, `resolverArchivo` y `abrirArchivo` (`shared/utils/archivos.js`).
- **Fechas**: `fechaLocalISO()` y `parsearFechaISO()` (`shared/utils/fecha.js`). No usar `toISOString()` para fechas: es UTC y después de las 7 p. m. da el día siguiente.
- **Avisos desde código que no es un componente**: `notificar(mensaje, 'error')` (`shared/utils/notificar.js`).

---

## Tests

```powershell
# Backend (xUnit): reglas, servicios, permisos, almacenamiento
dotnet test backend/FundacionPanorama.Tests/FundacionPanorama.Tests.csproj -c Release

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
| `ci-build.yml` | Push / PR a master | Backend: paquetes vulnerables, build y tests. Frontend: `npm audit`, lint, tests y build |
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
| Tests | xUnit + Moq (backend), Vitest (unitarios), Playwright (punta a punta) |
| Base de datos | PostgreSQL (Supabase) |
| Hosting web | GitHub Pages |
| Hosting API | Render.com (Docker) |
| CI/CD | GitHub Actions |

---

## Colores corporativos

| Rol | Hex |
|---|---|
| Primario — Púrpura (CTA principal) | `#4E1B95` |
| Primario — Verde (énfasis / íconos) | `#2D984F` |
| Secundario — Naranja (contraste / alertas) | `#F59D1E` |
| Secundario — Cian (fondos ligeros) | `#B4E8E8` |
