import { Alert, Box, Button, Divider, Grid, MenuItem, Select, Typography, FormControl, InputLabel } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { APARIENCIA_RECOMENDADA } from '@/shared/theme/paleta';
import { Seccion }      from './Seccion';
import { ColorPicker }  from './ColorPicker';
import { FONT_OPTIONS, DEFAULTS } from '@/shared/context/useConfiguracion';

const COLORES_MARCA = [
  { key: 'colorPrimario',   cssVar: '--color-primario',   label: 'Color primario',   desc: 'Encabezados, tabs, botones e identidad visual' },
  { key: 'colorSecundario', cssVar: '--color-secundario', label: 'Color secundario', desc: 'Botones de acción positiva y confirmaciones' },
  { key: 'colorGradiente',  cssVar: '--color-gradiente',  label: 'Color gradiente',  desc: 'Segundo tono en degradados de cabeceras y banners' },
  { key: 'colorAccento',    cssVar: '--color-acento',     label: 'Color acento',     desc: 'Alertas, botones destacados y llamados a la acción' },
  { key: 'colorSidebar',    cssVar: '--color-sidebar',    label: 'Sidebar modo claro', desc: 'Fondo de la barra lateral en modo claro' },
];

const COLORES_OSCURO = [
  { key: 'colorOscuroSidebar', cssVar: '--color-oscuro-sidebar', label: 'Sidebar modo oscuro',  desc: 'Fondo lateral oscuro elegante' },
  { key: 'colorOscuroFondo',   cssVar: '--color-oscuro-fondo',   label: 'Fondo modo oscuro',    desc: 'Fondo principal cómodo para lectura' },
  { key: 'colorOscuroPaper',   cssVar: '--color-oscuro-paper',   label: 'Tarjetas modo oscuro', desc: 'Fondo de tarjetas, formularios y diálogos' },
];

function luminance(hex) {
  if (!hex?.startsWith('#') || hex.length < 7) return 0;
  const r = parseInt(hex.slice(1,3), 16) / 255;
  const g = parseInt(hex.slice(3,5), 16) / 255;
  const b = parseInt(hex.slice(5,7), 16) / 255;
  return 0.2126*r + 0.7152*g + 0.0722*b;
}

