import { Alert, Box, Grid, Typography } from '@mui/material';
import { Seccion }      from './Seccion';
import { ColorPicker }  from './ColorPicker';

export function TabApariencia({ form, setForm }) {
  const cambiarPrimario = (v) => {
    setForm(p => ({ ...p, colorPrimario: v }));
    document.documentElement.style.setProperty('--color-primario', v);
  };
  const cambiarSidebar = (v) => {
    setForm(p => ({ ...p, colorSidebar: v }));
    document.documentElement.style.setProperty('--color-sidebar', v);
  };

  return (
    <Box>
      <Seccion titulo="Colores del sistema">
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <ColorPicker label="Color primario (botones, encabezados)" value={form.colorPrimario} onChange={cambiarPrimario} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <ColorPicker label="Color sidebar (barra lateral)" value={form.colorSidebar} onChange={cambiarSidebar} />
          </Grid>
        </Grid>
      </Seccion>
      <Box mt={3}>
        <Seccion titulo="Vista previa">
          <Box display="flex" gap={2} flexWrap="wrap">
            <Box sx={{ width: 160, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
              <Box sx={{ bgcolor: form.colorSidebar, p: 1.5 }}>
                <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '0.7rem' }}>Fundación</Typography>
                <Typography sx={{ color: '#B4E8E8', fontWeight: 700, fontSize: '0.62rem' }}>Panorama de Colores</Typography>
              </Box>
              {['Dashboard','Beneficiarios','Configuración'].map((item, i) => (
                <Box key={item} sx={{ px: 1.5, py: 0.8, bgcolor: form.colorSidebar,
                  borderLeft: i === 2 ? '3px solid #B4E8E8' : '3px solid transparent', opacity: i === 2 ? 1 : 0.7 }}>
                  <Typography sx={{ color: i === 2 ? '#B4E8E8' : '#fff', fontSize: '0.68rem' }}>{item}</Typography>
                </Box>
              ))}
            </Box>
            <Box flex={1} minWidth={200}>
              <Box sx={{ bgcolor: form.colorPrimario, borderRadius: '8px 8px 0 0', px: 2, py: 1 }}>
                <Typography variant="caption" fontWeight={800} color="white" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                  Encabezado de sección
                </Typography>
              </Box>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderTop: 'none', borderRadius: '0 0 8px 8px', p: 2 }}>
                <Typography variant="body2" color="text.secondary" mb={2}>Así se verán encabezados y botones.</Typography>
                <Box display="flex" gap={1}>
                  <Box sx={{ bgcolor: form.colorPrimario, color: '#fff', px: 2, py: 0.8, borderRadius: 2, fontSize: '0.82rem', fontWeight: 600 }}>Guardar</Box>
                  <Box sx={{ border: `1.5px solid ${form.colorPrimario}`, color: form.colorPrimario, px: 2, py: 0.8, borderRadius: 2, fontSize: '0.82rem', fontWeight: 600 }}>Cancelar</Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Seccion>
      </Box>
      <Alert severity="info" sx={{ mt: 2 }} icon={false}>
        Los cambios de color se aplican <strong>en tiempo real</strong> mientras editas. Guarda para que persistan.
      </Alert>
    </Box>
  );
}
