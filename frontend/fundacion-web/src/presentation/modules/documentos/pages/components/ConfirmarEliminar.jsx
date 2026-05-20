import { useState } from 'react';
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Typography,
} from '@mui/material';
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
    <Dialog open onClose={onCerrar} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 3, pb: 1 }}>
        <WarningAmberIcon sx={{ color: '#d32f2f', fontSize: 28 }} />
        <Typography fontWeight={700} fontSize="1.05rem">Eliminar documento</Typography>
      </DialogTitle>
      <DialogContent sx={{ pb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          ¿Estás seguro de que quieres eliminar{' '}
          <strong style={{ color: '#111' }}>{nombre}</strong>?
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
