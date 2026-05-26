# Módulo: Seguridad

Configuración de roles y permisos del sistema. Define qué puede hacer cada rol (admin, coordinador, auxiliar, etc.) en cada módulo.

## Archivos

| Archivo | Rol |
|---|---|
| `pages/SeguridadPage.jsx` | Matriz de roles × permisos con checkboxes |

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/permisos/roles` | Listar roles con sus permisos actuales |
| PUT | `/api/permisos/{rol}` | Actualizar los permisos de un rol |

## Cómo funciona el sistema de permisos

1. El backend incluye los permisos del usuario en el JWT al hacer login
2. `AuthContext` los expone como `user.permisos`
3. `usePermisos()` (en `shared/hooks/`) verifica si el usuario tiene un permiso específico
4. `RutaProtegida` (en `shared/components/`) bloquea rutas completas
5. Los permisos individuales (botones, acciones) se verifican con `usePermisos()` en cada componente

## Notas

Solo el rol `admin` puede acceder a este módulo. Si agregas un módulo nuevo, recuerda añadir sus permisos en el backend (`PermisosController`) y en la matriz de este módulo.
