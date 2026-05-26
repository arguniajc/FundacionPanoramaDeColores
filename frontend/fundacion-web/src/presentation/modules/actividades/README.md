# Módulo: Actividades

Calendario de actividades por sede y programa. Permite crear, editar y eliminar actividades con horarios recurrentes y registrar asistencia de beneficiarios.

## Archivos

| Archivo | Rol |
|---|---|
| `pages/ActividadesPage.jsx` | JSX puro — renderiza el calendario y los dialogs |
| `pages/useActividadesPage.js` | Toda la lógica: fetch, estado, callbacks, expansión de horarios recurrentes |
| `pages/components/DialogActividad.jsx` | Ver / editar una actividad existente |
| `pages/components/DialogNuevaActividad.jsx` | Crear una actividad nueva |
| `pages/components/DialogHorario.jsx` | Agregar / editar horarios recurrentes |
| `pages/components/DialogAsistencia.jsx` | Registrar asistencia de beneficiarios |
| `pages/components/TabHorarios.jsx` | Listado de horarios dentro del dialog de actividad |

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/actividades` | Listar actividades (con filtros de sede/programa/rango de fechas) |
| POST | `/api/actividades` | Crear actividad |
| PUT | `/api/actividades/{id}` | Actualizar actividad |
| DELETE | `/api/actividades/{id}` | Eliminar actividad |
| GET | `/api/actividades/{id}/asistencia` | Listar asistencia de una actividad |
| POST | `/api/actividades/{id}/asistencia` | Registrar asistencia |
| POST/PUT/DELETE | `/api/actividades/horarios` | Gestionar horarios recurrentes |
| GET | `/api/sedes` | Listado de sedes para el filtro |

## Dependencias entre módulos

- Usa `sedesRepository.listar()` de `infrastructure/repositories/sedesRepository.js`
- Usa `actividadesRepository` de `infrastructure/repositories/actividadesRepository.js`

## Lógica destacada

`expandirHorarios(horarios, start, end)` en el hook genera eventos individuales de calendario a partir de reglas de recurrencia (diaria/semanal). Es privada al hook y no debe exponerse.
