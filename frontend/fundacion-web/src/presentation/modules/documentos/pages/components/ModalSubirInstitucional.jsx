import { useState, useRef } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, IconButton, InputLabel, LinearProgress,
  MenuItem, Select, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import CloseIcon          from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import UploadFileIcon     from '@mui/icons-material/UploadFile';
import apiClient              from '@/infrastructure/http/apiClient';
import { CATEGORIAS, HEADER_GRADIENT, sinExtension } from './helpers';

export function ModalSubirInstitucional({ onCerrar, onSubido, onToast }) {
  const [categoria, setCategoria] = useState('Otros');
  const [archivos,  setArchivos]  = useState([]);
  const [subiendo,  setSubiendo]  = useState(false);
  const [progreso,  setProgreso]  = useState(0);
  const [error,     setError]     = useState('');
  const inputRef = useRef();
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const agregarArchivos = (lista) => {
    const nuevos = Array.from(lista).filter(f => f.type === 'application/pdf');
    setArchivos(prev => {
      const nombres = new Set(prev.map(f => f.name));
      return [...prev, ...nuevos.filter(f => !nombres.has(f.name))];
    });
    setError('');
  };

  const quitarArchivo = (nombre) => setArchivos(prev => prev.filter(f => f.name !== nombre));

  const handleSubir = async () => {
    if (archivos.length === 0) { setError('Selecciona al menos un PDF.'); return; }
    setSubiendo(true); setError('');
    let ok = 0;
    for (let i = 0; i < archivos.length; i++) {
      const file = archivos[i];
      try {
        const fd = new FormData();
        fd.append('archivo', file);
        const { data: up } = await apiClient.post(
          '/api/archivos/upload?carpeta=documentos-institucionales', fd,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        await onSubido({ titulo: sinExtension(file.name), categoria, url: up.url, nombreOriginal: file.name });
        ok++;
      } catch {
        setError(`Error al subir "${file.name}". Los demás se subieron correctamente.`);
      }
      setProgreso(Math.round(((i + 1) / archivos.length) * 100));
    }
    setSubiendo(false);
    if (ok > 0) {
      onToast(`${ok} documento${ok > 1 ? 's' : ''} subido${ok > 1 ? 's' : ''} correctamente`, 'success');
      onCerrar();
    }
  };

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}>
      <DialogTitle sx={{ background: HEADER_GRADIENT, color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={1}><UploadFileIcon /> Subir documentos</Box>
        <IconButton onClick={onCerrar} size="small" sx={{ color: 'rgba(255,255,255,0.8)' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ py: 2.5, px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormControl size="small" fullWidth>
          <InputLabel>Categoría</InputLabel>
          <Select label="Categoría" value={categoria} onChange={e => setCategoria(e.target.value)}>
            {CATEGORIAS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>

        <Box onClick={() => inputRef.current.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); agregarArchivos(e.dataTransfer.files); }}
          sx={{
            border: '2px dashed', borderColor: archivos.length ? 'var(--color-primario)' : 'divider',
            borderRadius: 2, p: 2.5, textAlign: 'center', cursor: 'pointer',
            bgcolor: archivos.length ? '#f5f0ff' : 'transparent',
            '&:hover': { borderColor: 'var(--color-primario)', bgcolor: '#f5f0ff' },
          }}>
          <InsertDriveFileIcon sx={{ fontSize: 36, color: archivos.length ? 'var(--color-primario)' : 'text.disabled', mb: 0.5 }} />
          <Typography variant="body2" color={archivos.length ? 'var(--color-primario)' : 'text.secondary'} fontWeight={600}>
            {archivos.length
              ? `${archivos.length} archivo${archivos.length > 1 ? 's' : ''} seleccionado${archivos.length > 1 ? 's' : ''}`
              : 'Haz clic o arrastra PDFs aquí (máx. 10 MB c/u)'}
          </Typography>
          {archivos.length === 0 && (
            <Typography variant="caption" color="text.disabled">Puedes seleccionar varios a la vez</Typography>
          )}
          <input ref={inputRef} type="file" accept="application/pdf" multiple hidden
            onChange={e => agregarArchivos(e.target.files)} />
        </Box>

        {archivos.length > 0 && (
          <Box sx={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {archivos.map(f => (
              <Box key={f.name} display="flex" alignItems="center" justifyContent="space-between"
                sx={{ bgcolor: '#f5f0ff', borderRadius: 1, px: 1.5, py: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'var(--color-primario)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>
                  {f.name}
                </Typography>
                <IconButton size="small" onClick={() => quitarArchivo(f.name)} disabled={subiendo}>
                  <CloseIcon sx={{ fontSize: 14, color: 'var(--color-primario)' }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        {subiendo && (
          <Box>
            <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
              Subiendo… {progreso}%
            </Typography>
            <LinearProgress variant="determinate" value={progreso}
              sx={{ borderRadius: 1, '& .MuiLinearProgress-bar': { bgcolor: 'var(--color-primario)' } }} />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onCerrar} variant="outlined" disabled={subiendo}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubir}
          disabled={subiendo || archivos.length === 0}
          startIcon={subiendo ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
          sx={{ bgcolor: 'var(--color-primario)', '&:hover': { bgcolor: 'var(--color-gradiente)' }, fontWeight: 700, minWidth: 140 }}>
          {subiendo ? `Subiendo ${progreso}%` : `Subir ${archivos.length > 1 ? `${archivos.length} archivos` : 'archivo'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
