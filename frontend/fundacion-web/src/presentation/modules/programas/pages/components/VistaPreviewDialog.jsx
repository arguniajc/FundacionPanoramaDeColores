import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Typography,
  useMediaQuery, useTheme,
} from '@mui/material';
import { COLOR, camposDeSeccion, seccionesOrdenadas } from './helpers';
import { CampoPreview } from './CampoPreview';

export function VistaPreviewDialog({ campos, programa, onCerrar }) {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const secciones = seccionesOrdenadas(campos);

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}>
      <DialogTitle sx={{ bgcolor: COLOR, color: 'white', py: 1.5 }}>
        <Typography fontWeight={700}>Vista previa del formulario</Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>{programa.nombre} · {programa.nombreSede}</Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
        {campos.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            No hay campos configurados aún.
          </Box>
        ) : (
          <Box>
            {secciones.map((sec, si) => {
              const grp = camposDeSeccion(campos, sec);
              return (
                <Box key={sec || '_root'} mb={si < secciones.length - 1 ? 3 : 0}>
                  {sec && (
                    <Box sx={{
                      borderLeft: `5px solid ${COLOR}`,
                      bgcolor: 'rgba(78,27,149,0.07)',
                      borderRadius: '0 8px 8px 0',
                      px: 1.5, py: 0.9, mb: 2,
                    }}>
                      <Typography fontWeight={800} color={COLOR}
                        sx={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {sec}
                      </Typography>
                    </Box>
                  )}
                  <Grid container spacing={2.5}>
                    {grp.map(c => (
                      <Grid key={c.id}
                        size={(c.tipo === 'document' || c.tipo === 'daterange' || c.tipo === 'documento_id') ? 12 : { xs: 12, sm: c.columnas ?? 6 }}>
                        <CampoPreview campo={c} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onCerrar} variant="contained" sx={{ bgcolor: COLOR }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
