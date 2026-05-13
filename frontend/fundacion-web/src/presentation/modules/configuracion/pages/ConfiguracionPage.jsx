// Configuración global: Fundación · Representante Legal · Apariencia · Textos
import { useState, useEffect, useRef } from 'react';
import {
  Alert, Box, Button, CircularProgress, Divider, FormControl,
  Grid, InputLabel, MenuItem, Select, Snackbar, Tab, Tabs,
  TextField, Tooltip, Typography,
} from '@mui/material';
import SaveIcon        from '@mui/icons-material/Save';
import UploadFileIcon  from '@mui/icons-material/UploadFile';
import PaletteIcon     from '@mui/icons-material/Palette';
import FirmaPad        from '../../../../shared/components/FirmaPad';
import { configuracionRepository } from '../../../../infrastructure/repositories/configuracionRepository';
import { useConfiguracion }        from '../../../../shared/context/ConfiguracionContext';

const COLOR   = 'var(--color-primario)';
const TIPOS_DOC = ['CC', 'CE', 'PP', 'NIT', 'Otro'];

const VACIO = {
  nombreFundacion:   '',
  nit:               '',
  direccion:         '',
  telefono:          '',
  nombreRepLegal:    '',
  tipoDocRep:        'CC',
  documentoRep:      '',
  cargoRep:          '',
  firmaRep:          '',
  colorPrimario:     '#4E1B95',
  colorSidebar:      '#150830',
  tagline:           '',
  mision:            '',
  vision:            '',
  emailContacto:     '',
  sitioWeb:          '',
  mensajeBienvenida: '',
  footerTexto:       '',
};

function leerArchivoComoDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function redimensionarImagen(dataUrl, maxW = 600) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio  = Math.min(1, maxW / img.naturalWidth);
      const w      = Math.round(img.naturalWidth  * ratio);
      const h      = Math.round(img.naturalHeight * ratio);
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ── Subir imagen de firma ──────────────────────────────────────────────────────
function FirmaRepresentante({ value, onChange }) {
  const inputRef            = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errImg,   setErrImg]   = useState('');

  const handleSubir = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!file.type.startsWith('image/')) {
      setErrImg('El archivo debe ser una imagen (JPG, PNG, GIF…)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrImg('La imagen no puede superar 5 MB');
      return;
    }
    setErrImg('');
    setSubiendo(true);
    try {
      const raw      = await leerArchivoComoDataUrl(file);
      const reducida = await redimensionarImagen(raw, 600);
      onChange(reducida);
    } catch {
      setErrImg('No se pudo procesar la imagen.');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <Box>
      <FirmaPad
        label="Firma del representante legal"
        value={value}
        onChange={onChange}
      />
      <Box mt={1} display="flex" alignItems="center" gap={1}>
        <Tooltip title="Sube una foto o escaneo de la firma (JPG, PNG…)">
          <Button size="small" variant="outlined" startIcon={<UploadFileIcon />}
            onClick={() => inputRef.current?.click()} disabled={subiendo}
            sx={{ color: COLOR, borderColor: COLOR, fontSize: '0.75rem' }}>
            {subiendo ? 'Procesando…' : 'Subir imagen de firma'}
          </Button>
        </Tooltip>
        <Typography variant="caption" color="text.secondary">
          JPG · PNG · máx. 5 MB
        </Typography>
      </Box>
      {errImg && (
        <Typography variant="caption" color="error" display="block" mt={0.5}>{errImg}</Typography>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleSubir} />
    </Box>
  );
}

// ── Selector de color ──────────────────────────────────────────────────────────
function ColorPicker({ label, value, onChange }) {
  const ref = useRef(null);
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>{label}</Typography>
      <Box
        display="flex" alignItems="center" gap={1.5}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.2, cursor: 'pointer' }}
        onClick={() => ref.current?.click()}
      >
        <Box sx={{
          width: 36, height: 36, borderRadius: 1.5,
          bgcolor: value, border: '2px solid rgba(0,0,0,0.15)', flexShrink: 0,
        }} />
        <Box>
          <Typography variant="body2" fontWeight={600}>{value}</Typography>
          <Typography variant="caption" color="text.secondary">Haz clic para cambiar</Typography>
        </Box>
        <PaletteIcon sx={{ ml: 'auto', color: 'text.secondary', fontSize: 18 }} />
      </Box>
      <input
        ref={ref} type="color" value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }}
      />
    </Box>
  );
}

