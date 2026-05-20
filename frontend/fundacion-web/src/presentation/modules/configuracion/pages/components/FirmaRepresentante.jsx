import { useState, useRef } from 'react';
import { Box, Button, Tooltip, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FirmaPad from '../../../../../shared/components/FirmaPad';
import { COLOR, leerArchivoComoDataUrl, redimensionarImagen } from './helpers';

export function FirmaRepresentante({ value, onChange }) {
  const inputRef        = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errImg,   setErrImg]   = useState('');

  const handleSubir = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!file.type.startsWith('image/')) { setErrImg('El archivo debe ser una imagen'); return; }
    if (file.size > 5 * 1024 * 1024)    { setErrImg('La imagen no puede superar 5 MB'); return; }
    setErrImg(''); setSubiendo(true);
    try {
      const raw      = await leerArchivoComoDataUrl(file);
      const reducida = await redimensionarImagen(raw, 600);
      onChange(reducida);
    } catch { setErrImg('No se pudo procesar la imagen.'); }
    finally   { setSubiendo(false); }
  };

  return (
    <Box>
      <FirmaPad label="Firma del representante legal" value={value} onChange={onChange} />
      <Box mt={1} display="flex" alignItems="center" gap={1}>
        <Tooltip title="Sube una foto o escaneo de la firma">
          <Button size="small" variant="outlined"
            startIcon={<UploadFileIcon />} onClick={() => inputRef.current?.click()} disabled={subiendo}
            sx={{ color: COLOR, borderColor: COLOR, fontSize: '0.75rem' }}>
            {subiendo ? 'Procesando…' : 'Subir imagen de firma'}
          </Button>
        </Tooltip>
        <Typography variant="caption" color="text.secondary">JPG · PNG · máx. 5 MB</Typography>
      </Box>
      {errImg && <Typography variant="caption" color="error" display="block" mt={0.5}>{errImg}</Typography>}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleSubir} />
    </Box>
  );
}
