import { useState, useEffect } from 'react';
import {
  Alert, Box, Button, CircularProgress, Divider,
  Snackbar, Tab, Tabs, Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { configuracionRepository } from '@/infrastructure/repositories/configuracionRepository';
import { useConfiguracion } from '@/shared/context/useConfiguracion';
import { COLOR, DEFAULT_WEB, VACIO_FORM, mergeDeep } from './components/helpers';
import { TabFundacion }   from './components/TabFundacion';
import { TabRepLegal }    from './components/TabRepLegal';
import { TabApariencia }  from './components/TabApariencia';
import { TabTextos }      from './components/TabTextos';
import { TabPaginaWeb }   from './components/TabPaginaWeb';
import { TabSmtp }        from './components/TabSmtp';
import { BRAND_COLOR } from '@/shared/constants/brand';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { r, vacio } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import ResumenErrores from '@/shared/components/ResumenErrores';

// Reglas propias de esta pantalla
const url = (ejemplo = 'https://fundacionpanoramadecolores.org') => r.propia(v =>
  (vacio(v) || /^https?:\/\/[^\s.]+\.\S+$/i.test(String(v).trim())
    ? '' : `Debe ser una dirección web completa que empiece por http:// o https://. Ejemplo: ${ejemplo}`));
const whatsapp = r.propia(v =>
  (vacio(v) || /^\d{10,13}$/.test(String(v).replace(/\s/g, ''))
    ? '' : 'Escribe solo números con el indicativo del país, sin + ni espacios. Ejemplo: 573226012056'));
// Teléfono público: se acepta el indicativo +57 al inicio (ej. +57 322 602 2056)
const telefonoPublico = r.propia(v => r.telefono()(vacio(v) ? v : String(v).trim().replace(/^\+57/, '')));
// SMTP: solo se exige el servidor cuando se está configurando el correo
const configurandoSmtp = f => [f.smtpHost, f.smtpUsuario, f.smtpClave, f.smtpDeNombre, f.smtpDeEmail].some(x => !vacio(x));

// Reglas de toda la configuración (se guarda todo con un solo botón). `tab` indica la pestaña del campo.
// Los campos de la Página Web se aplanan con el prefijo `web…` (ver datosValidacion).
const ESQUEMA = {
  nit:             { tab: 0, etiqueta: 'Fundación · NIT',      reglas: [r.nit()] },
  telefono:        { tab: 0, etiqueta: 'Fundación · Teléfono', reglas: [r.telefono()] },
  nombreRepLegal:  { tab: 1, etiqueta: 'Representante · Nombre completo', reglas: [r.nombreCompleto('María Pérez Gómez')] },
  documentoRep:    { tab: 1, etiqueta: 'Representante · Número de documento', reglas: [r.documentoSegunTipo('tipoDocRep')] },
  emailContacto:   { tab: 3, etiqueta: 'Textos · Correo de contacto', reglas: [r.correo('contacto@fundacionpanoramadecolores.org')] },
  sitioWeb:        { tab: 3, etiqueta: 'Textos · Sitio web',          reglas: [url()] },
  webDonWhatsapp:  { tab: 4, etiqueta: 'Página Web · WhatsApp para donaciones', reglas: [whatsapp] },
  webDonEmail:     { tab: 4, etiqueta: 'Página Web · Email para donaciones',    reglas: [r.correo()] },
  webConTelefono:  { tab: 4, etiqueta: 'Página Web · Teléfono de contacto',     reglas: [telefonoPublico] },
  webConEmail:     { tab: 4, etiqueta: 'Página Web · Email de contacto',        reglas: [r.correo()] },
  webConInstagram: { tab: 4, etiqueta: 'Página Web · URL Instagram', reglas: [url('https://www.instagram.com/fundacionpanoramadecolores/')] },
  webConTiktok:    { tab: 4, etiqueta: 'Página Web · URL TikTok',    reglas: [url('https://www.tiktok.com/@fundapanoramadecolores')] },
  webConWhatsapp:  { tab: 4, etiqueta: 'Página Web · WhatsApp',      reglas: [whatsapp] },
  smtpHost:        { tab: 5, etiqueta: 'Correo · Servidor SMTP', reglas: [r.si(configurandoSmtp, r.obligatorio('smtp.gmail.com'))] },
  smtpPuerto:      { tab: 5, etiqueta: 'Correo · Puerto', reglas: [
    r.si(configurandoSmtp, r.obligatorio('587')), r.numero({ min: 1, max: 65535, entero: true, ejemplo: '587' }),
  ] },
  smtpUsuario:     { tab: 5, etiqueta: 'Correo · Usuario / Email de envío', reglas: [r.si(configurandoSmtp, r.obligatorio('fundacion@gmail.com')), r.texto({ max: 200 })] }, // algunos proveedores usan un usuario que no es correo (p. ej. 'apikey')
  smtpDeEmail:     { tab: 5, etiqueta: 'Correo · Email del remitente',      reglas: [r.correo('donaciones@fundacion.org')] },
};

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

  // Datos a validar: el formulario general más los campos de contacto de la Página Web
  const datosValidacion = {
    ...form,
    webDonWhatsapp:  webForm.donaciones?.whatsapp,
    webDonEmail:     webForm.donaciones?.email,
    webConTelefono:  webForm.contacto?.telefono,
    webConEmail:     webForm.contacto?.email,
    webConInstagram: webForm.contacto?.instagram,
    webConTiktok:    webForm.contacto?.tiktok,
    webConWhatsapp:  webForm.contacto?.whatsapp,
  };
  const v = useValidacion(ESQUEMA, datosValidacion);

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
          colorPrimario:      data.colorPrimario      || BRAND_COLOR,
          colorSidebar:       data.colorSidebar       || '#150830',
          colorSecundario:    data.colorSecundario    || '#2D984F',
          colorGradiente:     data.colorGradiente     || '#3a1470',
          colorOscuroFondo:   data.colorOscuroFondo   || '#0f0f0f',
          colorOscuroPaper:   data.colorOscuroPaper   || '#1c1c1c',
          colorOscuroSidebar: data.colorOscuroSidebar || '#1B1035',
          colorAccento:       data.colorAccento       || '#FAA112',
          fontFamily:         data.fontFamily         || 'Inter',
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
          } catch { /* opcional: si el JSON guardado está dañado se usan los textos por defecto */ }
        }
      })
      .catch((e) => setError(mensajeErrorApi(e, { accion: 'cargar la configuración' })))
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
    if (!v.validarTodo()) {
      // Lleva a la pestaña del primer dato mal llenado para que se vea el campo marcado
      const primero = Object.keys(v.errores)[0];
      if (primero) setTab(ESQUEMA[primero].tab);
      return;
    }
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
        colorAccento:       form.colorAccento       || null,
        fontFamily:         form.fontFamily         || null,
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
    } catch (e) {
      setError(mensajeErrorApi(e, { accion: 'guardar la configuración' }));
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
        <Typography variant="h5" sx={{ fontWeight: 800, color: COLOR }}>Configuración</Typography>
        <Typography sx={{ color: 'text.secondary', mt: 0.5 }} variant="body2">
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
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: COLOR }} /></Box>
      ) : (
        <Box>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
              sx={{ '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.88rem' },
                    '& .Mui-selected': { color: COLOR }, '& .MuiTabs-indicator': { backgroundColor: COLOR } }}>
              {TABS.map((t, i) => <Tab key={i} label={t} />)}
            </Tabs>
          </Box>

          {tab === 0 && <TabFundacion   form={form} set={set} v={v} />}
          {tab === 1 && <TabRepLegal    form={form} set={set} setForm={setForm} v={v} />}
          {tab === 2 && <TabApariencia  form={form} setForm={setForm} />}
          {tab === 3 && <TabTextos      form={form} set={set} v={v} />}
          {tab === 4 && <TabPaginaWeb   webForm={webForm} setWebForm={setWebForm} v={v} />}
          {tab === 5 && <TabSmtp        form={form} set={set} v={v} />}

          <Divider sx={{ my: 3 }} />
          <ResumenErrores {...v.resumen} accion="guardar la configuración" sx={{ mx: 0, mt: 0, mb: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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
