/**
 * Botonera estándar de los diálogos con formulario. Orden fijo:
 *   [Anterior]  …espacio…  [Cancelar] [Principal]
 * - Mientras `guardando`: Cancelar y Anterior se deshabilitan y el botón principal muestra un
 *   spinner SIN cambiar de ancho (el texto queda oculto pero ocupa su lugar).
 *
 *   <AccionesDialogo onCancelar={confirmarCierre} onGuardar={guardar} guardando={guardando}
 *     textoGuardar={editando ? 'Guardar' : 'Crear donante'} />
 *
 *   // Asistente por pasos:
 *   <AccionesDialogo onCancelar={confirmarCierre} onGuardar={siguiente} textoGuardar="Siguiente"
 *     anterior={paso > 0 ? { onClick: atras } : undefined} />
 *
 *   // Con <Dialog alEnviar={guardar}> el principal puede ser type="submit" (Enter guarda):
 *   <AccionesDialogo onCancelar={confirmarCierre} guardando={guardando} enviar />
 *
 * Props:
 *   onCancelar       () => void          — normalmente confirmarCierre de useCerrarConCambios
 *   onGuardar        () => void          — no hace falta si `enviar`
 *   guardando        boolean             — bloquea y muestra spinner
 *   textoGuardar     node = 'Guardar'
 *   textoCancelar    node = 'Cancelar'
 *   anterior         { onClick, texto = 'Anterior', disabled } — botón a la izquierda (opcional)
 *   deshabilitado    boolean             — deshabilita solo el principal
 *   enviar           boolean             — el principal es type="submit"
 *   colorGuardar     color MUI = 'primary'
 *   sxGuardar        sx extra del principal (p. ej. color del módulo)
 *   sx               sx del contenedor (DialogActions)
 */
import { Box, Button, CircularProgress, DialogActions } from '@mui/material';

export default function AccionesDialogo({
  onCancelar, onGuardar, guardando = false,
  textoGuardar = 'Guardar', textoCancelar = 'Cancelar',
  anterior, deshabilitado = false, enviar = false,
  colorGuardar = 'primary', sxGuardar, sx,
}) {
  return (
    <DialogActions sx={{ px: 3, pb: 2, gap: 1, ...sx }}>
      {anterior && (
        <Button onClick={anterior.onClick} disabled={guardando || anterior.disabled} color="inherit">
          {anterior.texto ?? 'Anterior'}
        </Button>
      )}
      <Box sx={{ flex: 1 }} />
      <Button onClick={() => onCancelar?.()} disabled={guardando} color="inherit">
        {textoCancelar}
      </Button>
      <Button
        variant="contained"
        color={colorGuardar}
        type={enviar ? 'submit' : 'button'}
        onClick={enviar ? undefined : () => onGuardar?.()}
        disabled={guardando || deshabilitado}
        aria-busy={guardando || undefined}
        sx={{ position: 'relative', fontWeight: 700, ...sxGuardar }}
      >
        <Box component="span" sx={{ visibility: guardando ? 'hidden' : 'visible' }}>{textoGuardar}</Box>
        {guardando && (
          <CircularProgress size={20} color="inherit" aria-label="Guardando"
            sx={{ position: 'absolute', top: '50%', left: '50%', mt: '-10px', ml: '-10px' }} />
        )}
      </Button>
    </DialogActions>
  );
}
