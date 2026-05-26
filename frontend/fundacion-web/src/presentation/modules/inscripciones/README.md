# Módulo: Inscripciones

Gestión del proceso de inscripción de beneficiarios a programas. Permite recibir solicitudes, revisar formularios personalizados y cambiar el estado (pendiente → aprobado / rechazado).

## Archivos

| Archivo | Rol |
|---|---|
| `pages/InscripcionesPage.jsx` | Tabla de inscripciones con filtros por sede, programa y estado |
| `pages/components/NuevaInscripcionDialog.jsx` | Crear inscripción manual desde el panel |
| `pages/components/VerFormularioDialog.jsx` | Ver el formulario llenado por el acudiente |
| `pages/components/campos.jsx` | Renderizado dinámico de campos personalizados del formulario |

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/inscripciones` | Listar inscripciones con filtros |
| POST | `/api/inscripciones` | Crear inscripción manual |
| PUT | `/api/inscripciones/{id}` | Actualizar datos |
| PATCH | `/api/inscripciones/{id}/estado` | Aprobar o rechazar la inscripción |
| DELETE | `/api/inscripciones/{id}` | Eliminar |
| GET | `/api/beneficiarios` | Buscar beneficiario al crear inscripción |
| GET | `/api/sedes` | Sedes disponibles |

## Relación con Programas

Cada programa tiene campos de formulario configurables (módulo `programas/`). `campos.jsx` renderiza esos campos dinámicamente según la configuración del programa al que se inscribe el beneficiario.

## Flujo típico

1. Acudiente llena el formulario público en la landing page
2. La inscripción llega con estado `pendiente`
3. Un coordinador la revisa en este módulo y la aprueba o rechaza
4. Al aprobar, se puede crear automáticamente el registro en `beneficiarios/`
