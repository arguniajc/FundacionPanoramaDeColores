// Dialog de MUI que en móvil (< sm) ocupa toda la pantalla. Se usa en lugar de
// `Dialog` de '@mui/material' con las mismas props:
//   import Dialog from '@/shared/components/DialogResponsive';
// Los diálogos pequeños (maxWidth="xs", p. ej. confirmaciones) siguen flotando.
// Pasar `fullScreen` explícito anula el comportamiento automático.
import { Dialog, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export default function DialogResponsive({ fullScreen, maxWidth = 'sm', ...props }) {
  const theme = useTheme();
  const movil = useMediaQuery(theme.breakpoints.down('sm'));
  const pantallaCompleta = fullScreen ?? (movil && maxWidth !== 'xs' && maxWidth !== false);
  return <Dialog fullScreen={pantallaCompleta} maxWidth={maxWidth} {...props} />;
}
