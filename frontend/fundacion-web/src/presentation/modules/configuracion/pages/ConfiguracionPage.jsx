// Configuración: Fundación · Rep. Legal · Apariencia · Textos · Página Web
import { useState, useEffect, useRef } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary,
  Alert, Box, Button, CircularProgress, Divider, FormControl,
  FormControlLabel, Grid, InputLabel, MenuItem, Select,
  Snackbar, Switch, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import SaveIcon         from '@mui/icons-material/Save';
import UploadFileIcon   from '@mui/icons-material/UploadFile';
import PaletteIcon      from '@mui/icons-material/Palette';
import ExpandMoreIcon   from '@mui/icons-material/ExpandMore';
import FirmaPad         from '../../../../shared/components/FirmaPad';
import { configuracionRepository } from '../../../../infrastructure/repositories/configuracionRepository';
import { useConfiguracion }        from '../../../../shared/context/ConfiguracionContext';

const COLOR     = 'var(--color-primario)';
const TIPOS_DOC = ['CC', 'CE', 'PP', 'NIT', 'Otro'];
const FA_ICONOS = [
  'fa-palette','fa-futbol','fa-leaf','fa-users','fa-star','fa-heart',
  'fa-book','fa-music','fa-camera','fa-paint-brush','fa-seedling',
  'fa-child','fa-hands-helping','fa-graduation-cap','fa-running',
];

const DEFAULT_WEB = {
  slider: [
    { titulo: 'Transformando vidas a través del arte', subtitulo: 'Descubre el potencial creativo de niños y niñas del barrio Panorama Comuna 1', cta: 'Conoce nuestros programas', ctaHref: '#que-hacemos', imagen: '' },
    { titulo: 'Deporte para el desarrollo integral',   subtitulo: 'Fomentamos valores y habilidades a través de actividades deportivas',         cta: 'Ver nuestras actividades', ctaHref: '#galeria',     imagen: '' },
    { titulo: 'Conciencia ambiental para un futuro mejor', subtitulo: 'Educamos y actuamos por un entorno más sostenible',                        cta: 'Únete a nuestra causa',    ctaHref: '#donaciones',  imagen: '' },
  ],
  quienesSomos: {
    imagen: 'images/imagen1.jpg',
    mision: 'Transformar vidas de niños, niñas y familias en el barrio Panorama Comuna 1 a través del arte, el deporte y la conciencia ambiental, promoviendo el desarrollo integral y la construcción de un futuro sostenible.',
    vision: 'Ser una fundación líder en la transformación social del barrio Panorama Comuna 1, reconocida por nuestro compromiso con el desarrollo integral de la niñez y la promoción de entornos sostenibles y saludables.',
    historia: 'Fundación Panorama de Colores nació hace más de 2 años como una iniciativa comunitaria para brindar oportunidades a niños y niñas en situación de vulnerabilidad. Desde entonces, hemos crecido y transformado la vida de más de 18 niños y sus familias.',
  },
  programas: [
    { icono: 'fa-palette', titulo: 'Arte y Creatividad',  descripcion: '' },
    { icono: 'fa-futbol',  titulo: 'Deporte y Recreación', descripcion: '' },
    { icono: 'fa-leaf',    titulo: 'Conciencia Ambiental', descripcion: '' },
    { icono: 'fa-users',   titulo: 'Apoyo',                descripcion: '' },
  ],
  impacto: {
    visible: false,
    titulo: 'NUESTRO IMPACTO EN EL BARRIO PANORAMA',
    items: [
      { numero: 20, label: 'Niñas y niños formados en nuestros programas' },
      { numero: 20, label: 'Familias beneficiadas' },
      { numero: 1,  label: 'Año trabajando por la niñez del barrio Panorama de Yumbo Valle' },
      { numero: 15, label: 'Talleres realizados' },
    ],
  },
  galeria: [
    { imagen: 'images/imagen2.jpg', titulo: 'Taller de arte infantil' },
    { imagen: 'images/imagen3.jpg', titulo: 'Actividad deportiva con niños' },
    { imagen: 'images/imagen4.jpg', titulo: 'Taller de conciencia ambiental' },
    { imagen: 'images/imagen5.jpg', titulo: 'Niños mostrando sus creaciones' },
    { imagen: 'images/imagen6.jpg', titulo: 'Familia participando en actividades' },
    { imagen: 'images/imagen7.jpg', titulo: 'Evento comunitario de la fundación' },
  ],
  donaciones: {
    whatsapp: '573226012056',
    email: 'Panoramadecolores@gmail.com',
    textoVoluntariado: 'Únete como voluntario y comparte tus habilidades con nuestra comunidad.',
    textoEspecie: 'Materiales de arte, deportivos o recursos para nuestros talleres.',
    textoMonetario: 'Si deseas realizar una donación monetaria y recibir la información necesaria, puedes escribirnos por WhatsApp o correo. Con tu aporte seguimos ampliando nuestro impacto',
  },
  contacto: {
    direccion: 'Carrera 7F 16H-10 Barrio Panorama Comuna 1- Yumbo Valle del Cauca, Colombia',
    telefono: '+57 322 602 2056',
    email: 'Panoramadecolores@gmail.com',
    instagram: 'https://www.instagram.com/fundacionpanoramadecolores/',
    tiktok: 'https://www.tiktok.com/@fundapanoramadecolores',
    whatsapp: '573226012056',
  },
  footer: {
    nombre: 'FUNDACIÓN PANORAMA DE COLORES',
    eslogan: 'Transformamos vidas a través del arte, el deporte y la conciencia ambiental.',
    copyright: '© 2025 Fundación Panorama de Colores. Todos los derechos reservados.',
  },
};

