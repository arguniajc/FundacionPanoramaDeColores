# Módulo: Documentos

Repositorio de archivos digitales. Maneja dos tipos: documentos institucionales (actas, resoluciones, etc.) y documentos por beneficiario (cédulas, partidas de nacimiento, etc.).

## Archivos

| Archivo | Rol |
|---|---|
| `pages/DocumentosPage.jsx` | Contenedor con dos pestañas |
| `pages/components/TabInstitucionales.jsx` | Listado y gestión de documentos de la fundación |
| `pages/components/TabPorBeneficiario.jsx` | Documentos agrupados por beneficiario |
| `pages/components/ModalSubirInstitucional.jsx` | Subir documento institucional |
| `pages/components/ModalSubirArchivoBeneficiario.jsx` | Subir documento de un beneficiario específico |
| `pages/components/ConfirmarEliminar.jsx` | Dialog de confirmación antes de eliminar |
| `pages/components/helpers.js` | Formateo de tamaños, tipos MIME, etc. |

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET/POST/DELETE | `/api/documentos` | Documentos institucionales |
| GET/POST/DELETE | `/api/documentos/beneficiario/{beneficiarioId}` | Documentos de un beneficiario |
| DELETE | `/api/documentos/archivo/{id}` | Eliminar archivo específico |
| GET | `/api/beneficiarios` | Búsqueda de beneficiarios para el filtro |
| POST | `/api/archivos/upload?carpeta=documentos` | Subir archivo al storage de Supabase |

## Notas

Los archivos se almacenan en Supabase Storage. El backend guarda la URL pública en la tabla `archivos`. Para descargar un documento, el frontend genera un log en `/api/archivos/log-descarga` (auditado en el módulo Auditoría).
