import { useState, useRef } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormHelperText, IconButton, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon          from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import UploadFileIcon     from '@mui/icons-material/UploadFile';
import apiClient         from '@/infrastructure/http/apiClient';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import ResumenErrores from '@/shared/components/ResumenErrores';
import { HEADER_GRADIENT, recortarNombreArchivo } from './helpers';
import { validarArchivo, ACCEPT_ARCHIVO } from '@/shared/utils/archivosPermitidos';

// Reglas del formulario: cada una dice qué está mal y cómo llenarlo
const ESQUEMA = {
  titulo:  { etiqueta: 'Nombre del documento', reglas: [r.obligatorio('Registro civil'), r.texto({ min: 3, max: 200 })] },
  archivo: { etiqueta: 'Archivo', reglas: [r.propia(f => {
    if (!f) return 'Selecciona un PDF haciendo clic en el recuadro. Ejemplo: registro_civil.pdf';
    return validarArchivo(f, { tipos: 'pdf' }) ?? '';
  })] },
};

export function ModalSubirArchivoBeneficiario({ beneficiario, onCerrar, onSubido, onToast }) {
  const [titulo,   setTitulo]   = useState('');
  const [archivo,  setArchivo]  = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error,    setError]    = useState('');
  const inputRef = useRef();
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const v = useValidacion(ESQUEMA, { titulo, archivo });

  const handleSubir = async () => {
    if (!v.validarTodo()) return;
    setSubiendo(true); setError('');
    try {
      const fd = new FormData();
      fd.append('archivo', archivo);
      const { data: up } = await apiClient.post(
        `/api/archivos/upload?carpeta=documentos-beneficiarios/${beneficiario.id}`,
        fd, { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      await onSubido({ titulo: titulo.trim(), url: up.url, nombreOriginal: recortarNombreArchivo(archivo.name) });
      onToast('Documento subido correctamente', 'success');
      onCerrar();
    } catch (e) {
      setError(mensajeErrorApi(e, { accion: 'subir el documento' }));
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <Dialog slotProps={{ paper: { sx: { borderRadius: isMobile ? 0 : 3 } } }} open onClose={onCerrar} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ background: HEADER_GRADIENT, color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><UploadFileIcon /> Subir documento</Box>
        <IconButton onClick={onCerrar} size="small" sx={{ color: 'rgba(255,255,255,0.8)' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ py: 2.5, px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <Typography sx={{ color: 'text.secondary' }} variant="body2">
          Beneficiario: <strong>{beneficiario.nombreMenor ?? beneficiario.nombre}</strong>
        </Typography>
        <TextField label="Nombre del documento *" size="small" fullWidth
          value={titulo} onChange={e => setTitulo(e.target.value)}
          {...v.props('titulo', 'Ejemplo: Registro civil, Certificado médico')} />
        <Box onClick={() => inputRef.current.click()}
          sx={{
            border: '2px dashed', borderColor: v.err('archivo') ? 'error.main' : archivo ? 'var(--color-primario)' : 'divider',
            borderRadius: 2, p: 2.5, textAlign: 'center', cursor: 'pointer',
            bgcolor: (t) => (archivo ? alpha(t.palette.primary.main, 0.06) : 'transparent'),
            '&:hover': { borderColor: 'var(--color-primario-texto)', bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
          }}>
          <InsertDriveFileIcon sx={{ fontSize: 36, color: archivo ? 'var(--color-primario)' : 'text.disabled', mb: 0.5 }} />
          <Typography sx={{ color: archivo ? 'var(--color-primario)' : 'text.secondary', fontWeight: archivo ? 600 : 400 }} variant="body2">
            {archivo ? archivo.name : 'Haz clic para seleccionar un PDF (máx. 10 MB)'}
          </Typography>
          <input ref={inputRef} type="file" accept={ACCEPT_ARCHIVO.pdf} hidden
            onChange={e => { setArchivo(e.target.files[0] || null); setError(''); v.tocar('archivo'); }} />
        </Box>
        {v.err('archivo') && <FormHelperText error sx={{ mt: -1.5 }}>{v.err('archivo')}</FormHelperText>}
      </DialogContent>
      <ResumenErrores {...v.resumen} accion="subir el documento" />
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onCerrar} variant="outlined" disabled={subiendo}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubir}
          disabled={subiendo}
          startIcon={subiendo ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
          sx={{ bgcolor: 'var(--color-primario)', '&:hover': { bgcolor: 'var(--color-gradiente)' }, fontWeight: 700, minWidth: 140 }}>
          {subiendo ? 'Subiendo…' : 'Subir documento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
