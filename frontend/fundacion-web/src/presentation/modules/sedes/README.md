# Módulo: Sedes

Gestión de las sedes físicas de la fundación y sus programas asociados. Las sedes son la unidad organizativa raíz — casi todos los demás módulos filtran por sede.

## Archivos

| Archivo | Rol |
|---|---|
| `pages/SedesPage.jsx` | Grilla de tarjetas de sedes con sus programas |
| `pages/components/DialogSede.jsx` | Crear / editar sede |
| `pages/components/DialogPrograma.jsx` | Crear / editar programa dentro de una sede |
| `pages/components/TarjetaSede.jsx` | Tarjeta visual de una sede con sus programas listados |

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/sedes` | Listar todas las sedes (con sus programas) |
| POST | `/api/sedes` | Crear sede |
| PUT | `/api/sedes/{id}` | Actualizar sede |
| PATCH | `/api/sedes/{id}/toggle` | Activar / desactivar sede |
| DELETE | `/api/sedes/{id}` | Eliminar sede |
| GET/POST/PUT/DELETE | `/api/sedes/programas` | CRUD de programas |
| PATCH | `/api/sedes/programas/{id}/toggle` | Activar / desactivar programa |
| GET/POST/PUT/DELETE | `/api/sedes/programas/{programaId}/campos` | Campos del formulario de inscripción |

## Notas

`GET /api/sedes` es el endpoint más consumido de toda la app — lo usan actividades, beneficiarios, inscripciones, inventario, voluntarios, contabilidad y donaciones para poblar sus selectores de sede. Si cambias la estructura de la respuesta, revisa todos esos módulos.
