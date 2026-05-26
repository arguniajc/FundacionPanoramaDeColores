# Módulo: Organigrama

Visualización interactiva del organigrama de la fundación. Permite arrastrar y reorganizar posiciones, y ver quién ocupa cada cargo.

## Archivos

| Archivo | Rol |
|---|---|
| `pages/OrganigramaPage.jsx` | Árbol visual interactivo del organigrama |

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/talento-humano` | Lista de empleados para asignar a posiciones |
| GET | `/api/organigrama` | Estructura de nodos del organigrama |
| POST | `/api/organigrama` | Crear nueva posición |
| PUT | `/api/organigrama/{id}` | Mover o renombrar posición |
| DELETE | `/api/organigrama/{id}` | Eliminar posición |

## Notas

`OrgChartTab.jsx` (componente visual del árbol) vive en `talento_humano/pages/components/` porque se usa también dentro del módulo de Talento Humano. `OrganigramaPage` lo importa desde allí.

Si necesitas reubicar ese componente en el futuro, muévelo a `shared/components/` y actualiza los dos puntos de importación.
