# Módulo: Reportes

Generación y exportación de reportes por área. Cada pestaña corresponde a un dominio y permite filtrar por rango de fechas, sede y exportar a Excel o PDF.

## Archivos

| Archivo | Rol |
|---|---|
| `pages/ReportesPage.jsx` | Contenedor con pestañas por área |
| `pages/components/TabActividades.jsx` | Reporte de asistencia y actividades |
| `pages/components/TabBeneficiarios.jsx` | Reporte de beneficiarios activos/inactivos |
| `pages/components/TabDonaciones.jsx` | Reporte de donaciones del período |
| `pages/components/TabInventario.jsx` | Reporte de movimientos de inventario |
| `pages/components/TabProgramas.jsx` | Reporte de inscripciones por programa |
| `pages/components/TabContabilidadEsal.jsx` | Reporte contable para ESAL (estados financieros) |
| `pages/components/helpers.jsx` | Funciones compartidas: formateo, generación de PDF/Excel |

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/reportes/actividades` | Datos para el reporte de actividades |
| GET | `/api/reportes/beneficiarios` | Datos para el reporte de beneficiarios |
| GET | `/api/reportes/donaciones` | Datos para el reporte de donaciones |
| GET | `/api/reportes/inventario` | Datos para el reporte de inventario |
| GET | `/api/reportes/programas` | Datos para el reporte de programas |
| GET | `/api/contabilidad/...` | Datos contables para el reporte ESAL |

## Notas

Todos los endpoints de reportes aceptan `?fechaInicio=&fechaFin=&sedeId=` como parámetros de filtro. La exportación a Excel se hace en el frontend con `xlsx` (sin llamada al backend).
