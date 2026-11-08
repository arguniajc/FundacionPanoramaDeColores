import { useState } from 'react';
import {
  Box, Button, CircularProgress, DialogActions, DialogContent,
  DialogTitle, Typography,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import DeleteIcon       from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export function ConfirmarEliminar({ nombre, onConfirmar, onCerrar }) {
  const [eliminando, setEliminando] = useState(false);
  const handleConfirmar = async () => {
    setEliminando(true);
    await onConfirmar();
    onCerrar();
  };
  return (
    <Dialog slotProps={{ paper: { sx: { borderRadius: 3 } } }} open onClose={onCerrar} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 3, pb: 1 }}>
        <WarningAmberIcon sx={{ color: 'error.main', fontSize: 28 }} />
        <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>Eliminar documento</Typography>
      </DialogTitle>
      <DialogContent sx={{ pb: 1 }}>
        <Typography sx={{ color: 'text.secondary' }} variant="body2">
          ¿Estás seguro de que quieres eliminar{' '}
          <Box component="strong" sx={{ color: 'text.primary' }}>{nombre}</Box>?
          Esta acción no se puede deshacer.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onCerrar} variant="outlined" disabled={eliminando}>Cancelar</Button>
        <Button variant="contained" onClick={handleConfirmar} disabled={eliminando}
          startIcon={eliminando ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' }, fontWeight: 700, minWidth: 120 }}>
          {eliminando ? 'Eliminando…' : 'Eliminar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
