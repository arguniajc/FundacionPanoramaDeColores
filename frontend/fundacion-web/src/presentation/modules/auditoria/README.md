# Módulo: Auditoría

Registro de descargas de archivos. Muestra un log de qué usuario descargó qué documento y cuándo.

## Archivos

| Archivo | Rol |
|---|---|
| `pages/LogDescargasPage.jsx` | Tabla con el historial de descargas |

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/archivos/log-descargas` | Obtener el log completo de descargas |

## Notas

Módulo de solo lectura — no hay formularios ni acciones. Si necesitas agregar filtros por fecha o usuario, hazlo en `LogDescargasPage.jsx` directamente (es un módulo pequeño que no justifica separar hook/page todavía).
