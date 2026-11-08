import { useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, FormHelperText, IconButton, InputLabel,
  MenuItem, Select, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
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
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const v = useValidacion(conCategoria ? ESQUEMA_EDITAR_INSTITUCIONAL : ESQUEMA_EDITAR_BENEFICIARIO, form);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleGuardar = async () => {
    if (!v.validarTodo()) return;
    setGuardando(true); setError('');
    try {
      await onGuardar(datosEdicion(form, conCategoria));
      onToast('Documento actualizado', 'success');
      onCerrar();
    } catch (err) {
      setError(mensajeErrorApi(err, { accion: 'guardar los cambios del documento' }));
      setGuardando(false);
    }
  };

  return (
    <Dialog slotProps={{ paper: { sx: { borderRadius: isMobile ? 0 : 3 } } }} open
      onClose={guardando ? undefined : onCerrar} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ background: HEADER_GRADIENT, color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><EditIcon /> Editar documento</Box>
        <IconButton onClick={onCerrar} disabled={guardando} size="small" aria-label="Cerrar" sx={{ color: 'rgba(255,255,255,0.8)' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ py: 2.5, px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField fullWidth size="small" label={conCategoria ? 'Título *' : 'Nombre del documento *'}
          value={form.titulo} onChange={set('titulo')} {...v.props('titulo')} />

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
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onCerrar} variant="outlined" disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={handleGuardar} disabled={guardando}
          startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <EditIcon />}
          sx={{ bgcolor: 'var(--color-primario)', '&:hover': { bgcolor: 'var(--color-gradiente)' }, fontWeight: 700, minWidth: 140 }}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
