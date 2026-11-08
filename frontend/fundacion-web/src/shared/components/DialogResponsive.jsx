// Dialog de MUI que en móvil (< sm) ocupa toda la pantalla. Se usa en lugar de
// `Dialog` de '@mui/material' con las mismas props:
//   import Dialog from '@/shared/components/DialogResponsive';
// Los diálogos pequeños (maxWidth="xs", p. ej. confirmaciones) siguen flotando.
// Pasar `fullScreen` explícito anula el comportamiento automático.
//
// Props opcionales para formularios (sin ellas el comportamiento es el de siempre):
//   bloqueado  — mientras guarda: clic afuera y Esc no cierran.
//   hayCambios — clic afuera y Esc preguntan "¿Descartar los cambios?" antes de cerrar
//                (ver useCerrarConCambios; para el botón Cancelar usa el hook directamente).
//                Si ya pasas onClose={confirmarCierre} del hook, NO pases además hayCambios:
//                preguntaría dos veces. Patrón recomendado: onClose={confirmarCierre} + bloqueado.
//   alEnviar   — convierte el diálogo en un <form>: Enter en un campo (o un botón
//                type="submit", p. ej. <AccionesDialogo enviar />) llama alEnviar(event).
//                Hace preventDefault y no envía mientras `bloqueado`.
//
//   <Dialog open={open} onClose={onClose} hayCambios={hayCambios} bloqueado={guardando} alEnviar={guardar}>
//     <DialogTitle>Nuevo donante</DialogTitle>
//     <DialogContent>…campos…</DialogContent>
//     <ResumenErrores {...v.resumen} />
//     <ErrorServidor mensaje={error} onClose={() => setError('')} />
//     <AccionesDialogo onCancelar={confirmarCierre} guardando={guardando} enviar />
//   </Dialog>
import { Dialog, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useCerrarConCambios } from '@/shared/hooks/useCerrarConCambios';

export default function DialogResponsive({
  fullScreen, maxWidth = 'sm', onClose,
  hayCambios = false, bloqueado = false, alEnviar, slotProps,
  ...props
}) {
  const theme = useTheme();
  const movil = useMediaQuery(theme.breakpoints.down('sm'));
  const pantallaCompleta = fullScreen ?? (movil && maxWidth !== 'xs' && maxWidth !== false);
  const { confirmarCierre } = useCerrarConCambios({ hayCambios, bloqueado, onCerrar: onClose });

  const conGuardas = hayCambios || bloqueado;
  const manejarCierre = onClose && conGuardas ? (event, reason) => { confirmarCierre(event, reason); } : onClose;

  const slots = alEnviar
    ? {
      ...slotProps,
      paper: {
        component: 'form',
        noValidate: true,
        ...slotProps?.paper,
        // stopPropagation: los eventos de React suben por el árbol de componentes aunque el
        // diálogo esté en un portal; sin esto, Enter en un diálogo abierto DENTRO de otro
        // (p. ej. crear donante desde la donación) también guardaría el de abajo.
        onSubmit: e => { e.preventDefault(); e.stopPropagation(); if (!bloqueado) alEnviar(e); },
      },
    }
    : slotProps;

  return (
    <Dialog fullScreen={pantallaCompleta} maxWidth={maxWidth} onClose={manejarCierre} slotProps={slots} {...props} />
  );
}
