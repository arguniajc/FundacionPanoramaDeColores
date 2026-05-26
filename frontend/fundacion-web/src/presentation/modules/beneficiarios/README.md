# Módulo: Beneficiarios

Gestión completa de los niños y adultos inscritos en la fundación. Incluye listado con filtros, ficha detallada, historial de cambios, estadísticas e importación masiva.

## Archivos

| Archivo | Rol |
|---|---|
| `pages/BeneficiariosPage.jsx` | JSX puro — tabla principal con filtros y acciones |
| `pages/useBeneficiariosPage.js` | Lógica: fetch, paginación, filtros, callbacks de CRUD |
| `pages/NuevoBeneficiario.jsx` | Formulario de inscripción de beneficiario nuevo |
| `pages/EditarInscripcion.jsx` | Editar datos de un beneficiario existente |
| `pages/DetalleInscripcion.jsx` | Vista de solo lectura de la ficha completa |
| `pages/HistorialBeneficiario.jsx` | Timeline de cambios del beneficiario |
| `pages/components/ModalEstadisticas.jsx` | Estadísticas con toggle niños / adultos / todos |
| `pages/components/ImportarBeneficiariosDialog.jsx` | Importación masiva desde Excel |

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/beneficiarios` | Listar con filtros (sede, programa, estado, tipo, búsqueda) |
| POST | `/api/beneficiarios` | Crear beneficiario |
| PUT | `/api/beneficiarios/{id}` | Actualizar datos |
| DELETE | `/api/beneficiarios/{id}` | Eliminar |
| PATCH | `/api/beneficiarios/{id}/baja` | Marcar como inactivo |
| PATCH | `/api/beneficiarios/{id}/reactivar` | Reactivar |
| GET | `/api/beneficiarios/{id}/historial` | Historial de cambios |
| GET | `/api/beneficiarios/stats` | Estadísticas generales |
| GET | `/api/beneficiarios/stats-ninos` | Estadísticas solo niños (usado en Dashboard) |
| GET | `/api/beneficiarios/verificar-documento/{numero}` | Validar duplicados antes de guardar |
| POST | `/api/archivos/log-descarga` | Auditar cuando se descarga un documento |

## Dependencias entre módulos

- `beneficiariosRepository` en `infrastructure/repositories/beneficiariosRepository.js`
- Formularios usan `useGeografiaColombia` de `shared/hooks/` para los selectores de depto/municipio

## Reglas de negocio

Ver `domain/beneficiarios/beneficiarioRules.js` — contiene validaciones de edad, tipo (niño/adulto) y categoría (CC/RC) que no deben duplicarse en el componente.
