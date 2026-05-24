import { useState, useRef } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import CloseIcon          from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import UploadFileIcon     from '@mui/icons-material/UploadFile';
import apiClient         from '../../../../../infrastructure/http/apiClient';
import { HEADER_GRADIENT } from './helpers';

export function ModalSubirArchivoBeneficiario({ beneficiario, onCerrar, onSubido, onToast }) {
  const [titulo,   setTitulo]   = useState('');
  const [archivo,  setArchivo]  = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error,    setError]    = useState('');
  const inputRef = useRef();
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSubir = async () => {
    if (!titulo.trim() || !archivo) { setError('El nombre y el archivo son obligatorios.'); return; }
    setSubiendo(true); setError('');
    try {
      const fd = new FormData();
      fd.append('archivo', archivo);
      const { data: up } = await apiClient.post(
        `/api/archivos/upload?carpeta=documentos-beneficiarios/${beneficiario.id}`,
        fd, { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      await onSubido({ titulo: titulo.trim(), url: up.url, nombreOriginal: archivo.name });
      onToast('Documento subido correctamente', 'success');
      onCerrar();
    } catch (e) {
      setError(e.response?.data?.mensaje ?? 'Error al subir el archivo.');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}>
      <DialogTitle sx={{ background: HEADER_GRADIENT, color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={1}><UploadFileIcon /> Subir documento</Box>
        <IconButton onClick={onCerrar} size="small" sx={{ color: 'rgba(255,255,255,0.8)' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ py: 2.5, px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <Typography variant="body2" color="text.secondary">
          Beneficiario: <strong>{beneficiario.nombreMenor ?? beneficiario.nombre}</strong>
        </Typography>
        <TextField label="Nombre del documento *" size="small" fullWidth
          value={titulo} onChange={e => setTitulo(e.target.value)} />
        <Box onClick={() => inputRef.current.click()}
          sx={{
            border: '2px dashed', borderColor: archivo ? 'var(--color-primario)' : 'divider',
            borderRadius: 2, p: 2.5, textAlign: 'center', cursor: 'pointer',
            bgcolor: archivo ? '#f5f0ff' : 'transparent',
            '&:hover': { borderColor: 'var(--color-primario)', bgcolor: '#f5f0ff' },
          }}>
          <InsertDriveFileIcon sx={{ fontSize: 36, color: archivo ? 'var(--color-primario)' : 'text.disabled', mb: 0.5 }} />
          <Typography variant="body2" color={archivo ? 'var(--color-primario)' : 'text.secondary'} fontWeight={archivo ? 600 : 400}>
            {archivo ? archivo.name : 'Haz clic para seleccionar un PDF (máx. 10 MB)'}
          </Typography>
          <input ref={inputRef} type="file" accept="application/pdf" hidden
            onChange={e => { setArchivo(e.target.files[0] || null); setError(''); }} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onCerrar} variant="outlined" disabled={subiendo}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubir}
          disabled={subiendo || !titulo.trim() || !archivo}
          startIcon={subiendo ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
          sx={{ bgcolor: 'var(--color-primario)', '&:hover': { bgcolor: 'var(--color-gradiente)' }, fontWeight: 700, minWidth: 140 }}>
          {subiendo ? 'Subiendo…' : 'Subir documento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
