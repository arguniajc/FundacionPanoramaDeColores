# Módulo: Talento Humano

Gestión del personal de la fundación: empleados, contratos, nómina, novedades (vacaciones, incapacidades, permisos) y organigrama.

## Archivos

| Archivo | Rol |
|---|---|
| `pages/TalentoHumanoPage.jsx` | Contenedor con pestañas: Empleados, Nómina, Organigrama |
| `pages/components/DialogEmpleado.jsx` | Crear / editar empleado (datos personales + contrato) |
| `pages/components/PanelEmpleado.jsx` | Panel lateral con el detalle completo de un empleado |
| `pages/components/PanelNomina.jsx` | Liquidación de nómina por período |
| `pages/components/PanelNovedades.jsx` | Novedades del empleado (vacaciones, incapacidades, permisos) |
| `pages/components/OrgChartTab.jsx` | Árbol visual del organigrama (también lo usa el módulo `organigrama/`) |

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/talento-humano` | CRUD de empleados |
| GET | `/api/talento-humano/{id}` | Detalle completo del empleado |
| GET | `/api/talento-humano/stats` | KPIs (empleados activos, por sede, etc.) — usado también en Dashboard |
| GET/POST/PUT/DELETE | `/api/talento-humano/novedades` | Novedades generales |
| GET | `/api/talento-humano/{empleadoId}/novedades` | Novedades de un empleado específico |
| GET | `/api/nomina/periodos` | Períodos de nómina disponibles |
| GET | `/api/nomina/periodos/{id}` | Detalle del período (devengados, deducciones) |
| POST/DELETE | `/api/nomina/periodos/{id}/...` | Liquidar / revertir período |
| GET/POST/PUT/DELETE | `/api/organigrama` | Estructura del organigrama |
| POST | `/api/archivos/upload?carpeta=organigrama` | Subir foto de perfil del empleado |
| GET | `/api/sedes` | Sedes para filtrar empleados |

## Notas

`OrgChartTab.jsx` es compartido con el módulo `organigrama/` — vive aquí porque Talento Humano fue el módulo original. Si en el futuro se necesita en más módulos, mover a `shared/components/`.

`talento-humano/stats` lo consume el Dashboard — si cambias la estructura del response, actualiza `useDashboardPage.js`.
