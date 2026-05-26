# Módulo: Donaciones

Registro y seguimiento de donaciones (dinero o especie). Permite crear certificados de donación, enviar recibos por correo y ver el historial de donantes.

## Archivos

| Archivo | Rol |
|---|---|
| `pages/DonacionesPage.jsx` | Contenedor con pestañas Donaciones y Donantes |
| `pages/components/TabDonaciones.jsx` | Tabla de donaciones con filtros |
| `pages/components/TabDonantes.jsx` | Listado de donantes con historial |
| `pages/components/NuevaDonacionDialog.jsx` | Registrar donación (dinero o especie) |
| `pages/components/DonanteDialog.jsx` | Crear / editar donante |
| `pages/components/CertificadoDonacionDialog.jsx` | Generar certificado de donación en PDF |
| `pages/components/ReciboDonacionDialog.jsx` | Generar y enviar recibo de donación |
| `pages/components/DonanteCard.jsx` | Tarjeta resumen de un donante |
| `pages/components/StatCard.jsx` | KPI card reutilizable dentro del módulo |
| `pages/components/helpers.js` | Formateo de montos, tipos de donación |

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/donaciones` | CRUD de donaciones |
| GET | `/api/donaciones/stats` | Totales del período |
| PATCH | `/api/donaciones/{id}/anular` | Anular donación |
| POST | `/api/donaciones/{id}/enviar-recibo` | Enviar recibo por correo al donante |
| POST | `/api/donaciones/{id}/log-emision` | Auditar emisión de certificado |
| GET/POST/PUT/PATCH/DELETE | `/api/donantes` | CRUD de donantes |
| GET | `/api/sedes` | Sedes para filtrar |
| GET | `/api/inventario/...` | Artículos disponibles para donaciones en especie |
| GET | `/api/contabilidad/cuentas` | Cuentas contables para registrar el movimiento |

## Notas

Al registrar una donación en especie, se crea automáticamente un ingreso en el módulo de Inventario. Al registrar una donación en dinero, se genera un movimiento contable si la integración contable está activa.
