import { Alert, Box, Divider, Grid, Typography } from '@mui/material';
import { Seccion }     from './Seccion';
import { ColorPicker } from './ColorPicker';

const COLORES = [
  {
    key: 'colorPrimario',
    cssVar: '--color-primario',
    label: 'Color primario',
    desc: 'Encabezados, tabs, íconos y bordes de acento',
    default: '#4E1B95',
  },
  {
    key: 'colorSecundario',
    cssVar: '--color-secundario',
    label: 'Color secundario',
    desc: 'Botón "Nuevo", confirmaciones y estados positivos',
    default: '#2D984F',
  },
  {
    key: 'colorGradiente',
    cssVar: '--color-gradiente',
    label: 'Color gradiente',
    desc: 'Segundo tono en degradados de cabeceras y diálogos',
    default: '#3a1470',
  },
  {
    key: 'colorSidebar',
    cssVar: '--color-sidebar',
    label: 'Sidebar (modo claro)',
    desc: 'Fondo de la barra lateral en modo claro',
    default: '#150830',
  },
];

const COLORES_OSCURO = [
  {
    key: 'colorOscuroSidebar',
    cssVar: '--color-oscuro-sidebar',
    label: 'Sidebar modo oscuro',
    desc: 'Fondo de la barra lateral en modo oscuro',
    default: '#0d1117',
  },
  {
    key: 'colorOscuroFondo',
    cssVar: '--color-oscuro-fondo',
    label: 'Fondo modo oscuro',
    desc: 'Fondo principal de la app en modo oscuro',
    default: '#0f0f0f',
  },
  {
    key: 'colorOscuroPaper',
    cssVar: '--color-oscuro-paper',
    label: 'Tarjetas modo oscuro',
    desc: 'Fondo de tarjetas y diálogos en modo oscuro',
    default: '#1c1c1c',
  },
];