export function TabApariencia({ form, setForm }) {
  const cambiar = (key, cssVar) => (v) => {
    setForm(p => ({ ...p, [key]: v }));
    document.documentElement.style.setProperty(cssVar, v);
  };

  const cambiarFuente = (familia) => {
    setForm(p => ({ ...p, fontFamily: familia }));
    const spec = {
      'Inter':    'Inter:wght@400;500;600;700;800',
      'Poppins':  'Poppins:wght@400;500;600;700;800',
      'Nunito':   'Nunito:wght@400;500;600;700;800',
      'Roboto':   'Roboto:wght@400;500;700',
      'Open Sans':'Open+Sans:wght@400;500;600;700',
    }[familia] || 'Inter:wght@400;500;600;700;800';
    const href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
    let link = document.getElementById('dynamic-font-link');
    if (!link) { link = document.createElement('link'); link.id = 'dynamic-font-link'; link.rel = 'stylesheet'; document.head.appendChild(link); }
    link.href = href;
    document.documentElement.style.setProperty('--fuente-principal', `'${familia}', sans-serif`);
    document.body.style.fontFamily = `'${familia}', sans-serif`;
  };

  // Aplica la paleta recomendada (contraste AA y modo oscuro propio); queda guardada al pulsar "Guardar"
  const usarRecomendada = () => {
    setForm(p => ({ ...p, ...APARIENCIA_RECOMENDADA }));
    [...COLORES_MARCA, ...COLORES_OSCURO].forEach(c =>
      document.documentElement.style.setProperty(c.cssVar, APARIENCIA_RECOMENDADA[c.key]));
    cambiarFuente(APARIENCIA_RECOMENDADA.fontFamily);
  };

  const cp  = form.colorPrimario   || DEFAULTS.colorPrimario;
  const cs  = form.colorSidebar    || DEFAULTS.colorSidebar;
  const cgr = form.colorGradiente  || DEFAULTS.colorGradiente;
  const cos = form.colorOscuroSidebar || DEFAULTS.colorOscuroSidebar;
  const cof = form.colorOscuroFondo   || DEFAULTS.colorOscuroFondo;
  const cop = form.colorOscuroPaper   || DEFAULTS.colorOscuroPaper;
  const cac = form.colorAccento       || DEFAULTS.colorAccento;
  const csec = form.colorSecundario   || DEFAULTS.colorSecundario;
  const ff  = form.fontFamily || DEFAULTS.fontFamily;

  const sbClaro    = luminance(cs)  > 0.35;
  const sbOscClaro = luminance(cos) > 0.35;

  const sidebarTexto = sbClaro ? 'rgba(0,0,0,0.75)' : '#fff';
  const sidebarAcc   = sbClaro ? cp : '#B4E8E8';
  const sidebarIcon  = sbClaro ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.50)';

  const gradienteHeader = `linear-gradient(135deg, ${cp} 0%, ${cgr} 100%)`;

  return (
    <Box>
      <Alert severity="info" icon={<AutoAwesomeIcon />} sx={{ mb: 3, alignItems: 'center' }}
        action={<Button color="inherit" size="small" variant="outlined" onClick={usarRecomendada}>Usar paleta recomendada</Button>}>
        Paleta pensada para leer con comodidad en modo claro y oscuro. Después de aplicarla, pulsa <b>Guardar</b>.
      </Alert>

      {/* ── Tipografía ── */}
      <Seccion titulo="Tipografía">
        <Grid sx={{ alignItems: 'flex-start' }} container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Fuente principal</InputLabel>
              <Select
                value={ff}
                label="Fuente principal"
                onChange={(e) => cambiarFuente(e.target.value)}
              >
                {FONT_OPTIONS.map(f => (
                  <MenuItem key={f.value} value={f.value}>
                    <Box>
                      <Typography sx={{ fontFamily: `'${f.value}', sans-serif`, fontWeight: 600, fontSize: '0.9rem' }}>
                        {f.label}
                      </Typography>
                      <Typography sx={{ color: 'text.secondary' }} variant="caption">{f.desc}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
              <Typography sx={{ fontFamily: `'${ff}', sans-serif`, fontWeight: 800, fontSize: '1.1rem', mb: 0.5 }}>
                Fundación Panorama de Colores
              </Typography>
              <Typography sx={{ fontFamily: `'${ff}', sans-serif`, fontSize: '0.85rem', color: 'text.secondary', mb: 0.5 }}>
                Texto normal — lorem ipsum dolor sit amet consectetur.
              </Typography>
              <Typography sx={{ fontFamily: `'${ff}', sans-serif`, fontWeight: 600, fontSize: '0.82rem', color: 'var(--color-primario-texto)' }}>
                Texto destacado — Inter Medium 600
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Seccion>

      {/* ── Colores de marca ── */}
      <Box sx={{ mt: 3 }}>
        <Seccion titulo="Colores de marca (modo claro)">
          <Grid container spacing={3}>
            {COLORES_MARCA.map(c => (
              <Grid key={c.key} size={{ xs: 12, sm: 6 }}>
                <ColorPicker
                  label={c.label}
                  sublabel={c.desc}
                  value={form[c.key] || DEFAULTS[c.key]}
                  onChange={cambiar(c.key, c.cssVar)}
                />
              </Grid>
            ))}
          </Grid>
        </Seccion>
      </Box>

      {/* ── Modo oscuro ── */}
      <Box sx={{ mt: 3 }}>
        <Seccion titulo="Colores modo oscuro">
          <Grid container spacing={3}>
            {COLORES_OSCURO.map(c => (
              <Grid key={c.key} size={{ xs: 12, sm: 6 }}>
                <ColorPicker
                  label={c.label}
                  sublabel={c.desc}
                  value={form[c.key] || DEFAULTS[c.key]}
                  onChange={cambiar(c.key, c.cssVar)}
                />
              </Grid>
            ))}
          </Grid>
        </Seccion>
      </Box>

      {/* ── Vista previa ── */}
      <Box sx={{ mt: 3 }}>
        <Seccion titulo="Vista previa en tiempo real">
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>

            {/* Sidebar modo claro */}
            <Box sx={{ width: 152, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
              <Box sx={{ bgcolor: cs, p: 1.5 }}>
                <Typography sx={{ color: sidebarTexto, fontWeight: 800, fontSize: '0.68rem', fontFamily: `'${ff}',sans-serif` }}>Fundación</Typography>
                <Typography sx={{ color: sidebarAcc, fontWeight: 700, fontSize: '0.6rem', fontFamily: `'${ff}',sans-serif` }}>Panorama de Colores</Typography>
              </Box>
              {['Dashboard', 'Beneficiarios', 'Configuración'].map((item, i) => (
                <Box key={item} sx={{
                  px: 1.5, py: 0.7,
                  borderLeft: i === 1 ? `3px solid ${sidebarAcc}` : '3px solid transparent',
                  bgcolor: i === 1 ? `${cp}1a` : cs,
                }}>
                  <Typography sx={{ color: i === 1 ? sidebarAcc : sidebarIcon, fontSize: '0.63rem', fontFamily: `'${ff}',sans-serif` }}>{item}</Typography>
                </Box>
              ))}
              <Box sx={{ p: 0.8, bgcolor: cs, textAlign: 'center' }}>
                <Typography sx={{ color: sidebarAcc, fontSize: '0.55rem', opacity: 0.6 }}>Modo claro</Typography>
              </Box>
            </Box>

            {/* Sidebar modo oscuro */}
            <Box sx={{ width: 152, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
              <Box sx={{ bgcolor: cos, p: 1.5 }}>
                <Typography sx={{ color: sbOscClaro ? 'rgba(0,0,0,0.78)' : '#fff', fontWeight: 800, fontSize: '0.68rem', fontFamily: `'${ff}',sans-serif` }}>Fundación</Typography>
                <Typography sx={{ color: sbOscClaro ? cp : '#B4E8E8', fontWeight: 700, fontSize: '0.6rem', fontFamily: `'${ff}',sans-serif` }}>Panorama de Colores</Typography>
              </Box>
              {['Dashboard', 'Beneficiarios', 'Configuración'].map((item, i) => (
                <Box key={item} sx={{
                  px: 1.5, py: 0.7,
                  bgcolor: i === 0 ? `${cp}26` : cos,
                  borderLeft: i === 0 ? `3px solid ${cp}` : '3px solid transparent',
                }}>
                  <Typography sx={{ color: i === 0 ? (sbOscClaro ? cp : '#B4E8E8') : (sbOscClaro ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)'), fontSize: '0.63rem', fontFamily: `'${ff}',sans-serif` }}>{item}</Typography>
                </Box>
              ))}
              <Box sx={{ p: 0.8, bgcolor: cos, textAlign: 'center' }}>
                <Typography sx={{ color: sbOscClaro ? cp : '#B4E8E8', fontSize: '0.55rem', opacity: 0.6 }}>Modo oscuro</Typography>
              </Box>
            </Box>

            {/* Encabezado y botones */}
            <Box sx={{ flex: 1, minWidth: 220 }}>
              <Box sx={{ background: gradienteHeader, borderRadius: '12px 12px 0 0', px: 2, py: 1.5 }}>
                <Typography sx={{ fontWeight: 800, color: 'white', fontSize: '0.88rem', fontFamily: `'${ff}',sans-serif`, letterSpacing: '0.04em' }}>
                  Módulo Beneficiarios
                </Typography>
              </Box>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderTop: 'none', borderRadius: '0 0 12px 12px', p: 2 }}>
                <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 1.5, fontFamily: `'${ff}',sans-serif` }}>
                  Botones según rol y contexto:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Box sx={{ bgcolor: cp, color: '#fff', px: 1.8, py: 0.6, borderRadius: 1.5, fontSize: '0.75rem', fontWeight: 700, fontFamily: `'${ff}',sans-serif` }}>Guardar</Box>
                  <Box sx={{ bgcolor: csec, color: '#fff', px: 1.8, py: 0.6, borderRadius: 1.5, fontSize: '0.75rem', fontWeight: 700, fontFamily: `'${ff}',sans-serif` }}>+ Nuevo</Box>
                  <Box sx={{ bgcolor: cac, color: '#fff', px: 1.8, py: 0.6, borderRadius: 1.5, fontSize: '0.75rem', fontWeight: 700, fontFamily: `'${ff}',sans-serif` }}>Inscribir</Box>
                  <Box sx={{ border: `1.5px solid ${cp}`, color: cp, px: 1.8, py: 0.6, borderRadius: 1.5, fontSize: '0.75rem', fontWeight: 600, fontFamily: `'${ff}',sans-serif` }}>Cancelar</Box>
                </Box>
              </Box>

              <Divider sx={{ my: 1.5 }} />

              {/* Modo oscuro preview */}
              <Box sx={{ bgcolor: cof, borderRadius: 2, p: 1.5 }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', mb: 1, fontFamily: `'${ff}',sans-serif` }}>Vista modo oscuro</Typography>
                <Box sx={{ bgcolor: cop, borderRadius: 1.5, p: 1.5 }}>
                  <Typography sx={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600, fontFamily: `'${ff}',sans-serif` }}>Tarjeta en modo oscuro</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', mt: 0.3, fontFamily: `'${ff}',sans-serif` }}>Fondo {cof} · Tarjeta {cop}</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Seccion>
      </Box>

      <Alert severity="info" sx={{ mt: 2 }} icon={false}>
        Los cambios se aplican <strong>en tiempo real</strong>. Guarda para que persistan en todos los dispositivos y sesiones.
      </Alert>
    </Box>
  );
}
