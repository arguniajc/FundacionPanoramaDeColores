# Módulo: Contabilidad

Registro contable simplificado para ESAL (Entidades Sin Ánimo de Lucro). Maneja movimientos, plan de cuentas, presupuesto anual, caja menor y generación de reportes para el contador.

## Archivos

| Archivo | Rol |
|---|---|
| `pages/ContabilidadPage.jsx` | JSX puro con pestañas |
| `pages/useContabilidadPage.js` | Lógica central: fetch, estado de pestañas, callbacks |
| `pages/components/TabResumen.jsx` | Resumen financiero del período |
| `pages/components/TabMovimientos.jsx` | Listado y registro de movimientos contables |
| `pages/components/TabCuentas.jsx` | Plan de cuentas |
| `pages/components/TabPresupuesto.jsx` | Presupuesto anual vs. ejecutado |
| `pages/components/TabCajaMenor.jsx` | Arqueos y reposiciones de caja menor |
| `pages/components/LibroMayorTab.jsx` | Libro mayor por cuenta |
| `pages/components/TabReporteContador.jsx` | Exportar reporte para el contador externo |
| `pages/components/DialogMovimiento.jsx` | Crear / editar movimiento |
| `pages/components/DialogComprobante.jsx` | Ver comprobante de un movimiento |
| `pages/components/DialogCuenta.jsx` | Crear / editar cuenta contable |
| `pages/components/DialogPresupuesto.jsx` | Asignar presupuesto a una cuenta |
| `pages/components/DialogArqueo.jsx` | Registrar arqueo de caja menor |
| `pages/components/DialogReposicion.jsx` | Solicitar reposición de caja menor |
| `pages/components/generarReportePDF.js` | Genera el PDF del reporte para el contador |
| `pages/components/generarComprobantePDF.js` | Genera el PDF del comprobante de egreso/ingreso |
| `pages/components/helpers.jsx` | Formateo de moneda, fechas y cálculos del módulo |

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/contabilidad/stats` | KPIs del resumen |
| GET/POST/PUT/DELETE | `/api/contabilidad/cuentas` | Plan de cuentas |
| GET | `/api/contabilidad/categorias` | Categorías de movimientos |
| GET/POST/PUT | `/api/contabilidad/movimientos` | Movimientos contables |
| PATCH | `/api/contabilidad/movimientos/{id}/anular` | Anular movimiento |
| GET/POST/PUT/DELETE | `/api/contabilidad/presupuesto` | Presupuesto anual |
| GET/POST/PUT/DELETE | `/api/contabilidad/caja-menor/arqueos` | Arqueos de caja menor |
| POST | `/api/contabilidad/caja-menor/reposicion` | Reposición de caja menor |
| GET | `/api/contabilidad/caja-menor/libro` | Libro de caja menor |
| GET | `/api/contabilidad/reporte` | Reporte para contador |
| GET | `/api/contabilidad/resumen-anual` | Resumen anual |
| GET | `/api/contabilidad/libro-mayor` | Libro mayor |
| POST | `/api/contabilidad/extraer-factura` | Extrae datos de una factura (OCR/AI) |
| GET | `/api/sedes` | Sedes para filtrar movimientos |
