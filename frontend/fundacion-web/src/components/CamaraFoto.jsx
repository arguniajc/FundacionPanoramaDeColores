import { useRef, useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogActions,
  Button, Box, Typography, IconButton, CircularProgress,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CloseIcon       from '@mui/icons-material/Close';

/**
 * Modal que abre la cámara via getUserMedia (funciona en móvil y portátil).
 * Props: open, onCerrar, onCaptura(file: File)
 */
export default function CamaraFoto({ open, onCerrar, onCaptura }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [iniciando, setIniciando] = useState(false);
  const [listo,     setListo]     = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (!open) return;
    setError(''); setListo(false); setIniciando(true);

    const constraints = {
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      audio: false,
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setIniciando(false);
        setListo(true);
      })
      .catch(() => {
        setError('No se pudo acceder a la cámara.\nVerifica que el navegador tenga permiso.');
        setIniciando(false);
      });

    return detener;
  }, [open]);

  const detener = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const handleCerrar = () => { detener(); setListo(false); onCerrar(); };

  const handleCapturar = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
      detener();
      setListo(false);
      onCaptura(file);
    }, 'image/jpeg', 0.92);
  };

  return (
    <Dialog
      open={open}
      onClose={handleCerrar}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, bgcolor: '#111' } }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1.5, pt: 1.5 }}>
        <IconButton onClick={handleCerrar} sx={{ color: '#fff' }} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 1, pt: 0, textAlign: 'center', minHeight: 180 }}>
        {iniciando && (
          <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress sx={{ color: '#B4E8E8' }} />
            <Typography color="rgba(255,255,255,0.5)" fontSize={13}>
              Iniciando cámara…
            </Typography>
          </Box>
        )}

        {error && (
          <Typography color="#ff6b6b" sx={{ p: 4, whiteSpace: 'pre-line', fontSize: 14, lineHeight: 1.7 }}>
            {error}
          </Typography>
        )}

        <Box
          component="video"
          ref={videoRef}
          autoPlay
          playsInline
          muted
          sx={{
            display: listo ? 'block' : 'none',
            width: '100%', maxHeight: 380,
            borderRadius: 2, bgcolor: '#000',
          }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </DialogContent>

      {listo && (
        <DialogActions sx={{ justifyContent: 'center', pb: 2.5 }}>
          <Button
            variant="contained"
            onClick={handleCapturar}
            startIcon={<PhotoCameraIcon />}
            sx={{
              bgcolor: '#4E1B95', '&:hover': { bgcolor: '#3a1470' },
              borderRadius: 3, px: 4, fontWeight: 700, fontSize: 15,
            }}
          >
            Capturar
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
