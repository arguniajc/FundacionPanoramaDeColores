# Módulo: Equipo

Gestión de usuarios del panel administrativo (quién puede ingresar al sistema). No confundir con `talento_humano/` que maneja empleados de la fundación.

## Archivos

| Archivo | Rol |
|---|---|
| `pages/EquipoPage.jsx` | Tabla de usuarios con acciones CRUD |

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/equipo` | Listar usuarios del sistema |
| POST | `/api/equipo` | Crear usuario nuevo |
| PUT | `/api/equipo/{id}` | Actualizar datos o rol del usuario |
| DELETE | `/api/equipo/{id}` | Eliminar usuario |

## Diferencia con Talento Humano

| Equipo (`/equipo`) | Talento Humano (`/talento-humano`) |
|---|---|
| Usuarios que acceden al panel | Empleados de la fundación |
| Tienen email de Google para login | Pueden no tener acceso al sistema |
| Tienen rol (admin, coordinador, etc.) | Tienen cargo, contrato, nómina |

Los roles y permisos de cada usuario se configuran en el módulo `seguridad/`.
