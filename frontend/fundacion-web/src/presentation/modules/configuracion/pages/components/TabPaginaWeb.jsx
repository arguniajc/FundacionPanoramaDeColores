import {
  Accordion, AccordionDetails, AccordionSummary,
  Alert, Box, FormControl, FormControlLabel, Grid,
  InputLabel, MenuItem, Select, Switch, TextField, Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Seccion }    from './Seccion';
import { ImagenField } from './ImagenField';
import { COLOR, FA_ICONOS } from './helpers';

export function TabPaginaWeb({ webForm, setWebForm }) {
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

      {/* Slider */}
      <Seccion titulo="Slider de inicio">
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
                <Grid size={12}><ImagenField label="Imagen de fondo (URL)" value={slide.imagen} onChange={setSlide(i, 'imagen')} /></Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
      </Seccion>

      {/* Quiénes Somos */}
      <Box mt={2}><Seccion titulo="Quiénes Somos">
        <Grid container spacing={2.5}>
          <Grid size={12}><ImagenField label="Imagen sección (URL)" value={webForm.quienesSomos.imagen} onChange={(e) => setWebForm(p => ({ ...p, quienesSomos: { ...p.quienesSomos, imagen: e.target.value } }))} /></Grid>
          <Grid size={12}><TextField fullWidth size="small" multiline minRows={3} label="Misión" value={webForm.quienesSomos.mision} onChange={setQS('mision')} /></Grid>
          <Grid size={12}><TextField fullWidth size="small" multiline minRows={3} label="Visión" value={webForm.quienesSomos.vision} onChange={setQS('vision')} /></Grid>
          <Grid size={12}><TextField fullWidth size="small" multiline minRows={3} label="Historia" value={webForm.quienesSomos.historia} onChange={setQS('historia')} /></Grid>
        </Grid>
      </Seccion></Box>

      {/* Qué Hacemos */}
      <Box mt={2}><Seccion titulo="Qué Hacemos — Programas">
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
                      {FA_ICONOS.map(ic => <MenuItem key={ic} value={ic}><i className={`fas ${ic}`} style={{ marginRight: 8 }} />{ic.replace('fa-', '')}</MenuItem>)}
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

      {/* Impacto */}
      <Box mt={2}><Seccion titulo="Nuestro Impacto">
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

      {/* Galería */}
      <Box mt={2}><Seccion titulo="Galería de Eventos">
        <Grid container spacing={2}>
          {webForm.galeria.map((item, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6 }}>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>Foto {i + 1}</Typography>
                <Box mt={1} display="flex" gap={1} flexDirection="column">
                  <ImagenField label="URL de la imagen" value={item.imagen} onChange={setGal(i, 'imagen')} />
                  <TextField fullWidth size="small" label="Descripción / título de foto" value={item.titulo} onChange={setGal(i, 'titulo')} />
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Seccion></Box>

      {/* Cómo Ayudar */}
      <Box mt={2}><Seccion titulo="¿Cómo Ayudar?">
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="WhatsApp para donaciones (solo números)" value={webForm.donaciones.whatsapp} onChange={setDon('whatsapp')} placeholder="573226012056" /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Email para donaciones" value={webForm.donaciones.email} onChange={setDon('email')} /></Grid>
          <Grid size={12}><TextField fullWidth size="small" multiline minRows={2} label="Texto — Voluntariado" value={webForm.donaciones.textoVoluntariado} onChange={setDon('textoVoluntariado')} /></Grid>
          <Grid size={12}><TextField fullWidth size="small" multiline minRows={2} label="Texto — Donaciones en especie" value={webForm.donaciones.textoEspecie} onChange={setDon('textoEspecie')} /></Grid>
          <Grid size={12}><TextField fullWidth size="small" multiline minRows={2} label="Texto — Donaciones monetarias" value={webForm.donaciones.textoMonetario} onChange={setDon('textoMonetario')} /></Grid>
        </Grid>
      </Seccion></Box>

      {/* Contacto */}
      <Box mt={2}><Seccion titulo="Contacto">
        <Grid container spacing={2.5}>
          <Grid size={12}><TextField fullWidth size="small" label="Dirección" value={webForm.contacto.direccion} onChange={setCon('direccion')} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Teléfono" value={webForm.contacto.telefono} onChange={setCon('telefono')} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Email" value={webForm.contacto.email} onChange={setCon('email')} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label="URL Instagram" value={webForm.contacto.instagram} onChange={setCon('instagram')} placeholder="https://instagram.com/..." /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label="URL TikTok" value={webForm.contacto.tiktok} onChange={setCon('tiktok')} placeholder="https://tiktok.com/..." /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label="WhatsApp (solo números)" value={webForm.contacto.whatsapp} onChange={setCon('whatsapp')} placeholder="573226012056" /></Grid>
        </Grid>
      </Seccion></Box>

      {/* Footer */}
      <Box mt={2}><Seccion titulo="Footer">
        <Grid container spacing={2.5}>
          <Grid size={12}><TextField fullWidth size="small" label="Nombre en el pie de página" value={webForm.footer.nombre} onChange={setFoo('nombre')} /></Grid>
          <Grid size={12}><TextField fullWidth size="small" label="Eslogan del footer" value={webForm.footer.eslogan} onChange={setFoo('eslogan')} /></Grid>
          <Grid size={12}><TextField fullWidth size="small" label="Texto de derechos reservados" value={webForm.footer.copyright} onChange={setFoo('copyright')} /></Grid>
        </Grid>
      </Seccion></Box>
    </Box>
  );
}