export function TabApariencia({ form, setForm }) {
  const cambiar = (key, cssVar) => (v) => {
    setForm(p => ({ ...p, [key]: v }));
    document.documentElement.style.setProperty(cssVar, v);
  };

  const gradienteHeader = `linear-gradient(135deg, ${form.colorPrimario || '#4E1B95'} 0%, ${form.colorGradiente || '#3a1470'} 100%)`;

  return (
    <Box>
      {/* ── Colores de marca ── */}
      <Seccion titulo="Colores de marca (modo claro)">
        <Grid container spacing={3}>
          {COLORES.map(c => (
            <Grid key={c.key} size={{ xs: 12, sm: 6 }}>
              <ColorPicker
                label={c.label}
                sublabel={c.desc}
                value={form[c.key] || c.default}
                onChange={cambiar(c.key, c.cssVar)}
              />
            </Grid>
          ))}
        </Grid>
      </Seccion>

      {/* ── Modo oscuro ── */}
      <Box mt={3}>
        <Seccion titulo="Colores modo oscuro">
          <Grid container spacing={3}>
            {COLORES_OSCURO.map(c => (
              <Grid key={c.key} size={{ xs: 12, sm: 6 }}>
                <ColorPicker
                  label={c.label}
                  sublabel={c.desc}
                  value={form[c.key] || c.default}
                  onChange={cambiar(c.key, c.cssVar)}
                />
              </Grid>
            ))}
          </Grid>
        </Seccion>
      </Box>

      {/* ── Vista previa ── */}
      <Box mt={3}>
        <Seccion titulo="Vista previa">
          <Box display="flex" gap={2} flexWrap="wrap">

            {/* Sidebar modo claro */}
            <Box sx={{ width: 150, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
              <Box sx={{ bgcolor: form.colorSidebar || '#150830', p: 1.5 }}>
                <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '0.68rem' }}>Fundación</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6rem' }}>Panorama de Colores</Typography>
              </Box>
              {['Dashboard', 'Beneficiarios', 'Configuración'].map((item, i) => (
                <Box key={item} sx={{
                  px: 1.5, py: 0.7,
                  bgcolor: form.colorSidebar || '#150830',
                  borderLeft: i === 1 ? `3px solid ${form.colorSecundario || '#2D984F'}` : '3px solid transparent',
                  opacity: i === 1 ? 1 : 0.65,
                }}>
                  <Typography sx={{ color: '#fff', fontSize: '0.65rem' }}>{item}</Typography>
                </Box>
              ))}
              <Box sx={{ p: 1, bgcolor: form.colorSidebar || '#150830', opacity: 0.5 }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.58rem', textAlign: 'center' }}>
                  Modo claro
                </Typography>
              </Box>
            </Box>

            {/* Sidebar modo oscuro */}
            <Box sx={{ width: 150, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
              <Box sx={{ bgcolor: form.colorOscuroSidebar || '#0d1117', p: 1.5 }}>
                <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '0.68rem' }}>Fundación</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem' }}>Panorama de Colores</Typography>
              </Box>
              {['Dashboard', 'Beneficiarios', 'Configuración'].map((item, i) => (
                <Box key={item} sx={{
                  px: 1.5, py: 0.7,
                  bgcolor: form.colorOscuroSidebar || '#0d1117',
                  borderLeft: i === 0 ? `3px solid ${form.colorPrimario || '#4E1B95'}` : '3px solid transparent',
                  opacity: i === 0 ? 1 : 0.55,
                }}>
                  <Typography sx={{ color: '#fff', fontSize: '0.65rem' }}>{item}</Typography>
                </Box>
              ))}
              <Box sx={{ p: 1, bgcolor: form.colorOscuroSidebar || '#0d1117', opacity: 0.5 }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.58rem', textAlign: 'center' }}>
                  Modo oscuro
                </Typography>
              </Box>
            </Box>

            {/* Encabezados y botones */}
            <Box flex={1} minWidth={200}>
              <Box sx={{ background: gradienteHeader, borderRadius: '8px 8px 0 0', px: 2, py: 1.2 }}>
                <Typography variant="caption" fontWeight={800} color="white" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                  Encabezado con gradiente
                </Typography>
              </Box>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderTop: 'none', borderRadius: '0 0 8px 8px', p: 2 }}>
                <Typography variant="body2" color="text.secondary" mb={2}>Botones y estados de acción:</Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Box sx={{ bgcolor: form.colorPrimario || '#4E1B95', color: '#fff', px: 2, py: 0.7, borderRadius: 2, fontSize: '0.78rem', fontWeight: 700 }}>
                    Guardar
                  </Box>
                  <Box sx={{ bgcolor: form.colorSecundario || '#2D984F', color: '#fff', px: 2, py: 0.7, borderRadius: 2, fontSize: '0.78rem', fontWeight: 700 }}>
                    + Nuevo
                  </Box>
                  <Box sx={{ border: `1.5px solid ${form.colorPrimario || '#4E1B95'}`, color: form.colorPrimario || '#4E1B95', px: 2, py: 0.7, borderRadius: 2, fontSize: '0.78rem', fontWeight: 600 }}>
                    Cancelar
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 1.5 }} />

              {/* Modo oscuro preview */}
              <Box sx={{ bgcolor: form.colorOscuroFondo || '#0f0f0f', borderRadius: 2, p: 1.5 }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', mb: 1 }}>Modo oscuro — fondo + tarjeta</Typography>
                <Box sx={{ bgcolor: form.colorOscuroPaper || '#1c1c1c', borderRadius: 1.5, p: 1.5 }}>
                  <Typography sx={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>Tarjeta en modo oscuro</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.68rem', mt: 0.3 }}>
                    Así se ven las tarjetas sobre el fondo oscuro.
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Seccion>
      </Box>

      <Alert severity="info" sx={{ mt: 2 }} icon={false}>
        Los cambios se aplican <strong>en tiempo real</strong> mientras editas. Guarda para que persistan en todos los dispositivos.
      </Alert>
    </Box>
  );
}
