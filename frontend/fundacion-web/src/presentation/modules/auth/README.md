# Módulo: Auth

Pantalla de inicio de sesión. Solo admite login con Google OAuth — no hay formulario de usuario/contraseña.

## Archivos

| Archivo | Rol |
|---|---|
| `pages/LoginPage.jsx` | Botón "Continuar con Google" + manejo del callback OAuth |

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| POST | `/api/auth/google` | Intercambia el token de Google por un JWT de la aplicación |

## Flujo de autenticación

1. Usuario hace clic en "Continuar con Google" → Google OAuth devuelve un `id_token`
2. El frontend envía el `id_token` a `/api/auth/google`
3. El backend valida el token y devuelve un JWT propio
4. El JWT se guarda en `localStorage` vía `authStorage.js` (`infrastructure/storage/`)
5. `AuthContext` (`application/auth/`) expone `user` y `logout` a toda la app

## Notas

La protección de rutas la hace `RutaProtegida` en `shared/components/`. Si el JWT expira, el usuario es redirigido aquí automáticamente.
