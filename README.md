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
#   "ConnectionStrings": { "DefaultConnection": "Host=localhost;Database=fundacion;Username=...;Password=..." },
#   "Jwt": { "Key": "...", "Issuer": "...", "Audience": "..." }
# }

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
| `ci-build.yml` | Push / PR a master | Compila backend (.NET) y frontend (Vite) |
| `keep-alive.yml` | Cada 14 minutos | Ping al backend para evitar suspensión en Render.com |
| `bump-sw-cache.yml` | Push en css/, js/, images/ | Auto-versiona el service worker de la landing |

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | .NET 10, ASP.NET Core, Entity Framework Core, PostgreSQL |
| Frontend | React 19, Vite, Material UI v9, React Router v7 |
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
