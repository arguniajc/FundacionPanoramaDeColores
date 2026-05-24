import { useState, useEffect } from 'react';
import {
  Alert, Box, Button, CircularProgress, Divider,
  Snackbar, Tab, Tabs, Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { configuracionRepository } from '../../../../infrastructure/repositories/configuracionRepository';
import { useConfiguracion }        from '../../../../shared/context/ConfiguracionContext';
import { COLOR, DEFAULT_WEB, VACIO_FORM, mergeDeep } from './components/helpers';
import { TabFundacion }   from './components/TabFundacion';
import { TabRepLegal }    from './components/TabRepLegal';
import { TabApariencia }  from './components/TabApariencia';
import { TabTextos }      from './components/TabTextos';
import { TabPaginaWeb }   from './components/TabPaginaWeb';
import { TabSmtp }        from './components/TabSmtp';

export default function ConfiguracionPage() {
  const { actualizarConfig } = useConfiguracion();
  const [form,       setForm]      = useState(VACIO_FORM);
  const [formPrev,   setFormPrev]  = useState(VACIO_FORM);
  const [webForm,    setWebForm]   = useState(DEFAULT_WEB);
  const [tab,        setTab]       = useState(0);
  const [cargando,   setCargando]  = useState(true);
  const [guardando,  setGuardando] = useState(false);
  const [error,      setError]     = useState('');
  const [toast,      setToast]     = useState('');
  const [avisoRep,   setAvisoRep]  = useState(false);

  useEffect(() => {
    configuracionRepository.obtener()
      .then(({ data }) => {
        const loaded = {
          nombreFundacion:   data.nombreFundacion   ?? '',
          nit:               data.nit               ?? '',
          direccion:         data.direccion         ?? '',
          telefono:          data.telefono          ?? '',
          nombreRepLegal:    data.nombreRepLegal     ?? '',
          tipoDocRep:        data.tipoDocRep         ?? 'CC',
          documentoRep:      data.documentoRep       ?? '',
          cargoRep:          data.cargoRep           ?? '',
          firmaRep:          data.firmaRep           ?? '',
          colorPrimario:      data.colorPrimario      || '#4E1B95',
          colorSidebar:       data.colorSidebar       || '#150830',
          colorSecundario:    data.colorSecundario    || '#2D984F',
          colorGradiente:     data.colorGradiente     || '#3a1470',
          colorOscuroFondo:   data.colorOscuroFondo   || '#0f0f0f',
          colorOscuroPaper:   data.colorOscuroPaper   || '#1c1c1c',
          colorOscuroSidebar: data.colorOscuroSidebar || '#0d1117',
          tagline:           data.tagline            ?? '',
          mision:            data.mision             ?? '',
          vision:            data.vision             ?? '',
          emailContacto:     data.emailContacto      ?? '',
          sitioWeb:          data.sitioWeb           ?? '',
          mensajeBienvenida: data.mensajeBienvenida  ?? '',
          footerTexto:       data.footerTexto        ?? '',
          webContenido:      data.webContenido       ?? '',
          // SMTP
          smtpHost:          data.smtpHost           ?? '',
          smtpPuerto:        data.smtpPuerto         ?? 587,
          smtpUsuario:       data.smtpUsuario        ?? '',
          smtpClave:         '',                          // nunca se precarga la clave
          smtpClaveGuardada: data.smtpClaveGuardada  ?? false,
          smtpDeNombre:      data.smtpDeNombre       ?? '',
          smtpDeEmail:       data.smtpDeEmail        ?? '',
          smtpSsl:           data.smtpSsl            ?? true,
        };
        setForm(loaded);
        setFormPrev(loaded);
        if (data.webContenido) {
          try {
            setWebForm(mergeDeep(DEFAULT_WEB, JSON.parse(data.webContenido)));
          } catch { /* usar defaults */ }
        }
      })
      .catch(() => setError('No se pudo cargar la configuración.'))
      .finally(() => setCargando(false));
  }, []);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const repCambiado = tab === 1 && (
    form.nombreRepLegal !== formPrev.nombreRepLegal ||
    form.documentoRep   !== formPrev.documentoRep   ||
    form.cargoRep       !== formPrev.cargoRep        ||
    form.firmaRep       !== formPrev.firmaRep
  );

  const handleGuardar = async () => {
    setGuardando(true); setError('');
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
        colorPrimario:      form.colorPrimario      || null,
        colorSidebar:       form.colorSidebar       || null,
        colorSecundario:    form.colorSecundario    || null,
        colorGradiente:     form.colorGradiente     || null,
        colorOscuroFondo:   form.colorOscuroFondo   || null,
        colorOscuroPaper:   form.colorOscuroPaper   || null,
        colorOscuroSidebar: form.colorOscuroSidebar || null,
        tagline:           form.tagline            || null,
        mision:            form.mision             || null,
        vision:            form.vision             || null,
        emailContacto:     form.emailContacto      || null,
        sitioWeb:          form.sitioWeb           || null,
        mensajeBienvenida: form.mensajeBienvenida  || null,
        footerTexto:       form.footerTexto        || null,
        webContenido:      JSON.stringify(webForm),
        // SMTP
        smtpHost:      form.smtpHost      || null,
        smtpPuerto:    form.smtpPuerto    ? Number(form.smtpPuerto) : null,
        smtpUsuario:   form.smtpUsuario   || null,
        smtpClave:     form.smtpClave     || null,   // vacío = no cambiar
        smtpDeNombre:  form.smtpDeNombre  || null,
        smtpDeEmail:   form.smtpDeEmail   || null,
        smtpSsl:       form.smtpSsl       ?? true,
      });
      actualizarConfig(data);
      setFormPrev({ ...form });
      if (repCambiado) setAvisoRep(true);
      setToast('Configuración guardada correctamente');
    } catch {
      setError('No se pudo guardar la configuración.');
    } finally {
      setGuardando(false);
    }
  };

  const TABS = ['Fundación', 'Representante Legal', 'Apariencia', 'Textos admin', 'Página Web', 'Correo'];

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

      {avisoRep && (
        <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setAvisoRep(false)}>
          <strong>Datos del representante legal actualizados.</strong> Para que la nueva firma aparezca en las inscripciones, ve a <strong>Programas</strong> y haz clic en "Autorizar representante" en cada programa. Los programas ya autorizados conservan la firma anterior hasta que los re-autorices.
        </Alert>
      )}

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

          {tab === 0 && <TabFundacion   form={form} set={set} />}
          {tab === 1 && <TabRepLegal    form={form} set={set} setForm={setForm} />}
          {tab === 2 && <TabApariencia  form={form} setForm={setForm} />}
          {tab === 3 && <TabTextos      form={form} set={set} />}
          {tab === 4 && <TabPaginaWeb   webForm={webForm} setWebForm={setWebForm} />}
          {tab === 5 && <TabSmtp        form={form} set={set} />}

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
