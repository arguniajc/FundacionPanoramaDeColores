// Mantiene viva la sesión de quien está trabajando y avisa antes de cerrarla por inactividad,
// para que nadie pierda lo que está escribiendo en un formulario.
//  - Renovación silenciosa: si hubo actividad reciente y al token le quedan menos de
//    RENOVAR_ANTES_MIN minutos, se pide uno nuevo a /api/auth/renovar.
//  - Inactividad: a los (INACTIVIDAD_MIN - AVISO_MIN) minutos sin actividad aparece un aviso con
//    cuenta regresiva y botón "Seguir conectado"; si nadie responde, se cierra la sesión.
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, LinearProgress,
} from '@mui/material';
import { useAuth } from '@/application/auth/useAuth';
import { authRepository } from '@/infrastructure/repositories/authRepository';
import { getToken } from '@/infrastructure/storage/authStorage';
import { LOGIN_URL } from '@/shared/constants/routes';

const INACTIVIDAD_MIN    = 60;
const AVISO_MIN          = 5;
const RENOVAR_ANTES_MIN  = 15;
const ACTIVIDAD_RECIENTE = 10 * 60 * 1000;
const REVISION_MS        = 15 * 1000;
const EVENTOS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

/** Fecha de vencimiento del JWT en ms (null si no se puede leer). */
function vencimientoToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null; // token ilegible: el interceptor de 401 se encargará
  }
}

export default function ControlSesion() {
  const { user, login, logout } = useAuth();
  const ultimaActividad = useRef(0);
  const renovando       = useRef(false);
  const [restanteMs, setRestanteMs] = useState(null); // ms hasta el cierre; null = sin aviso
  const avisoAbierto = restanteMs !== null;

  const cerrarSesion = useCallback(() => {
    logout();
    window.location.href = LOGIN_URL;
  }, [logout]);

  const renovar = useCallback(async () => {
    if (renovando.current) return;
    renovando.current = true;
    try {
      const { data } = await authRepository.renovar();
      login(data.token, { email: data.email, nombre: data.nombre, avatarUrl: data.avatarUrl },
            data.rol, data.permisos);
    } catch {
      // si falla (sin conexión, servidor caído) se reintenta en la próxima revisión;
      // un 403 (usuario desactivado) lo maneja el aviso de vencimiento normal
    } finally {
      renovando.current = false;
    }
  }, [login]);

  const seguirConectado = () => {
    ultimaActividad.current = Date.now();
    setRestanteMs(null);
    renovar();
  };

  // Registrar actividad (mientras el aviso está abierto solo cuenta el botón)
  useEffect(() => {
    if (!user) return;
    ultimaActividad.current = Date.now();
    const marcar = () => { if (!avisoAbierto) ultimaActividad.current = Date.now(); };
    EVENTOS.forEach(e => window.addEventListener(e, marcar, { passive: true }));
    return () => EVENTOS.forEach(e => window.removeEventListener(e, marcar));
  }, [user, avisoAbierto]);

  // Revisión periódica: inactividad y vencimiento del token
  useEffect(() => {
    if (!user) return;
    const revisar = () => {
      const ahora    = Date.now();
      const inactivo = ahora - ultimaActividad.current;
      const limite   = INACTIVIDAD_MIN * 60 * 1000;

      if (inactivo >= limite) { cerrarSesion(); return; }
      if (inactivo >= limite - AVISO_MIN * 60 * 1000) setRestanteMs(limite - inactivo);
      else setRestanteMs(null);

      const vence = vencimientoToken(getToken() ?? '');
      if (vence && vence - ahora < RENOVAR_ANTES_MIN * 60 * 1000 && inactivo < ACTIVIDAD_RECIENTE)
        renovar();
    };
    // con el aviso abierto se revisa cada segundo para la cuenta regresiva
    const id = setInterval(revisar, avisoAbierto ? 1000 : REVISION_MS);
    return () => clearInterval(id);
  }, [user, avisoAbierto, cerrarSesion, renovar]);

  if (restanteMs === null) return null;

  const seg = Math.max(0, Math.ceil(restanteMs / 1000));
  const mmss = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;

  return (
    <Dialog open maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>¿Sigues ahí?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Por seguridad, tu sesión se cerrará en <strong>{mmss}</strong> por inactividad.
          Si estás llenando un formulario, pulsa <strong>Seguir conectado</strong> para no perder lo que escribiste.
        </Typography>
        <LinearProgress variant="determinate" value={(restanteMs / (AVISO_MIN * 60 * 1000)) * 100} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={cerrarSesion} color="inherit">Cerrar sesión</Button>
        <Button onClick={seguirConectado} variant="contained" autoFocus>Seguir conectado</Button>
      </DialogActions>
    </Dialog>
  );
}
