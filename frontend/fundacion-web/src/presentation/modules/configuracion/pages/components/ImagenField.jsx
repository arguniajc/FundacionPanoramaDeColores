import { useState, useRef } from 'react';
import { Box, Button, CircularProgress, IconButton, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon             from '@mui/icons-material/Close';
import UploadFileIcon        from '@mui/icons-material/UploadFile';
import apiClient from '@/infrastructure/http/apiClient';
import { COLOR } from './helpers';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';

export function ImagenField({ label, value, onChange }) {
  const inputRef             = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errImg,   setErrImg]   = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!file.type.startsWith('image/')) { setErrImg('El archivo debe ser una imagen'); return; }
    if (file.size > 5 * 1024 * 1024)    { setErrImg('La imagen no puede superar 5 MB'); return; }
    setErrImg(''); setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append('archivo', file);
      const { data } = await apiClient.post('/api/archivos/upload?carpeta=web', fd);
      onChange({ target: { value: data.url } });
    } catch (e) {
      setErrImg(mensajeErrorApi(e, { accion: 'subir la imagen' }));
    } finally {
      setSubiendo(false);
    }
  };

  const limpiar = () => onChange({ target: { value: '' } });

  return (
    <Box>
      <Typography sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }} variant="caption">{label}</Typography>

      {value ? (
        <Box sx={{ position: 'relative', display: 'inline-block', mb: 1 }}>
          <Box
            component="img"
            src={value}
            alt="preview"
            sx={{ height: 100, maxWidth: 220, objectFit: 'cover', borderRadius: 2,
                  display: 'block', border: '1px solid', borderColor: 'divider' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <IconButton
            size="small"
            onClick={limpiar}
            sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper',
                  border: '1px solid', borderColor: 'divider', p: 0.3,
                  '&:hover': { bgcolor: (t) => alpha(t.palette.error.main, 0.12) } }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      ) : (
        <Box
          onClick={() => !subiendo && inputRef.current?.click()}
          sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 2,
                p: 2, mb: 1, textAlign: 'center', cursor: subiendo ? 'default' : 'pointer',
                '&:hover': { borderColor: COLOR, bgcolor: 'action.hover' } }}
        >
          {subiendo
            ? <CircularProgress size={24} sx={{ color: COLOR }} />
            : <AddPhotoAlternateIcon sx={{ fontSize: 32, color: 'text.disabled' }} />}
          <Typography sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }} variant="caption">
            {subiendo ? 'Subiendo imagen…' : 'Haz clic para subir una imagen'}
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={subiendo ? <CircularProgress size={12} /> : <UploadFileIcon />}
          onClick={() => inputRef.current?.click()}
          disabled={subiendo}
          sx={{ fontSize: '0.72rem', color: COLOR, borderColor: COLOR }}
        >
          {subiendo ? 'Subiendo…' : value ? 'Cambiar imagen' : 'Subir imagen'}
        </Button>
        {value && (
          <Typography variant="caption" sx={{ color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200, whiteSpace: 'nowrap' }}>
            {value.split('/').pop()}
          </Typography>
        )}
      </Box>

      {errImg && (
        <Typography sx={{ display: 'block', mt: 0.5 }} variant="caption" color="error">{errImg}</Typography>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </Box>
  );
}
