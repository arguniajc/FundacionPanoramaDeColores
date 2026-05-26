# Módulo: Voluntarios

Directorio de voluntarios y sus asignaciones a actividades o programas. Permite registrar horas de voluntariado y gestionar el ciclo de vida del voluntario (activo / inactivo).

## Archivos

| Archivo | Rol |
|---|---|
| `pages/VoluntariosPage.jsx` | Grilla de tarjetas de voluntarios con KPIs |
| `pages/components/VoluntarioDialog.jsx` | Crear / editar voluntario |
| `pages/components/AsignacionesDialog.jsx` | Ver y gestionar asignaciones del voluntario |
| `pages/components/VoluntarioCard.jsx` | Tarjeta visual de un voluntario |
| `pages/components/StatCard.jsx` | KPI card reutilizable dentro del módulo |
| `pages/components/helpers.js` | Formateo de horas, estados, tipos de voluntariado |

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/voluntarios` | Listar voluntarios con filtros |
| POST | `/api/voluntarios` | Registrar voluntario |
| PUT | `/api/voluntarios/{id}` | Actualizar datos |
| PATCH | `/api/voluntarios/{id}/toggle` | Activar / desactivar |
| DELETE | `/api/voluntarios/{id}` | Eliminar |
| GET | `/api/voluntarios/stats` | KPIs del resumen |
| GET/POST | `/api/voluntarios/{id}/asignaciones` | Ver y agregar asignaciones del voluntario |
| PUT/DELETE | `/api/voluntarios/asignaciones/{asigId}` | Editar o eliminar asignación |
| GET | `/api/sedes` | Sedes para filtrar |