// ── Sección con header morado ──────────────────────────────────────────────────
function Seccion({ titulo, children }) {
  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ bgcolor: COLOR, borderRadius: '8px 8px 0 0', px: 2, py: 1 }}>
        <Typography variant="caption" fontWeight={800} color="white"
          sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
          {titulo}
        </Typography>
      </Box>
      <Box sx={{ border: '1px solid', borderColor: 'color-mix(in srgb, var(--color-primario) 25%, transparent)',
                 borderTop: 'none', borderRadius: '0 0 8px 8px', p: 3 }}>
        {children}
      </Box>
    </Box>
  );
}

// ── Pestaña: Fundación ─────────────────────────────────────────────────────────
function TabFundacion({ form, set }) {
  return (
    <Seccion titulo="Datos de la Fundación">
      <Grid container spacing={2.5}>
        <Grid size={12}>
          <TextField fullWidth size="small" label="Nombre de la fundación"
            value={form.nombreFundacion} onChange={set('nombreFundacion')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" label="NIT"
            value={form.nit} onChange={set('nit')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" label="Teléfono"
            value={form.telefono} onChange={set('telefono')} />
        </Grid>
        <Grid size={12}>
          <TextField fullWidth size="small" label="Dirección"
            value={form.direccion} onChange={set('direccion')} />
        </Grid>
      </Grid>
    </Seccion>
  );
}

// ── Pestaña: Representante Legal ───────────────────────────────────────────────
function TabRepLegal({ form, set, setForm }) {
  return (
    <Seccion titulo="Representante Legal">
      <Alert severity="info" sx={{ mb: 2.5 }} icon={false}>
        Al <strong>autorizar un proyecto</strong> desde el módulo Proyectos, se toma una copia de estos
        datos en ese momento. Actualizar aquí no cambia proyectos ya autorizados.
      </Alert>
      <Grid container spacing={2.5}>
        <Grid size={12}>
          <TextField fullWidth size="small" label="Nombre completo del representante legal"
            value={form.nombreRepLegal} onChange={set('nombreRepLegal')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 5 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Tipo de documento</InputLabel>
            <Select label="Tipo de documento" value={form.tipoDocRep} onChange={set('tipoDocRep')}>
              {TIPOS_DOC.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 7 }}>
          <TextField fullWidth size="small" label="Número de documento"
            value={form.documentoRep} onChange={set('documentoRep')} />
        </Grid>
        <Grid size={12}>
          <TextField fullWidth size="small" label="Cargo"
            placeholder="Ej: Directora Ejecutiva, Representante Legal…"
            value={form.cargoRep} onChange={set('cargoRep')} />
        </Grid>
        <Grid size={12}>
          <FirmaRepresentante
            value={form.firmaRep}
            onChange={(v) => setForm(p => ({ ...p, firmaRep: v }))}
          />
        </Grid>
      </Grid>
    </Seccion>
  );
}

// ── Pestaña: Apariencia ────────────────────────────────────────────────────────
function TabApariencia({ form, setForm }) {
  const [preview, setPreview] = useState({ cp: form.colorPrimario, cs: form.colorSidebar });

  const cambiarPrimario = (v) => {
    setPreview(p => ({ ...p, cp: v }));
    setForm(p => ({ ...p, colorPrimario: v }));
    document.documentElement.style.setProperty('--color-primario', v);
  };
  const cambiarSidebar = (v) => {
    setPreview(p => ({ ...p, cs: v }));
    setForm(p => ({ ...p, colorSidebar: v }));
    document.documentElement.style.setProperty('--color-sidebar', v);
  };

  return (
    <Box>
      <Seccion titulo="Colores del sistema">
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <ColorPicker
              label="Color primario (botones, encabezados, links)"
              value={form.colorPrimario}
              onChange={cambiarPrimario}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <ColorPicker
              label="Color sidebar (barra lateral)"
              value={form.colorSidebar}
              onChange={cambiarSidebar}
            />
          </Grid>
        </Grid>
      </Seccion>

      <Box mt={3}>
        <Seccion titulo="Vista previa">
          <Box display="flex" gap={2} flexWrap="wrap">
            {/* Sidebar mini */}
            <Box sx={{
              width: 160, borderRadius: 2, overflow: 'hidden',
              border: '1px solid', borderColor: 'divider', flexShrink: 0,
            }}>
              <Box sx={{ bgcolor: preview.cs, p: 1.5 }}>
                <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '0.7rem' }}>
                  Fundación
                </Typography>
                <Typography sx={{ color: '#B4E8E8', fontWeight: 700, fontSize: '0.62rem' }}>
                  Panorama de Colores
                </Typography>
              </Box>
              {['Dashboard', 'Beneficiarios', 'Configuración'].map((item, i) => (
                <Box key={item} sx={{
                  px: 1.5, py: 0.8, bgcolor: i === 2 ? `${preview.cs}` : preview.cs,
                  borderLeft: i === 2 ? `3px solid #B4E8E8` : '3px solid transparent',
                  opacity: i === 2 ? 1 : 0.7,
                }}>
                  <Typography sx={{ color: i === 2 ? '#B4E8E8' : '#fff', fontSize: '0.68rem' }}>
                    {item}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Botones y encabezados */}
            <Box flex={1} minWidth={200}>
              <Box sx={{
                bgcolor: preview.cp, borderRadius: '8px 8px 0 0',
                px: 2, py: 1, mb: 0,
              }}>
                <Typography variant="caption" fontWeight={800} color="white"
                  sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                  Encabezado de sección
                </Typography>
              </Box>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderTop: 'none',
                         borderRadius: '0 0 8px 8px', p: 2 }}>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Así se verán los encabezados de tabla y secciones.
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Box sx={{
                    bgcolor: preview.cp, color: '#fff',
                    px: 2, py: 0.8, borderRadius: 2, fontSize: '0.82rem', fontWeight: 600,
                  }}>
                    Guardar
                  </Box>
                  <Box sx={{
                    border: `1.5px solid ${preview.cp}`, color: preview.cp,
                    px: 2, py: 0.8, borderRadius: 2, fontSize: '0.82rem', fontWeight: 600,
                  }}>
                    Cancelar
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Seccion>
      </Box>

      <Alert severity="info" sx={{ mt: 2 }} icon={false}>
        Los cambios de color se aplican <strong>en tiempo real</strong> mientras editas. Recuerda
        guardar para que persistan.
      </Alert>
    </Box>
  );
}

