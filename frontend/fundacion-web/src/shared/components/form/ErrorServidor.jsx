/**
 * Error devuelto por el servidor al guardar, mostrado abajo del formulario junto a
 * ResumenErrores (mismos márgenes), cerrable. No muestra nada si `mensaje` está vacío.
 *
 *   const [error, setError] = useState('');
 *   try { await guardar(); } catch (e) { setError(mensajeErrorApi(e)); }
 *   …
 *   <ResumenErrores {...v.resumen} accion="guardar" />
 *   <ErrorServidor mensaje={error} onClose={() => setError('')} />
 *   <AccionesDialogo … />
 *
 * Props: mensaje (string), onClose (opcional: sin él no hay botón de cerrar),
 *        titulo = 'No se pudo guardar', sx.
 */
import { Alert, AlertTitle } from '@mui/material';

export default function ErrorServidor({ mensaje, onClose, titulo = 'No se pudo guardar', sx }) {
  if (!mensaje) return null;
  return (
    <Alert severity="error" onClose={onClose} role="alert" sx={{ mx: 3, mt: 1.5, mb: 0, ...sx }}>
      {titulo && <AlertTitle sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 0.25 }}>{titulo}</AlertTitle>}
      {mensaje}
    </Alert>
  );
}
