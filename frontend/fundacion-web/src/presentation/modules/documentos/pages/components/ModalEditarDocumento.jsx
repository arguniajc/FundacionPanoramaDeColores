import { useState } from 'react';
import {
  Box, DialogContent,
  DialogTitle, FormControl, FormHelperText, IconButton, InputLabel,
  MenuItem, Select, TextField, Typography,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import { AccionesDialogo, ErrorServidor } from '@/shared/components/form/FormControles';
import { useCerrarConCambios, hayCambiosEn } from '@/shared/hooks/useCerrarConCambios';
import { useAutoFocus } from '@/shared/hooks/useAutoFocus';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon  from '@mui/icons-material/Edit';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { useValidacion }   from '@/shared/hooks/useValidacion';
import ResumenErrores      from '@/shared/components/ResumenErrores';
import { CATEGORIAS, HEADER_GRADIENT } from './helpers';
import {
  ESQUEMA_EDITAR_INSTITUCIONAL, ESQUEMA_EDITAR_BENEFICIARIO, formEdicion, datosEdicion,
} from './edicionDocumento';

/**
 * Edita los datos de un documento (no el archivo: para cambiarlo se sube otro).
 * `conCategoria`: institucional (título, categoría y descripción); si no, archivo de un
 * beneficiario (solo el nombre visible). `onGuardar(datos)` hace el PUT.
 */
export function ModalEditarDocumento({ documento, conCategoria = true, onCerrar, onGuardar, onToast }) {
  const [form,      setForm]      = useState(() => formEdicion(documento, conCategoria));
  const [inicial]                 = useState(form);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');
  const v = useValidacion(conCategoria ? ESQUEMA_EDITAR_INSTITUCIONAL : ESQUEMA_EDITAR_BENEFICIARIO, form);

  const hayCambios = hayCambiosEn(form, inicial);
  const { confirmarCierre } = useCerrarConCambios({ hayCambios, bloqueado: guardando, onCerrar });
  const autoFocus = useAutoFocus();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleGuardar = async () => {
    if (!v.validarTodo()) return;
    setGuardando(true); setError('');
    try {
      await onGuardar(datosEdicion(form, conCategoria));
      onToast('Documento actualizado correctamente', 'success');
      onCerrar();
    } catch (err) {
      setError(mensajeErrorApi(err, { accion: 'guardar los cambios del documento' }));
      setGuardando(false);
    }
  };

  return (
    <Dialog slotProps={{ paper: { sx: { borderRadius: { xs: 0, sm: 3 } } } }} open
      onClose={confirmarCierre} alEnviar={handleGuardar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ background: HEADER_GRADIENT, color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><EditIcon /> Editar documento</Box>
        <IconButton onClick={() => confirmarCierre()} disabled={guardando} size="small" aria-label="Cerrar" sx={{ color: 'rgba(255,255,255,0.8)' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ py: 2.5, px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField fullWidth size="small" label={conCategoria ? 'Título *' : 'Nombre del documento *'}
          value={form.titulo} onChange={set('titulo')} autoFocus={autoFocus} {...v.props('titulo')} />

        {conCategoria && (
          <>
            <FormControl size="small" fullWidth error={!!v.err('categoria')}>
              <InputLabel id="modal-editar-documento-categoria-label">Categoría</InputLabel>
              <Select labelId="modal-editar-documento-categoria-label" label="Categoría" value={form.categoria}
                onChange={set('categoria')} onBlur={() => v.tocar('categoria')}>
                {CATEGORIAS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
              {v.err('categoria') && <FormHelperText>{v.err('categoria')}</FormHelperText>}
            </FormControl>
            <TextField fullWidth size="small" multiline minRows={2} label="Descripción (opcional)"
              value={form.descripcion} onChange={set('descripcion')}
              {...v.props('descripcion', 'Ejemplo: Asamblea ordinaria de marzo con aprobación de estados financieros')} />
          </>
        )}

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          El archivo no cambia. Para reemplazarlo, sube el nuevo documento y elimina este.
        </Typography>
      </DialogContent>
      <ResumenErrores {...v.resumen} accion="guardar los cambios" />
      <ErrorServidor mensaje={error} onClose={() => setError('')} />
      <AccionesDialogo onCancelar={confirmarCierre} guardando={guardando} enviar textoGuardar="Guardar cambios"
        sxGuardar={{ bgcolor: 'var(--color-primario)', '&:hover': { bgcolor: 'var(--color-gradiente)' }, minWidth: 140 }} />
    </Dialog>
  );
}