// ── Pestaña: Textos ────────────────────────────────────────────────────────────
function TabTextos({ form, set }) {
  return (
    <Box>
      <Seccion titulo="Identidad y contacto">
        <Grid container spacing={2.5}>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Tagline / Slogan"
              placeholder="Ej: Transformando vidas a través de la educación y el arte"
              value={form.tagline} onChange={set('tagline')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Correo de contacto"
              type="email" placeholder="contacto@fundacion.org"
              value={form.emailContacto} onChange={set('emailContacto')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Sitio web"
              placeholder="https://fundacionpanoramadecolores.org"
              value={form.sitioWeb} onChange={set('sitioWeb')} />
          </Grid>
        </Grid>
      </Seccion>

      <Box mt={3}>
        <Seccion titulo="Misión y Visión">
          <Grid container spacing={2.5}>
            <Grid size={12}>
              <TextField fullWidth size="small" multiline minRows={3} label="Misión"
                placeholder="Describe la misión de la fundación…"
                value={form.mision} onChange={set('mision')} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth size="small" multiline minRows={3} label="Visión"
                placeholder="Describe la visión de la fundación…"
                value={form.vision} onChange={set('vision')} />
            </Grid>
          </Grid>
        </Seccion>
      </Box>

      <Box mt={3}>
        <Seccion titulo="Textos de la aplicación">
          <Grid container spacing={2.5}>
            <Grid size={12}>
              <TextField fullWidth size="small" multiline minRows={2}
                label="Mensaje de bienvenida (panel administrativo)"
                placeholder="Bienvenido al panel de gestión de la Fundación Panorama de Colores…"
                value={form.mensajeBienvenida} onChange={set('mensajeBienvenida')} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth size="small" label="Texto del pie de página (footer)"
                placeholder="© 2025 Fundación Panorama de Colores. Todos los derechos reservados."
                value={form.footerTexto} onChange={set('footerTexto')} />
            </Grid>
          </Grid>
        </Seccion>
      </Box>
    </Box>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function ConfiguracionPage() {
  const { actualizarConfig } = useConfiguracion();
  const [form,      setForm]      = useState(VACIO);
  const [tab,       setTab]       = useState(0);
  const [cargando,  setCargando]  = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');
  const [toast,     setToast]     = useState('');

  useEffect(() => {
    configuracionRepository.obtener()
      .then(({ data }) => {
        setForm({
          nombreFundacion:   data.nombreFundacion   ?? '',
          nit:               data.nit               ?? '',
          direccion:         data.direccion         ?? '',
          telefono:          data.telefono          ?? '',
          nombreRepLegal:    data.nombreRepLegal     ?? '',
          tipoDocRep:        data.tipoDocRep         ?? 'CC',
          documentoRep:      data.documentoRep       ?? '',
          cargoRep:          data.cargoRep           ?? '',
          firmaRep:          data.firmaRep           ?? '',
          colorPrimario:     data.colorPrimario      || '#4E1B95',
          colorSidebar:      data.colorSidebar       || '#150830',
          tagline:           data.tagline            ?? '',
          mision:            data.mision             ?? '',
          vision:            data.vision             ?? '',
          emailContacto:     data.emailContacto      ?? '',
          sitioWeb:          data.sitioWeb           ?? '',
          mensajeBienvenida: data.mensajeBienvenida  ?? '',
          footerTexto:       data.footerTexto        ?? '',
        });
      })
      .catch(() => setError('No se pudo cargar la configuración.'))
      .finally(() => setCargando(false));
  }, []);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleGuardar = async () => {
    setGuardando(true);
    setError('');
    try {
      const { data } = await configuracionRepository.guardar({
        nombreFundacion:   form.nombreFundacion   || null,
        nit:               form.nit               || null,
        direccion:         form.direccion         || null,
        telefono:          form.telefono          || null,
        nombreRepLegal:    form.nombreRepLegal     || null,
        tipoDocRep:        form.tipoDocRep         || null,
        documentoRep:      form.documentoRep       || null,
        cargoRep:          form.cargoRep           || null,
        firmaRep:          form.firmaRep           || null,
        colorPrimario:     form.colorPrimario      || null,
        colorSidebar:      form.colorSidebar       || null,
        tagline:           form.tagline            || null,
        mision:            form.mision             || null,
        vision:            form.vision             || null,
        emailContacto:     form.emailContacto      || null,
        sitioWeb:          form.sitioWeb           || null,
        mensajeBienvenida: form.mensajeBienvenida  || null,
        footerTexto:       form.footerTexto        || null,
      });
      actualizarConfig(data);
      setToast('Configuración guardada correctamente');
    } catch {
      setError('No se pudo guardar la configuración.');
    } finally {
      setGuardando(false);
    }
  };

  const TABS = ['Fundación', 'Representante Legal', 'Apariencia', 'Textos'];

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 800, mx: 'auto' }}>

      <Box sx={{ mb: 3 }}>
        <Typography sx={{
          fontSize: '0.68rem', color: 'text.secondary',
          textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.5,
        }}>
          Módulo
        </Typography>
        <Typography variant="h5" fontWeight={800} sx={{ color: COLOR }}>Configuración</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Gestiona los datos, apariencia y textos de la aplicación.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {cargando ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress sx={{ color: COLOR }} />
        </Box>
      ) : (
        <Box>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.9rem' },
                '& .Mui-selected': { color: COLOR },
                '& .MuiTabs-indicator': { backgroundColor: COLOR },
              }}
            >
              {TABS.map((t, i) => <Tab key={i} label={t} />)}
            </Tabs>
          </Box>

          {tab === 0 && <TabFundacion   form={form} set={set} />}
          {tab === 1 && <TabRepLegal    form={form} set={set} setForm={setForm} />}
          {tab === 2 && <TabApariencia  form={form} setForm={setForm} />}
          {tab === 3 && <TabTextos      form={form} set={set} />}

          <Divider sx={{ my: 3 }} />

          <Box display="flex" justifyContent="flex-end">
            <Button variant="contained" startIcon={<SaveIcon />}
              onClick={handleGuardar} disabled={guardando}
              sx={{ bgcolor: COLOR, px: 3, '&:hover': { bgcolor: COLOR, opacity: 0.9 } }}>
              {guardando ? 'Guardando…' : 'Guardar configuración'}
            </Button>
          </Box>
        </Box>
      )}

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}
