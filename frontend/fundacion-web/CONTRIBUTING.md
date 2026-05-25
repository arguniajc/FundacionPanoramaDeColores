# Guía de contribución — Panel Fundación Panorama de Colores

## Stack
React 19 · Vite · Material UI v9 · React Router v7 (HashRouter)

---

## Estructura del proyecto

```
src/
├── application/        Casos de uso y hooks de datos reutilizables
│   ├── auth/           AuthContext, useLogin
│   ├── beneficiarios/  useBeneficiarios, useBeneficiarioStats
│   └── ...             Un sub-directorio por dominio
│
├── domain/             Reglas de negocio puras (sin React, sin API)
│   └── beneficiarios/  beneficiarioRules.js
│
├── infrastructure/     Integración con servicios externos
│   ├── http/           apiClient.js  ← el único lugar que importa axios
│   ├── cache/          sessionCache.js
│   ├── storage/        authStorage.js
│   └── repositories/   Un archivo por dominio (actividadesRepository.js, etc.)
│
├── presentation/       Todo lo visual
│   ├── layouts/        AdminLayout
│   ├── components/     ErrorBoundary y componentes globales de layout
│   └── modules/        Un directorio por módulo funcional
│       └── beneficiarios/
│           ├── components/        Componentes reutilizables DENTRO del módulo
│           └── pages/
│               ├── BeneficiariosPage.jsx      JSX puro — sin useState ni lógica
│               ├── useBeneficiariosPage.js    Todo el estado y los callbacks
│               └── components/               Componentes específicos de esta página
│
└── shared/             Utilidades transversales
    ├── components/     SkeletonTabla, ConfirmDialog, FirmaPad, etc.
    ├── hooks/          useAsyncData, usePermisos, useGeografia
    ├── context/        ConfiguracionContext, ToastContext
    ├── constants/      brand.js, routes.js, beneficiarios.js
    ├── utils/          fecha.js, pdf.js, logger.js
    ├── theme/          ThemeContext
    └── index.js        ← barrel: importa desde aquí en código nuevo
```

---

## Reglas de imports

| Situación | Patrón correcto |
|---|---|
| Importar algo de otra capa (`shared`, `application`, `infrastructure`) | `import X from '@/shared/...'` |
| Importar un componente del mismo módulo | `import X from '../components/X'` |
| Importar entre archivos dentro del mismo directorio | `import X from './helpers'` |

**Regla de oro**: `@/` siempre para imports entre capas, `./` o `../` solo dentro del mismo módulo.

```js
// BIEN
import { SkeletonTabla, BRAND_COLOR } from '@/shared';
import apiClient from '@/infrastructure/http/apiClient';
import { useAuth } from '@/application/auth/AuthContext';

// MAL — nunca usar rutas con ../../../
import { SkeletonTabla } from '../../../../shared/components/SkeletonTabla';
```

---

## Patrón obligatorio para páginas

Toda página nueva debe seguir este patrón — **página = JSX puro, lógica = hook**:

```
modules/miModulo/pages/
├── MiModuloPage.jsx        Solo JSX: imports + destructuring del hook + return JSX
├── useMiModuloPage.js      Todo el estado, efectos y callbacks
└── components/             Componentes presentacionales específicos de esta página
```

**`MiModuloPage.jsx`** — solo JSX:
```jsx
import { useMiModuloPage } from './useMiModuloPage';

export default function MiModuloPage() {
  const { datos, cargando, handleGuardar } = useMiModuloPage();
  return ( /* JSX */ );
}
```

**`useMiModuloPage.js`** — toda la lógica:
```js
import { useState, useEffect } from 'react';
import apiClient from '@/infrastructure/http/apiClient';

export function useMiModuloPage() {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => { /* cargar */ }, []);

  const handleGuardar = async (form) => { /* ... */ };

  return { datos, cargando, handleGuardar };
}
```

---

## Cómo agregar un módulo nuevo

Sigue estos pasos en orden:

### 1. Backend
- Crear `Controllers/NuevoController.cs`
- Crear `Application/Features/Nuevo/NuevoService.cs` con DTOs e interfaz
- Crear `Infrastructure/Persistence/Repositories/NuevoRepository.cs`
- Registrar en `DependencyInjection.cs`

### 2. Frontend — infraestructura
```js
// src/infrastructure/repositories/nuevoRepository.js
import apiClient from '@/infrastructure/http/apiClient';

export const nuevoRepository = {
  listar:   (params) => apiClient.get('/api/nuevo', { params }),
  crear:    (data)   => apiClient.post('/api/nuevo', data),
  editar:   (id, d)  => apiClient.put(`/api/nuevo/${id}`, d),
  eliminar: (id)     => apiClient.delete(`/api/nuevo/${id}`),
};
```

### 3. Frontend — presentación
```
src/presentation/modules/nuevo/
├── pages/
│   ├── NuevoPage.jsx
│   ├── useNuevoPage.js
│   └── components/
```

### 4. Agregar ruta
```js
// src/shared/constants/routes.js  — agregar la constante
export const NUEVO_URL = '/sede/nuevo';

// src/App.jsx  — agregar la ruta
<Route path={NUEVO_URL} element={<NuevoPage />} />
```

### 5. Agregar entrada en el sidebar
Buscar `AdminLayout.jsx` y agregar el ítem en la lista de navegación.

---

## Componentes compartidos disponibles

Importa desde `@/shared` (no es necesario conocer la ruta exacta):

```js
import {
  SkeletonTabla,     // tabla con skeleton mientras carga
  useConfirm,        // dialog de confirmación
  FirmaPad,          // captura de firma digital
  UploadFoto,        // upload de imagen con preview
  useAsyncData,      // hook para cargando/error/data
  usePermisos,       // verificar permisos del usuario
  BRAND_COLOR,       // color corporativo (#4E1B95)
  calcularEdad,      // calcula edad desde fecha de nacimiento
} from '@/shared';
```

---

## Deploy

```powershell
# 1. Compilar
cd frontend/fundacion-web
npm run build

# 2. Copiar a docs/gestion/ (GitHub Pages)
$src = "dist"
$dst = "../../docs/gestion"
robocopy $src $dst /MIR /NJH /NJS /NFL /NDL

# 3. Commit y push
cd ../..
git add docs/gestion/ frontend/
git commit -m "feat: descripción del cambio"
git push
```

GitHub Pages sirve automáticamente desde `docs/` en la rama `master`.

---

## Convenciones de nombres

| Qué | Convención | Ejemplo |
|---|---|---|
| Componente React | PascalCase | `BeneficiariosPage.jsx` |
| Hook de página | camelCase + `use` + Page | `useBeneficiariosPage.js` |
| Hook reutilizable | camelCase + `use` | `useAsyncData.js` |
| Repositorio | camelCase + Repository | `beneficiariosRepository.js` |
| Constante | SCREAMING_SNAKE | `BRAND_COLOR` |
| Función utilitaria | camelCase | `calcularEdad` |
| Carpeta de módulo | kebab-case (snake si historial) | `talento_humano/` |
