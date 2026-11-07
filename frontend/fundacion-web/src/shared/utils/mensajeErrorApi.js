/**
 * Convierte un error de apiClient (axios) en un mensaje claro para el usuario.
 *
 * Cubre: sin conexión / timeout, validaciones del backend (lista propia
 * `errores` o ValidationProblem de ASP.NET), sesión vencida, permisos,
 * conflictos, archivos muy grandes, exceso de peticiones y errores del servidor.
 *
 * @param {unknown} err
 * @param {{ conflicto?: string, accion?: string }} [opciones]
 *   conflicto: mensaje para 409 si el backend no envía uno.
 *   accion:    verbo para el mensaje genérico ("guardar", "eliminar"…).
 * @returns {string}
 */
export function mensajeErrorApi(err, { conflicto, accion = 'guardar' } = {}) {
  const response = err?.response;

  if (!response) {
    if (err?.code === 'ECONNABORTED')
      return 'El servidor tardó demasiado en responder. Intenta de nuevo en un momento.';
    return 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.';
  }

  const { status, data } = response;
  const mensajeBackend = typeof data?.mensaje === 'string' ? data.mensaje : null;

  switch (status) {
    case 400: {
      const detalles = detallesValidacion(data);
      if (detalles.length) return `Revisa estos datos: ${detalles.join(' · ')}`;
      return mensajeBackend ?? 'Algunos datos no son válidos. Revisa el formulario.';
    }
    case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión e intenta de nuevo.';
    case 403: return mensajeBackend ?? 'No tienes permiso para realizar esta acción.';
    case 404: return mensajeBackend ?? 'El registro ya no existe. Recarga la página.';
    case 409: return mensajeBackend ?? conflicto ?? 'El registro entra en conflicto con otro existente.';
    case 413: return 'Los archivos adjuntos son demasiado grandes.';
    case 429: return 'Demasiadas solicitudes seguidas. Espera un momento e intenta de nuevo.';
  }

  if (status >= 500) {
    const codigo = typeof data?.codigo === 'string' ? ` (código ${data.codigo})` : '';
    return `Error del servidor al ${accion}. Intenta de nuevo en unos minutos; si persiste, avisa al administrador${codigo}.`;
  }

  return mensajeBackend ?? `No se pudo ${accion}. Intenta de nuevo.`;
}

// Nombres legibles de los campos que valida el backend
const ETIQUETAS = {
  primernombre: 'Primer nombre', segundonombre: 'Segundo nombre',
  primerapellido: 'Primer apellido', segundoapellido: 'Segundo apellido',
  fechanacimiento: 'Fecha de nacimiento', tipodocumento: 'Tipo de documento',
  numerodocumento: 'Número de documento', genero: 'Género',
  paisnacimiento: 'País de nacimiento', departamentonacimiento: 'Departamento de nacimiento',
  ciudadnacimiento: 'Ciudad de nacimiento', barrio: 'Barrio', direccion: 'Dirección',
  numpersonasvive: 'Personas con las que vive', numhermanos: 'Número de hermanos',
  eps: 'EPS', tallacamisa: 'Talla de camisa', tallapantalon: 'Talla de pantalón',
  tallazapatos: 'Talla de zapatos', pesokg: 'Peso', tallacm: 'Estatura',
  tienealergia: 'Alergia', descripcionalergia: 'Descripción de la alergia',
  observacionessalud: 'Observaciones de salud', descripciondiscapacidad: 'Descripción de la discapacidad',
  nombrecolegio: 'Colegio', gradoescolar: 'Grado escolar',
  nombreacudiente: 'Nombre del acudiente', parentesco: 'Parentesco', whatsapp: 'WhatsApp',
  viveconnino: 'Vive con el niño', autorizacion: 'Autorización',
};

function etiqueta(campo) {
  const clave = campo.replace(/^\$\.?/, '').split('.').pop().toLowerCase();
  return ETIQUETAS[clave] ?? campo.replace(/^\$\.?/, '');
}

function traducir(msg) {
  if (/field is required/i.test(msg))           return 'es obligatorio';
  if (/could not be converted|not valid/i.test(msg)) return 'tiene un formato inválido';
  if (/maximum length|must be a string.*length/i.test(msg)) return 'es demasiado largo';
  return msg;
}

function detallesValidacion(data) {
  // Validación propia del backend: { mensaje, errores: string[] }
  if (Array.isArray(data?.errores)) return data.errores.filter(Boolean);

  // ValidationProblem de ASP.NET: { errors: { Campo: [msg, …] } }
  if (data?.errors && typeof data.errors === 'object') {
    return Object.entries(data.errors)
      .filter(([campo]) => campo !== 'dto')
      .map(([campo, msgs]) => {
        const lista = (Array.isArray(msgs) ? msgs : [msgs]).map(traducir);
        return `${etiqueta(campo)} ${[...new Set(lista)].join(', ')}`;
      });
  }
  return [];
}
