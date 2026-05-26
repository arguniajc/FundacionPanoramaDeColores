# Módulo: Programas

Configuración de los programas de la fundación (arte, deporte, ambiental, etc.) y sus formularios de inscripción personalizados. Cada programa pertenece a una sede.

## Archivos

| Archivo | Rol |
|---|---|
| `pages/ProgramasPage.jsx` | Listado de programas agrupados por sede |
| `pages/components/EditorCamposDialog.jsx` | Editor drag-and-drop de campos del formulario de inscripción |
| `pages/components/VistaPreviewDialog.jsx` | Preview del formulario tal como lo verá el acudiente |
| `pages/components/SortableCampoRow.jsx` | Fila arrastrable en el editor de campos |
| `pages/components/CampoPreview.jsx` | Renderizado de un campo en el preview |
| `pages/components/Chips.jsx` | Chips de estado y tipo de programa |
| `pages/components/helpers.js` | Tipos de campos disponibles, valores por defecto |

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/sedes/{sedeId}/programas` | Programas de una sede específica |
| GET/POST/PUT/DELETE | `/api/sedes/programas` | CRUD de programas |
| PATCH | `/api/sedes/programas/{id}/toggle` | Activar / desactivar programa |
| PUT | `/api/sedes/programas/{id}/autorizar-rep` | Autorizar al representante legal como firmante |
| DELETE | `/api/sedes/programas/{id}/autorizar-rep` | Revocar autorización del representante |
| GET/POST/PUT/DELETE | `/api/sedes/programas/{programaId}/campos` | Campos del formulario de inscripción |

## Relación con otros módulos

- Los campos configurados aquí los usa `inscripciones/pages/components/campos.jsx` para renderizar el formulario.
- Las sedes se gestionan en el módulo `sedes/`.
- Los programas aparecen como filtro en `actividades/`, `beneficiarios/` e `inscripciones/`.
