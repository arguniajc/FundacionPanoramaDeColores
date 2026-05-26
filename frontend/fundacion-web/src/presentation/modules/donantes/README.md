# Módulo: Donantes

Directorio de donantes independiente del módulo de Donaciones. Permite gestionar la base de datos de donantes (personas naturales y jurídicas) y activar/desactivar su estado.

## Archivos

| Archivo | Rol |
|---|---|
| `pages/DonantesPage.jsx` | Tabla de donantes con acciones CRUD y toggle de estado |

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/donantes` | Listar donantes con filtros |
| POST | `/api/donantes` | Crear donante |
| PUT | `/api/donantes/{id}` | Actualizar donante |
| PATCH | `/api/donantes/{id}/toggle` | Activar / desactivar |
| DELETE | `/api/donantes/{id}` | Eliminar donante |

## Relación con Donaciones

Este módulo gestiona el maestro de donantes. El módulo `donaciones/` lo usa para asociar cada donación a un donante. Si necesitas agregar campos al perfil del donante, modificar aquí es el punto de entrada.