const VACIO_FORM = {
  nombreFundacion: '', nit: '', direccion: '', telefono: '',
  nombreRepLegal: '', tipoDocRep: 'CC', documentoRep: '', cargoRep: '', firmaRep: '',
  colorPrimario: '#4E1B95', colorSidebar: '#150830',
  tagline: '', mision: '', vision: '',
  emailContacto: '', sitioWeb: '', mensajeBienvenida: '', footerTexto: '',
  webContenido: '',
};

// ── Helpers ─────────────────────────────────────────────────────────────────────
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
      const ratio = Math.min(1, maxW / img.naturalWidth);
      const w = Math.round(img.naturalWidth * ratio);
      const h = Math.round(img.naturalHeight * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
function mergeDeep(defaults, overrides) {
  if (!overrides) return defaults;
  const result = { ...defaults };
  for (const key of Object.keys(overrides)) {
    const d = defaults[key];
    const o = overrides[key];
    if (Array.isArray(o))           result[key] = o;
    else if (o && typeof o === 'object') result[key] = mergeDeep(d || {}, o);
    else if (o !== undefined)       result[key] = o;
  }
  return result;
}

// ── Sección con cabecera de color ────────────────────────────────────────────
function Seccion({ titulo, children }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ bgcolor: COLOR, borderRadius: '8px 8px 0 0', px: 2, py: 1 }}>
        <Typography variant="caption" fontWeight={800} color="white"
          sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>{titulo}</Typography>
      </Box>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderTop: 'none',
                 borderRadius: '0 0 8px 8px', p: 3 }}>
        {children}
      </Box>
    </Box>
  );
}

// ── Firma del Representante ──────────────────────────────────────────────────
function FirmaRepresentante({ value, onChange }) {
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errImg,   setErrImg]   = useState('');
  const handleSubir = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!file.type.startsWith('image/')) { setErrImg('El archivo debe ser una imagen'); return; }
    if (file.size > 5 * 1024 * 1024)    { setErrImg('La imagen no puede superar 5 MB'); return; }
    setErrImg(''); setSubiendo(true);
    try {
      const raw      = await leerArchivoComoDataUrl(file);
      const reducida = await redimensionarImagen(raw, 600);
      onChange(reducida);
    } catch { setErrImg('No se pudo procesar la imagen.'); }
    finally   { setSubiendo(false); }
  };
  return (
    <Box>
      <FirmaPad label="Firma del representante legal" value={value} onChange={onChange} />
      <Box mt={1} display="flex" alignItems="center" gap={1}>
        <Tooltip title="Sube una foto o escaneo de la firma"><Button size="small" variant="outlined"
          startIcon={<UploadFileIcon />} onClick={() => inputRef.current?.click()} disabled={subiendo}
          sx={{ color: COLOR, borderColor: COLOR, fontSize: '0.75rem' }}>
          {subiendo ? 'Procesando…' : 'Subir imagen de firma'}
        </Button></Tooltip>
        <Typography variant="caption" color="text.secondary">JPG · PNG · máx. 5 MB</Typography>
      </Box>
      {errImg && <Typography variant="caption" color="error" display="block" mt={0.5}>{errImg}</Typography>}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleSubir} />
    </Box>
  );
}

