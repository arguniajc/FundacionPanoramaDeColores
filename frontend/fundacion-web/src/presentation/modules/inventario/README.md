# Módulo: Inventario

Control de activos y materiales de la fundación. Maneja ingresos, salidas, transferencias entre sedes, comodatos (préstamos) y alertas de vencimiento.

## Archivos

| Archivo | Rol |
|---|---|
| `pages/InventarioPage.jsx` | Grilla de ítems con filtros por sede y tipo |
| `pages/components/NuevoItemDialog.jsx` | Registrar nuevo activo o material |
| `pages/components/RegistrarMovimientoDialog.jsx` | Registrar ingreso o salida de unidades |
| `pages/components/TransferenciaDialog.jsx` | Transferir ítem entre sedes |
| `pages/components/HistorialDialog.jsx` | Ver historial de movimientos de un ítem |
| `pages/components/ItemCard.jsx` | Tarjeta de ítem en la grilla |
| `pages/components/StatCard.jsx` | KPI card reutilizable dentro del módulo |
| `pages/components/helpers.js` | Categorías, estados, formateo de cantidades |

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/inventario/items` | CRUD de ítems |
| GET | `/api/inventario/items/{id}` | Detalle con historial de movimientos |
| GET/POST | `/api/inventario/movimientos` | Listar y registrar movimientos |
| POST | `/api/inventario/transferencia` | Transferir entre sedes |
| GET | `/api/inventario/tipos` | Tipos de artículo (muebles, equipos, materiales, etc.) |
| GET | `/api/inventario/stats` | KPIs del resumen (usado también en Dashboard) |
| GET | `/api/inventario/comodatos-proximos` | Comodatos próximos a vencer (usado también en Dashboard) |
| POST | `/api/inventario/desde-donacion` | Ingreso automático al recibir una donación en especie |
| GET | `/api/sedes` | Sedes para filtrar |

## Notas

`comodatos-proximos` lo consume también el Dashboard para mostrar alertas. Si cambias la estructura de la respuesta, actualiza `useDashboardPage.js`.
