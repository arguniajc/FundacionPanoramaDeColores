# Módulo: Dashboard

Página de inicio del panel administrativo. Muestra KPIs consolidados: beneficiarios activos, empleados, inventario, distribución geográfica y género, y alertas de comodatos próximos a vencer.

## Archivos

| Archivo | Rol |
|---|---|
| `pages/DashboardPage.jsx` | JSX puro — grillas de tarjetas, gráficas y alertas |
| `pages/useDashboardPage.js` | Fetch paralelo de stats, cálculo de `chartData` y `generoData` |
| `pages/components/DashboardHelpers.jsx` | Componentes reutilizables dentro del módulo: `KpiCard`, `AlertaChip`, `FilaOrigen`, `SeccionHeader`, `CustomTooltip`, `GeneroTooltip`, y la constante `COLORES_GENERO` |

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/beneficiarios/stats-ninos` | Estadísticas de beneficiarios (activos, género, origen geográfico) |
| GET | `/api/talento-humano/stats` | Cantidad de empleados activos |
| GET | `/api/inventario/stats` | Resumen de inventario |
| GET | `/api/inventario/comodatos-proximos` | Comodatos próximos a vencer (fuente de alertas) |

## Dependencias entre módulos

- `beneficiariosRepository.statsNinos()` — `infrastructure/repositories/beneficiariosRepository.js`
- `talentoHumanoRepository.stats()` — `infrastructure/repositories/talentoHumanoRepository.js`
- `inventarioRepository.stats()` y `.comodatosProximos()` — `infrastructure/repositories/inventarioRepository.js`

## Notas

`COLORES_GENERO` está en `DashboardHelpers.jsx` (no inline en el hook) para que tanto el hook como la página puedan importarlo sin dependencia circular.