// ── Selector de color ─────────────────────────────────────────────────────────
function ColorPicker({ label, value, onChange }) {
  const ref = useRef(null);
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>{label}</Typography>
      <Box display="flex" alignItems="center" gap={1.5} onClick={() => ref.current?.click()}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.2, cursor: 'pointer' }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: value, border: '2px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
        <Box><Typography variant="body2" fontWeight={600}>{value}</Typography>
          <Typography variant="caption" color="text.secondary">Haz clic para cambiar</Typography>
        </Box>
        <PaletteIcon sx={{ ml: 'auto', color: 'text.secondary', fontSize: 18 }} />
      </Box>
      <input ref={ref} type="color" value={value} onChange={(e) => onChange(e.target.value)}
        style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }} />
    </Box>
  );
}

// ── Campo con previsualización de imagen ─────────────────────────────────────
function ImagenUrlField({ label, value, onChange, placeholder }) {
  return (
    <Box>
      <TextField fullWidth size="small" label={label} value={value} onChange={onChange}
        placeholder={placeholder || 'images/imagen1.jpg o https://...'} />
      {value && (
        <Box mt={1} sx={{ borderRadius: 1, overflow: 'hidden', maxWidth: 200, border: '1px solid', borderColor: 'divider' }}>
          <img src={value} alt="preview" style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }}
            onError={(e) => { e.target.style.display = 'none'; }} />
        </Box>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 1: Fundación
// ════════════════════════════════════════════════════════════════════════════
function TabFundacion({ form, set }) {
  return (
    <Seccion titulo="Datos de la Fundación">
      <Grid container spacing={2.5}>
        <Grid size={12}>
          <TextField fullWidth size="small" label="Nombre de la fundación"
            value={form.nombreFundacion} onChange={set('nombreFundacion')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" label="NIT" value={form.nit} onChange={set('nit')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" label="Teléfono" value={form.telefono} onChange={set('telefono')} />
        </Grid>
        <Grid size={12}>
          <TextField fullWidth size="small" label="Dirección" value={form.direccion} onChange={set('direccion')} />
        </Grid>
      </Grid>
    </Seccion>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 2: Representante Legal
// ════════════════════════════════════════════════════════════════════════════
function TabRepLegal({ form, set, setForm }) {
  return (
    <Seccion titulo="Representante Legal">
      <Alert severity="info" sx={{ mb: 2.5 }} icon={false}>
        Al <strong>autorizar un proyecto</strong> desde Proyectos, se toma una copia de estos datos.
        Actualizar aquí no cambia proyectos ya autorizados.
      </Alert>
      <Grid container spacing={2.5}>
        <Grid size={12}>
          <TextField fullWidth size="small" label="Nombre completo" value={form.nombreRepLegal} onChange={set('nombreRepLegal')} />
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
          <TextField fullWidth size="small" label="Número de documento" value={form.documentoRep} onChange={set('documentoRep')} />
        </Grid>
        <Grid size={12}>
          <TextField fullWidth size="small" label="Cargo"
            placeholder="Ej: Directora Ejecutiva, Representante Legal…"
            value={form.cargoRep} onChange={set('cargoRep')} />
        </Grid>
        <Grid size={12}>
          <FirmaRepresentante value={form.firmaRep} onChange={(v) => setForm(p => ({ ...p, firmaRep: v }))} />
        </Grid>
      </Grid>
    </Seccion>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 3: Apariencia
// ════════════════════════════════════════════════════════════════════════════
function TabApariencia({ form, setForm }) {
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

// ════════════════════════════════════════════════════════════════════════════
// TAB 4: Textos del sistema (admin)
// ════════════════════════════════════════════════════════════════════════════
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
            <TextField fullWidth size="small" label="Correo de contacto" type="email"
              placeholder="contacto@fundacion.org" value={form.emailContacto} onChange={set('emailContacto')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Sitio web"
              placeholder="https://fundacionpanoramadecolores.org"
              value={form.sitioWeb} onChange={set('sitioWeb')} />
          </Grid>
        </Grid>
      </Seccion>
      <Box mt={3}>
        <Seccion titulo="Misión y Visión (panel admin)">
          <Grid container spacing={2.5}>
            <Grid size={12}>
              <TextField fullWidth size="small" multiline minRows={3} label="Misión"
                value={form.mision} onChange={set('mision')} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth size="small" multiline minRows={3} label="Visión"
                value={form.vision} onChange={set('vision')} />
            </Grid>
          </Grid>
        </Seccion>
      </Box>
      <Box mt={3}>
        <Seccion titulo="Textos del panel administrativo">
          <Grid container spacing={2.5}>
            <Grid size={12}>
              <TextField fullWidth size="small" multiline minRows={2} label="Mensaje de bienvenida"
                value={form.mensajeBienvenida} onChange={set('mensajeBienvenida')} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth size="small" label="Footer del sistema"
                value={form.footerTexto} onChange={set('footerTexto')} />
            </Grid>
          </Grid>
        </Seccion>
      </Box>
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 5: Página Web pública
// ════════════════════════════════════════════════════════════════════════════
function TabPaginaWeb({ webForm, setWebForm }) {
  const setSlide = (i, k) => (e) => setWebForm(p => {
    const arr = [...p.slider]; arr[i] = { ...arr[i], [k]: e.target.value };
    return { ...p, slider: arr };
  });
  const setQS = (k) => (e) => setWebForm(p => ({ ...p, quienesSomos: { ...p.quienesSomos, [k]: e.target.value } }));
  const setProg = (i, k) => (e) => setWebForm(p => {
    const arr = [...p.programas]; arr[i] = { ...arr[i], [k]: e.target.value };
    return { ...p, programas: arr };
  });
  const setImpItem = (i, k) => (e) => setWebForm(p => {
    const arr = [...p.impacto.items]; arr[i] = { ...arr[i], [k]: e.target.value };
    return { ...p, impacto: { ...p.impacto, items: arr } };
  });
  const setGal = (i, k) => (e) => setWebForm(p => {
    const arr = [...p.galeria]; arr[i] = { ...arr[i], [k]: e.target.value };
    return { ...p, galeria: arr };
  });
  const setDon = (k) => (e) => setWebForm(p => ({ ...p, donaciones: { ...p.donaciones, [k]: e.target.value } }));
  const setCon = (k) => (e) => setWebForm(p => ({ ...p, contacto: { ...p.contacto, [k]: e.target.value } }));
  const setFoo = (k) => (e) => setWebForm(p => ({ ...p, footer: { ...p.footer, [k]: e.target.value } }));

  return (
    <Box>
      <Alert severity="info" icon={false} sx={{ mb: 3 }}>
        Todo lo que edites aquí aparecerá automáticamente en <strong>fundacionpanoramadecolores.org</strong> al guardar.
      </Alert>

      {/* ── Slider ── */}
      <Seccion titulo="🎠 Slider de inicio">
        {webForm.slider.map((slide, i) => (
          <Accordion key={i} disableGutters sx={{ mb: 1, border: '1px solid', borderColor: 'divider', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={600} fontSize="0.88rem">Slide {i + 1} — {slide.titulo.slice(0, 45)}{slide.titulo.length > 45 ? '…' : ''}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={12}><TextField fullWidth size="small" label="Título principal" value={slide.titulo} onChange={setSlide(i, 'titulo')} /></Grid>
                <Grid size={12}><TextField fullWidth size="small" label="Subtítulo / descripción" value={slide.subtitulo} onChange={setSlide(i, 'subtitulo')} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Texto del botón CTA" value={slide.cta} onChange={setSlide(i, 'cta')} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Enlace del botón (href)" value={slide.ctaHref} onChange={setSlide(i, 'ctaHref')} placeholder="#que-hacemos" /></Grid>
                <Grid size={12}><ImagenUrlField label="Imagen de fondo (URL)" value={slide.imagen} onChange={setSlide(i, 'imagen')} /></Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
      </Seccion>

      {/* ── Quiénes Somos ── */}
      <Box mt={2}><Seccion titulo="👥 Quiénes Somos">
        <Grid container spacing={2.5}>
          <Grid size={12}><ImagenUrlField label="Imagen sección (URL)" value={webForm.quienesSomos.imagen} onChange={(e) => setWebForm(p => ({ ...p, quienesSomos: { ...p.quienesSomos, imagen: e.target.value } }))} /></Grid>
          <Grid size={12}><TextField fullWidth size="small" multiline minRows={3} label="Misión" value={webForm.quienesSomos.mision} onChange={setQS('mision')} /></Grid>
          <Grid size={12}><TextField fullWidth size="small" multiline minRows={3} label="Visión" value={webForm.quienesSomos.vision} onChange={setQS('vision')} /></Grid>
          <Grid size={12}><TextField fullWidth size="small" multiline minRows={3} label="Historia" value={webForm.quienesSomos.historia} onChange={setQS('historia')} /></Grid>
        </Grid>
      </Seccion></Box>

      {/* ── Qué Hacemos ── */}
      <Box mt={2}><Seccion titulo="🎯 Qué Hacemos — Programas">
        {webForm.programas.map((prog, i) => (
          <Accordion key={i} disableGutters sx={{ mb: 1, border: '1px solid', borderColor: 'divider', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={600} fontSize="0.88rem">{prog.titulo || `Programa ${i + 1}`}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Ícono (Font Awesome)</InputLabel>
                    <Select label="Ícono (Font Awesome)" value={prog.icono} onChange={setProg(i, 'icono')}>
                      {FA_ICONOS.map(ic => <MenuItem key={ic} value={ic}><i className={`fas ${ic}`} style={{ marginRight: 8 }} />{ic.replace('fa-','')}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 8 }}><TextField fullWidth size="small" label="Título" value={prog.titulo} onChange={setProg(i, 'titulo')} /></Grid>
                <Grid size={12}><TextField fullWidth size="small" multiline minRows={2} label="Descripción" value={prog.descripcion} onChange={setProg(i, 'descripcion')} /></Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
      </Seccion></Box>

      {/* ── Impacto ── */}
      <Box mt={2}><Seccion titulo="📊 Nuestro Impacto">
        <Box mb={2}>
          <FormControlLabel label="Mostrar sección de impacto en la página pública"
            control={<Switch checked={webForm.impacto.visible}
              onChange={(e) => setWebForm(p => ({ ...p, impacto: { ...p.impacto, visible: e.target.checked } }))}
              sx={{ '& .MuiSwitch-thumb': { bgcolor: COLOR }, '& .Mui-checked+.MuiSwitch-track': { bgcolor: COLOR } }} />} />
        </Box>
        <TextField fullWidth size="small" label="Título de la sección" value={webForm.impacto.titulo}
          onChange={(e) => setWebForm(p => ({ ...p, impacto: { ...p.impacto, titulo: e.target.value } }))} sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {webForm.impacto.items.map((item, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6 }}>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                <Typography variant="caption" color="text.secondary">Dato {i + 1}</Typography>
                <Grid container spacing={1} mt={0.5}>
                  <Grid size={4}><TextField fullWidth size="small" label="Número" type="number" value={item.numero} onChange={setImpItem(i, 'numero')} /></Grid>
                  <Grid size={8}><TextField fullWidth size="small" label="Descripción" value={item.label} onChange={setImpItem(i, 'label')} /></Grid>
                </Grid>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Seccion></Box>

      {/* ── Galería ── */}
      <Box mt={2}><Seccion titulo="🖼️ Galería de Eventos">
        <Grid container spacing={2}>
          {webForm.galeria.map((item, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6 }}>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>Foto {i + 1}</Typography>
                <Box mt={1} display="flex" gap={1} flexDirection="column">
                  <ImagenUrlField label="URL de la imagen" value={item.imagen} onChange={setGal(i, 'imagen')} />
                  <TextField fullWidth size="small" label="Descripción / título de foto" value={item.titulo} onChange={setGal(i, 'titulo')} />
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Seccion></Box>

      {/* ── Cómo Ayudar ── */}
      <Box mt={2}><Seccion titulo="❤️ ¿Cómo Ayudar?">
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="WhatsApp para donaciones (solo números)" value={webForm.donaciones.whatsapp} onChange={setDon('whatsapp')} placeholder="573226012056" /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Email para donaciones" value={webForm.donaciones.email} onChange={setDon('email')} /></Grid>
          <Grid size={12}><TextField fullWidth size="small" multiline minRows={2} label="Texto — Voluntariado" value={webForm.donaciones.textoVoluntariado} onChange={setDon('textoVoluntariado')} /></Grid>
          <Grid size={12}><TextField fullWidth size="small" multiline minRows={2} label="Texto — Donaciones en especie" value={webForm.donaciones.textoEspecie} onChange={setDon('textoEspecie')} /></Grid>
          <Grid size={12}><TextField fullWidth size="small" multiline minRows={2} label="Texto — Donaciones monetarias" value={webForm.donaciones.textoMonetario} onChange={setDon('textoMonetario')} /></Grid>
        </Grid>
      </Seccion></Box>

      {/* ── Contacto ── */}
      <Box mt={2}><Seccion titulo="📞 Contacto">
        <Grid container spacing={2.5}>
          <Grid size={12}><TextField fullWidth size="small" label="Dirección" value={webForm.contacto.direccion} onChange={setCon('direccion')} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Teléfono" value={webForm.contacto.telefono} onChange={setCon('telefono')} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Email" value={webForm.contacto.email} onChange={setCon('email')} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label="URL Instagram" value={webForm.contacto.instagram} onChange={setCon('instagram')} placeholder="https://instagram.com/..." /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label="URL TikTok" value={webForm.contacto.tiktok} onChange={setCon('tiktok')} placeholder="https://tiktok.com/..." /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label="WhatsApp (solo números)" value={webForm.contacto.whatsapp} onChange={setCon('whatsapp')} placeholder="573226012056" /></Grid>
        </Grid>
      </Seccion></Box>

      {/* ── Footer ── */}
      <Box mt={2}><Seccion titulo="🔚 Footer">
        <Grid container spacing={2.5}>
          <Grid size={12}><TextField fullWidth size="small" label="Nombre en el pie de página" value={webForm.footer.nombre} onChange={setFoo('nombre')} /></Grid>
          <Grid size={12}><TextField fullWidth size="small" label="Eslogan del footer" value={webForm.footer.eslogan} onChange={setFoo('eslogan')} /></Grid>
          <Grid size={12}><TextField fullWidth size="small" label="Texto de derechos reservados" value={webForm.footer.copyright} onChange={setFoo('copyright')} /></Grid>
        </Grid>
      </Seccion></Box>
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export default function ConfiguracionPage() {
  const { actualizarConfig } = useConfiguracion();
  const [form,      setForm]     = useState(VACIO_FORM);
  const [webForm,   setWebForm]  = useState(DEFAULT_WEB);
  const [tab,       setTab]      = useState(0);
  const [cargando,  setCargando] = useState(true);
  const [guardando, setGuardando]= useState(false);
  const [error,     setError]    = useState('');
  const [toast,     setToast]    = useState('');

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
          webContenido:      data.webContenido       ?? '',
        });
        if (data.webContenido) {
          try {
            const parsed = JSON.parse(data.webContenido);
            setWebForm(mergeDeep(DEFAULT_WEB, parsed));
          } catch { /* usar defaults */ }
        }
      })
      .catch(() => setError('No se pudo cargar la configuración.'))
      .finally(() => setCargando(false));
  }, []);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleGuardar = async () => {
    setGuardando(true); setError('');
    try {
      const webContenidoJson = JSON.stringify(webForm);
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
        webContenido:      webContenidoJson,
      });
      actualizarConfig(data);
      setToast('Configuración guardada correctamente');
    } catch {
      setError('No se pudo guardar la configuración.');
    } finally {
      setGuardando(false);
    }
  };

  const TABS = ['Fundación', 'Representante Legal', 'Apariencia', 'Textos admin', 'Página Web'];

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 860, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.5 }}>
          Módulo
        </Typography>
        <Typography variant="h5" fontWeight={800} sx={{ color: COLOR }}>Configuración</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Gestiona datos, apariencia, textos y todo el contenido de la página pública.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {cargando ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress sx={{ color: COLOR }} /></Box>
      ) : (
        <Box>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
              sx={{ '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.88rem' },
                    '& .Mui-selected': { color: COLOR }, '& .MuiTabs-indicator': { backgroundColor: COLOR } }}>
              {TABS.map((t, i) => <Tab key={i} label={t} />)}
            </Tabs>
          </Box>

          {tab === 0 && <TabFundacion    form={form} set={set} />}
          {tab === 1 && <TabRepLegal     form={form} set={set} setForm={setForm} />}
          {tab === 2 && <TabApariencia   form={form} setForm={setForm} />}
          {tab === 3 && <TabTextos       form={form} set={set} />}
          {tab === 4 && <TabPaginaWeb    webForm={webForm} setWebForm={setWebForm} />}

          <Divider sx={{ my: 3 }} />
          <Box display="flex" justifyContent="flex-end">
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleGuardar} disabled={guardando}
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
