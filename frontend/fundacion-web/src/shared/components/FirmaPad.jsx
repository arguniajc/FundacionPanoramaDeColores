import { useRef, useEffect, useState } from 'react';
import SignaturePad from 'signature_pad';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Typography,
} from '@mui/material';
import DrawIcon   from '@mui/icons-material/Draw';
import DeleteIcon from '@mui/icons-material/Delete';

const COLOR = '#4E1B95';

export default function FirmaPad({ label, value, onChange, obligatorio = false, disabled = false }) {
  const [open, setOpen]   = useState(false);
  const canvasRef         = useRef(null);
  const padRef            = useRef(null);

  // Inicializar SignaturePad cuando el diálogo está visible y el canvas renderizado
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ratio  = window.devicePixelRatio || 1;
      canvas.width  = canvas.offsetWidth  * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d').scale(ratio, ratio);
      padRef.current = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255,255,255)',
        penColor:        'rgb(20,20,20)',
        minWidth: 1,
        maxWidth: 2.5,
      });
    }, 150); // esperar animación del Dialog
    return () => {
      clearTimeout(timer);
      padRef.current?.off();
      padRef.current = null;
    };
  }, [open]);

  const handleConfirmar = () => {
    if (!padRef.current || padRef.current.isEmpty()) return;
    onChange(padRef.current.toDataURL('image/png'));
    setOpen(false);
  };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.8}>
        {label}{obligatorio ? ' *' : ''}
      </Typography>

      {value ? (
        <Box>
          <Box component="img" src={value} alt="Firma capturada"
            sx={{
              display: 'block', height: 60, maxWidth: 260,
              objectFit: 'contain', bgcolor: 'white',
              border: '1.5px solid #d0c4f7', borderRadius: 1.5, mb: 0.8,
            }}
          />
          {!disabled && (
            <Box display="flex" gap={1.5}>
              <Button size="small" onClick={() => setOpen(true)}
                sx={{ color: COLOR, p: 0, minWidth: 0, textDecoration: 'underline', fontSize: '0.75rem' }}>
                Cambiar firma
              </Button>
              <Button size="small" color="error" onClick={() => onChange('')}
                sx={{ p: 0, minWidth: 0, textDecoration: 'underline', fontSize: '0.75rem' }}>
                Quitar
              </Button>
            </Box>
          )}
        </Box>
      ) : (
        <Button variant="outlined" size="small" startIcon={<DrawIcon />}
          onClick={() => setOpen(true)} disabled={disabled}
          sx={{ color: COLOR, borderColor: COLOR }}>
          Firmar aquí
        </Button>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ bgcolor: COLOR, color: 'white', fontWeight: 700, py: 1.5 }}>
          Captura de firma — {label}
        </DialogTitle>

        <DialogContent sx={{ pt: 2, pb: 1, px: 2.5 }}>
          <Typography variant="body2" color="text.secondary" mb={1.5}>
            Firma con el dedo (pantalla táctil) o con el ratón dentro del recuadro.
          </Typography>
          <Box sx={{
            border: `2px solid ${COLOR}`, borderRadius: 2,
            overflow: 'hidden', bgcolor: 'white', cursor: 'crosshair',
          }}>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: 200, display: 'block', touchAction: 'none' }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" mt={0.8}>
            Toca "Borrar" para volver a empezar.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
          <Button startIcon={<DeleteIcon />}
            onClick={() => padRef.current?.clear()}
            sx={{ color: 'text.secondary' }}>
            Borrar
          </Button>
          <Box flex={1} />
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirmar} sx={{ bgcolor: COLOR }}>
            Confirmar firma
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
