// Registro de beneficiario en 5 pasos (wizard). Las secciones son las mismas de "Editar inscripción"
// (./secciones). Borrador en sessionStorage —decisión de seguridad: se borra al cerrar la pestaña y al
// cerrar sesión (authStorage.clearSession)—, con una clave por tipo (niño / adulto) y el paso actual.
import { useState, useEffect, useRef } from 'react';
import {
  Box, DialogTitle, DialogContent, DialogActions, Button, Grid, Typography, Alert, CircularProgress,
  IconButton, Stepper, Step, StepButton, StepLabel,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import ResumenErrores from '@/shared/components/ResumenErrores';
import PersonAddIcon      from '@mui/icons-material/PersonAdd';
import CloseIcon          from '@mui/icons-material/Close';
import NavigateNextIcon   from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import apiClient          from '@/infrastructure/http/apiClient';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import {
  CAMPOS_POR_PASO, REGLAS, validarPaso, primerPasoConErrores, esSinDocumento,
} from '@/domain/beneficiarios/validacionBeneficiario';
import { formVacio, payloadBeneficiario, pasosRegistro } from './secciones/beneficiarioForm';
import { useCamposBeneficiario } from './secciones/useCamposBeneficiario';
import { useVerificarDocumento } from './secciones/useVerificarDocumento';
import { SelectorTipo, LeyendaObligatorios } from './secciones/comunes';
import SeccionDatosPersonales from './secciones/SeccionDatosPersonales';
import SeccionResidencia from './secciones/SeccionResidencia';
import SeccionTallas from './secciones/SeccionTallas';
import SeccionSalud from './secciones/SeccionSalud';
import { SeccionAcudiente, SeccionContactoAdulto } from './secciones/SeccionContacto';
import SeccionEducacion from './secciones/SeccionEducacion';
import { SeccionAutorizacion, SeccionFotos } from './secciones/SeccionAutorizacion';

// Una clave por tipo: el borrador de un niño no aparece al inscribir un adulto (y al revés)
const CLAVE_BORRADOR = { niño: 'nuevo_beneficiario_draft_nino', adulto: 'nuevo_beneficiario_draft_adulto' };
const ULTIMO_PASO = CAMPOS_POR_PASO.length - 1;

const MSG_DUPLICADO = 'Este documento ya está registrado. Revisa el número o abre su ficha con "Ver beneficiario".';

/** Borrador guardado ({ form, paso }); acepta el formato viejo (solo el form). null si no hay. */
function leerBorrador(clave, inicial) {
  try {
    const raw = sessionStorage.getItem(clave);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return null;
    const { form, paso } = d.form && typeof d.form === 'object' ? d : { form: d, paso: 0 };
    return {
      form: { ...inicial, ...form },
      paso: Number.isInteger(paso) ? Math.min(Math.max(paso, 0), ULTIMO_PASO) : 0,
    };
  } catch { return null; }
}

const guardarBorrador = (clave, datos) => {
  try {
    if (datos) sessionStorage.setItem(clave, JSON.stringify(datos));
    else sessionStorage.removeItem(clave);
  } catch { /* sin acceso a sessionStorage: el formulario funciona sin borrador */ }
};

// Primer campo editable del contenido (se salta el input oculto de los Select y lo deshabilitado)
const SELECTOR_CAMPO = [
  'input:not([type="hidden"]):not([disabled]):not([readonly]):not([aria-hidden="true"]):not([tabindex="-1"])',
  '[role="combobox"]:not([aria-disabled="true"]):not(input)',
  'textarea:not([disabled]):not([aria-hidden="true"])',
].join(', ');

const conPunteroFino = () => {
  try { return window.matchMedia('(pointer: fine)').matches; } catch { return true; }
};

export default function NuevoBeneficiario({ onCerrar, onCreado, onVerBeneficiario, tipoDefault = 'niño' }) {
  const clave = CLAVE_BORRADOR[tipoDefault === 'adulto' ? 'adulto' : 'niño'];
  const [inicial]  = useState(() => formVacio(tipoDefault === 'adulto' ? 'adulto' : 'niño'));
  const [borrador] = useState(() => leerBorrador(clave, inicial));

  const [form,          setForm]          = useState(() => borrador?.form ?? inicial);
  const [paso,          setPaso]          = useState(() => borrador?.paso ?? 0);
  const [pasoMax,       setPasoMax]       = useState(() => borrador?.paso ?? 0);
  const [hayBorrador,   setHayBorrador]   = useState(!!borrador);
  const [guardando,     setGuardando]     = useState(false);
  const [error,         setError]         = useState('');
  const [confirmCerrar, setConfirmCerrar] = useState(false);
  const [resumenPaso,   setResumenPaso]   = useState(false);
  const contenidoRef = useRef(null);

  const doc = useVerificarDocumento();
  const docDuplicado = doc.fase === 'existe' && !esSinDocumento(form.tipoDocumento)
    && doc.numero === String(form.numeroDocumento ?? '').trim();

  // ── Validación por paso (reglas centralizadas en validacionBeneficiario) ───────
  const erroresDe = p => (p === 0 && docDuplicado
    ? { ...validarPaso(p, form), numeroDocumento: MSG_DUPLICADO }
    : validarPaso(p, form));
  const errsPaso = erroresDe(paso);

  const campos = useCamposBeneficiario({ form, setForm, errores: errsPaso, doc, idPrefix: 'nuevo-beneficiario' });
  const { c, marcarCampos } = campos;
  const pasos = pasosRegistro(c.esNino);

  const isDirty = JSON.stringify(form) !== JSON.stringify(inicial);

  // El borrador se guarda en cada cambio (con el paso) y se borra si el formulario vuelve a estar vacío
  useEffect(() => { guardarBorrador(clave, isDirty ? { form, paso } : null); }, [clave, form, paso, isDirty]);

  // Cursor en el primer campo del paso (en pantallas táctiles no, para no abrir el teclado encima
  // del formulario). Al abrir se llama cuando termina la animación del diálogo (su contenido se monta
  // después del primer render); al cambiar de paso, además, el contenido vuelve arriba.
  const enfocarPrimerCampo = () => {
    if (conPunteroFino()) contenidoRef.current?.querySelector(SELECTOR_CAMPO)?.focus({ preventScroll: true });
  };
  useEffect(() => {
    const el = contenidoRef.current;
    if (!el) return undefined; // primer render: el diálogo aún no montó su contenido
    el.scrollTop = 0;
    const id = requestAnimationFrame(() => {
      if (conPunteroFino()) el.querySelector(SELECTOR_CAMPO)?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [paso]);

  const irA = destino => { setResumenPaso(false); setPaso(destino); setPasoMax(m => Math.max(m, destino)); };

  const mostrarErroresDe = p => { marcarCampos(CAMPOS_POR_PASO[p]); setPaso(p); setResumenPaso(true); };

  // No deja pasar al siguiente paso hasta que los datos estén bien
  const intentarAvanzar = () => {
    if (Object.keys(errsPaso).length > 0) { mostrarErroresDe(paso); return; }
    irA(paso + 1);
  };

  // Desde el stepper: hacia atrás siempre; hacia adelante (hasta donde ya llegó) si los pasos intermedios están bien
  const saltarA = destino => {
    if (destino <= paso) { irA(destino); return; }
    for (let p = paso; p < destino; p++) {
      if (Object.keys(erroresDe(p)).length > 0) { mostrarErroresDe(p); return; }
    }
    irA(destino);
  };

  const descartarBorrador = () => {
    setForm(inicial); setPaso(0); setPasoMax(0); setHayBorrador(false); setResumenPaso(false);
    doc.reiniciar();
  };

  const handleCerrar = () => { if (isDirty) setConfirmCerrar(true); else onCerrar(); };
  const salirConBorrador = () => { setConfirmCerrar(false); onCerrar(); };
  const salirDescartando = () => { guardarBorrador(clave, null); setConfirmCerrar(false); onCerrar(); };

  const handleGuardar = async () => {
    const pasoConError = primerPasoConErrores(form);
    if (pasoConError !== -1 || docDuplicado) { mostrarErroresDe(pasoConError === -1 ? 0 : pasoConError); return; }
    setGuardando(true); setError('');
    try {
      await apiClient.post('/api/beneficiarios', payloadBeneficiario(form));
      guardarBorrador(clave, null);
      onCreado();
    } catch (err) {
      setError(mensajeErrorApi(err, { conflicto: 'Ese número de documento ya está inscrito.', accion: 'inscribir el beneficiario' }));
    } finally {
      setGuardando(false);
    }
  };

  const verBeneficiario = onVerBeneficiario ? id => onVerBeneficiario(id) : undefined;

  const pasoRender = [
    () => (
      <>
        <SelectorTipo tipo={form.tipo} onChange={campos.cambiarTipo} />
        <SeccionDatosPersonales c={c} doc={doc}
          cambiarFecha={campos.cambiarFecha} cambiarTipoDocumento={campos.cambiarTipoDocumento}
          avisoTipo={campos.avisoTipo} cerrarAvisoTipo={campos.cerrarAvisoTipo}
          onVerBeneficiario={verBeneficiario} />
        <SeccionResidencia c={c} />
      </>
    ),
    () => <SeccionTallas c={c} />,
    () => <SeccionSalud c={c} />,
    () => (
      <>
        {c.esNino ? <SeccionAcudiente c={c} /> : <SeccionContactoAdulto c={c} />}
        <SeccionEducacion c={c} />
      </>
    ),
    () => (
      <>
        <SeccionAutorizacion c={c} required />
        <SeccionFotos c={c} />
      </>
    ),
  ];

  return (
    <>
      <Dialog slotProps={{ paper: { sx: { borderRadius: 3 } }, transition: { onEntered: enfocarPrimerCampo } }} open onClose={handleCerrar} maxWidth="md" fullWidth
        aria-labelledby="nuevo-beneficiario-titulo">
        <DialogTitle id="nuevo-beneficiario-titulo" sx={{
          background: 'linear-gradient(135deg, var(--color-primario) 0%, var(--color-secundario) 100%)',
          color: '#fff', fontWeight: 700, py: 2, px: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAddIcon aria-hidden="true" />
            Inscribir nuevo beneficiario
          </Box>
          <IconButton onClick={handleCerrar} size="small" aria-label="Cerrar" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers ref={contenidoRef} sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
          {hayBorrador && (
            <Alert severity="info" sx={{ mb: 2 }}
              action={<Button size="small" color="inherit" onClick={descartarBorrador}>Descartar borrador</Button>}>
              Se restauró un borrador guardado anteriormente.
            </Alert>
          )}

          <Stepper nonLinear activeStep={paso} alternativeLabel sx={{ mb: 3, '& .MuiStep-root': { px: { xs: 0.25, sm: 1 } } }}>
            {pasos.map((label, i) => (
              <Step key={i} completed={i < pasoMax && i !== paso}>
                <StepButton onClick={() => saltarA(i)} disabled={i > pasoMax || guardando}
                  aria-current={i === paso ? 'step' : undefined}>
                  <StepLabel sx={{
                    '& .MuiStepLabel-label': { fontSize: { xs: '0.66rem', sm: '0.73rem' }, overflowWrap: 'anywhere' },
                    '& .MuiStepIcon-root.Mui-active':    { color: 'var(--color-primario-texto)' },
                    '& .MuiStepIcon-root.Mui-completed': { color: 'var(--color-secundario)' },
                  }}>
                    {label}
                  </StepLabel>
                </StepButton>
              </Step>
            ))}
          </Stepper>

          <LeyendaObligatorios />
          <Grid container spacing={2.5}>
            {pasoRender[paso]()}
          </Grid>
        </DialogContent>

        <ResumenErrores visible={resumenPaso} errores={errsPaso} etiqueta={campo => REGLAS[campo]?.etiqueta}
          accion={paso < ULTIMO_PASO ? 'continuar' : 'inscribir'} onClose={() => setResumenPaso(false)} />
        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mx: 3, mt: 1.5, mb: 0 }}>
            {error}
          </Alert>
        )}
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2, gap: 1, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Button onClick={() => irA(paso - 1)} disabled={paso === 0 || guardando}
            startIcon={<NavigateBeforeIcon />} variant="outlined">
            Anterior
          </Button>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end', ml: 'auto' }}>
            <Button onClick={handleCerrar} disabled={guardando} variant="outlined" color="inherit">
              Cancelar
            </Button>
            {paso < ULTIMO_PASO ? (
              <Button variant="contained" onClick={intentarAvanzar} disabled={doc.fase === 'verificando'}
                endIcon={<NavigateNextIcon />}
                sx={{ bgcolor: 'var(--color-primario)', fontWeight: 700 }}>
                Siguiente
              </Button>
            ) : (
              <Button variant="contained" onClick={handleGuardar} disabled={guardando}
                startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}
                sx={{ bgcolor: 'var(--color-primario)', '&:hover': { bgcolor: 'var(--color-gradiente)' }, fontWeight: 700, minWidth: 160 }}>
                {guardando ? 'Registrando…' : 'Inscribir beneficiario'}
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmCerrar} onClose={() => setConfirmCerrar(false)} maxWidth="xs" fullWidth
        aria-labelledby="nuevo-beneficiario-salir-titulo">
        <DialogTitle id="nuevo-beneficiario-salir-titulo" sx={{ fontWeight: 700, pb: 1 }}>¿Salir del formulario?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.secondary' }} variant="body2">
            Lo que escribiste se guarda como borrador en esta pestaña y se restaura la próxima vez que abras
            el formulario. El borrador se borra al cerrar la pestaña o la sesión.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1, flexWrap: 'wrap' }}>
          <Button onClick={salirDescartando} color="error">Descartar borrador</Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={salirConBorrador} variant="outlined">Salir (se guarda el borrador)</Button>
          <Button onClick={() => setConfirmCerrar(false)} variant="contained" autoFocus>Seguir editando</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
