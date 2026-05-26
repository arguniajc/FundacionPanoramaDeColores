# Módulo: Configuración

Panel de ajustes generales de la fundación: datos institucionales, representante legal, textos del sitio web, apariencia, servidor de correo (SMTP) y página de presentación pública.

## Archivos

| Archivo | Rol |
|---|---|
| `pages/ConfiguracionPage.jsx` | Contenedor con pestañas, carga la config al montar |
| `pages/components/TabFundacion.jsx` | Datos básicos de la fundación (nombre, NIT, dirección) |
| `pages/components/TabRepLegal.jsx` | Representante legal + firma digital |
| `pages/components/TabTextos.jsx` | Textos institucionales (misión, visión, etc.) |
| `pages/components/TabPaginaWeb.jsx` | Contenido de la landing pública |
| `pages/components/TabApariencia.jsx` | Colores y logo |
| `pages/components/TabSmtp.jsx` | Configuración del servidor de correo + botón de prueba |
| `pages/components/ColorPicker.jsx` | Selector de color reutilizable dentro del módulo |
| `pages/components/FirmaRepresentante.jsx` | Pad de firma digital |
| `pages/components/ImagenField.jsx` | Upload de imagen con preview |
| `pages/components/Seccion.jsx` | Wrapper visual de sección con título |
| `pages/components/helpers.js` | Funciones puras de validación y transformación del form |

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/configuracion` | Cargar toda la configuración al abrir el módulo |
| PUT | `/api/configuracion` | Guardar cambios |
| GET | `/api/configuracion/publica` | Versión pública (sin datos sensibles como SMTP) |
| POST | `/api/configuracion/probar-smtp` | Enviar correo de prueba con la config actual |
| POST | `/api/archivos/upload?carpeta=web` | Subir logo e imágenes del sitio |

## Notas

Solo los roles con permiso `configuracion.editar` ven este módulo. La configuración pública (`/publica`) la consumen otros módulos como la landing page y los certificados PDF.
