import { Alert, Box, Typography } from '@mui/material';

/**
 * Aviso común "Corrige estos datos para …" con la lista de campos mal llenados.
 * Va justo encima de los botones del formulario para que se vea al pulsar Guardar.
 * Recibe el objeto `resumen` de useValidacion, o `errores` + `etiqueta(campo)` directamente.
 */
export default function ResumenErrores({
  visible, errores, esquema, etiqueta, onClose, accion = 'guardar', sx,
}) {
  const lista = Object.entries(errores ?? {});
  if (!visible || lista.length === 0) return null;

  const nombre = campo => etiqueta?.(campo) ?? esquema?.[campo]?.etiqueta ?? campo;

  return (
    <Alert severity="warning" onClose={onClose} sx={{ mx: 3, mt: 1.5, mb: 0, ...sx }}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 0.5 }}>
        Corrige estos datos para {accion}:
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: '0.8rem', maxHeight: 160, overflowY: 'auto' }}>
        {lista.map(([campo, msg]) => (
          <li key={campo}><strong>{nombre(campo)}:</strong> {msg}</li>
        ))}
      </Box>
    </Alert>
  );
}
