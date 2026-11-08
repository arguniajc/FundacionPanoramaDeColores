import { useState, useEffect } from 'react';
import {
  Box, Checkbox, DialogContent,
  DialogTitle, Divider, FormControlLabel, IconButton, Stack, Typography,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import CloseIcon from '@mui/icons-material/Close';
import { actividadesRepository } from '@/infrastructure/repositories/actividadesRepository';
import { AccionesDialogo } from '@/shared/components/form/FormControles';
import { useCerrarConCambios, hayCambiosEn } from '@/shared/hooks/useCerrarConCambios';
import { useToast } from '@/shared/context/useToast';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';

export function DialogAsistencia({ open, actividad, onClose, onGuardado }) {
  const [asistentes,  setAsistentes]  = useState([]);
  const [inicial,     setInicial]     = useState([]);
  const [saving,      setSaving]      = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!open || !actividad) return;
    actividadesRepository.asistencia(actividad.id)
      .then(({ data }) => { setAsistentes(data); setInicial(data); })
      .catch((e) => {
        setAsistentes([]); setInicial([]);
        toast(mensajeErrorApi(e, { accion: 'cargar la lista de asistencia' }), 'error');
      });
  }, [open, actividad, toast]);

  const hayCambios = open && hayCambiosEn(asistentes, inicial);
  const { confirmarCierre } = useCerrarConCambios({ hayCambios, bloqueado: saving, onCerrar: onClose });

  const toggle = (beneficiarioId) => {
    setAsistentes(prev => prev.map(a =>
      a.beneficiarioId === beneficiarioId ? { ...a, asistio: !a.asistio } : a
    ));
  };

  const guardar = async () => {
    setSaving(true);
    try {
      await actividadesRepository.registrarAsistencia(actividad.id, {
        asistencias: asistentes.map(a => ({ beneficiarioId: a.beneficiarioId, asistio: a.asistio })),
      });
      onGuardado();
      onClose();
    } catch (e) {
      toast(mensajeErrorApi(e, { accion: 'guardar la asistencia' }), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={confirmarCierre} alEnviar={guardar} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontWeight: 700 }} variant="subtitle1">Asistencia</Typography>
          <Typography sx={{ color: 'text.secondary' }} variant="caption">{actividad?.titulo}</Typography>
        </Box>
        <IconButton size="small" onClick={() => confirmarCierre()} disabled={saving} aria-label="Cerrar">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ py: 1 }}>
        {asistentes.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 2, textAlign: 'center' }}>
            No hay beneficiarios inscritos en este programa
          </Typography>
        ) : (
          <Stack spacing={0.5}>
            {asistentes.map(a => (
              <FormControlLabel key={a.beneficiarioId}
                control={<Checkbox checked={a.asistio} onChange={() => toggle(a.beneficiarioId)} size="small" />}
                label={<Typography variant="body2">{a.nombreCompleto}</Typography>}
                sx={{ ml: 0 }} />
            ))}
          </Stack>
        )}
      </DialogContent>
      <Divider />
      <Typography variant="caption" sx={{ color: 'text.secondary', px: 3, pt: 1.5 }}>
        {asistentes.filter(a => a.asistio).length} / {asistentes.length} presentes
      </Typography>
      <AccionesDialogo onCancelar={confirmarCierre} guardando={saving} enviar
        textoGuardar="Guardar asistencia" sx={{ pt: 1 }} />
    </Dialog>
  );
}
