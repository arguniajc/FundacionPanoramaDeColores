// Edición de un beneficiario en una sola página. Usa las mismas secciones que el registro
// (./secciones), con las mismas reglas (validacionBeneficiario) y la verificación de documento
// duplicado excluyendo al propio registro.
import { useState, useRef } from 'react';
import {
  DialogTitle, DialogContent, DialogActions, Button, Grid, Typography, Alert, IconButton, CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Dialog from '@/shared/components/DialogResponsive';
import ResumenErrores from '@/shared/components/ResumenErrores';
import apiClient from '@/infrastructure/http/apiClient';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { REGLAS, validarFormulario, esSinDocumento } from '@/domain/beneficiarios/validacionBeneficiario';
import { formDesdeBeneficiario, payloadBeneficiario } from './secciones/beneficiarioForm';
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

const MSG_DUPLICADO = 'Este documento ya lo tiene otro beneficiario. Revisa el número o abre su ficha con "Ver beneficiario".';

const conPunteroFino = () => {
  try { return window.matchMedia('(pointer: fine)').matches; } catch { return true; }
};

export default function EditarInscripcion({ inscripcion, onCerrar, onGuardado, onVerBeneficiario }) {
  const [inicial] = useState(() => formDesdeBeneficiario(inscripcion));
  const [form, setForm]                   = useState(inicial);
  const [confirmCerrar, setConfirmCerrar] = useState(false);
  const [resumen, setResumen]             = useState(false);
  const [guardando, setGuardando]         = useState(false);
  const [error, setError]                 = useState('');
  const primerCampoRef = useRef(null);

  const doc = useVerificarDocumento({ excluirId: inscripcion.id });
  const docDuplicado = doc.fase === 'existe' && !esSinDocumento(form.tipoDocumento)
    && doc.numero === String(form.numeroDocumento ?? '').trim();

  // Reglas centralizadas (las mismas del registro), sin la autorización
  const errores = docDuplicado
    ? { ...validarFormulario(form), numeroDocumento: MSG_DUPLICADO }
    : validarFormulario(form);

  const campos = useCamposBeneficiario({
    form, setForm, errores, doc, idPrefix: 'editar-inscripcion', tipoDocElegido: !!inicial.tipoDocumento,
  });
  const { c, marcarCampos } = campos;
  const isDirty = JSON.stringify(form) !== JSON.stringify(inicial);

  // Al abrir (cuando termina la animación del diálogo), el cursor queda en el primer campo;
  // en pantallas táctiles no, para no abrir el teclado encima del formulario.
  const enfocarPrimerCampo = () => {
    if (conPunteroFino())
      primerCampoRef.current?.querySelector('input:not([type="hidden"]):not([disabled]):not([aria-hidden="true"])')?.focus({ preventScroll: true });
  };

  const handleCerrar = () => { if (isDirty) setConfirmCerrar(true); else onCerrar(); };

  const handleGuardar = async () => {
    if (Object.keys(errores).length > 0) {
      marcarCampos(Object.keys(errores));
      setResumen(true);
      return;
    }
    setResumen(false);
    setGuardando(true); setError('');
    try {
      await apiClient.put(`/api/beneficiarios/${inscripcion.id}`, payloadBeneficiario(form));
      onGuardado();
    } catch (err) {
      setError(mensajeErrorApi(err, { conflicto: 'Ese número de documento ya está registrado.', accion: 'guardar los cambios' }));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Dialog open onClose={handleCerrar} maxWidth="md" fullWidth aria-labelledby="editar-inscripcion-titulo"
        slotProps={{ transition: { onEntered: enfocarPrimerCampo } }}>
        <DialogTitle id="editar-inscripcion-titulo" sx={{
          bgcolor: 'var(--color-primario)', color: 'white', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          Editar inscripción
          <IconButton onClick={handleCerrar} size="small" aria-label="Cerrar" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers ref={primerCampoRef} sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
          <LeyendaObligatorios />
          <Grid container spacing={2.5}>
            <SelectorTipo tipo={form.tipo} onChange={campos.cambiarTipo} />
            <SeccionDatosPersonales c={c} doc={doc} numeroOriginal={inicial.numeroDocumento}
              cambiarFecha={campos.cambiarFecha} cambiarTipoDocumento={campos.cambiarTipoDocumento}
              avisoTipo={campos.avisoTipo} cerrarAvisoTipo={campos.cerrarAvisoTipo}
              onVerBeneficiario={onVerBeneficiario} />
            <SeccionResidencia c={c} />
            <SeccionTallas c={c} />
            <SeccionSalud c={c} />
            <SeccionEducacion c={c} />
            {c.esNino ? <SeccionAcudiente c={c} /> : <SeccionContactoAdulto c={c} />}
            <SeccionAutorizacion c={c} />
            <SeccionFotos c={c} beneficiarioId={inscripcion.id} />
          </Grid>
        </DialogContent>

        <ResumenErrores visible={resumen} errores={errores} etiqueta={campo => REGLAS[campo]?.etiqueta}
          accion="guardar" onClose={() => setResumen(false)} />
        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mx: 3, mt: 1.5, mb: 0 }}>
            {error}
          </Alert>
        )}
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCerrar} disabled={guardando}>Cancelar</Button>
          <Button variant="contained" onClick={handleGuardar} disabled={guardando || doc.fase === 'verificando'}
            startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ bgcolor: 'var(--color-primario)' }}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmCerrar} onClose={() => setConfirmCerrar(false)} maxWidth="xs" fullWidth
        aria-labelledby="editar-inscripcion-salir-titulo">
        <DialogTitle id="editar-inscripcion-salir-titulo" sx={{ fontWeight: 700, pb: 1 }}>¿Salir sin guardar?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.secondary' }} variant="body2">
            Tienes cambios pendientes que se perderán si cierras sin guardar.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmCerrar(false)} variant="outlined" autoFocus>Seguir editando</Button>
          <Button onClick={() => { setConfirmCerrar(false); onCerrar(); }} variant="contained" color="error">
            Salir sin guardar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
