import { useState, useRef } from 'react';
import { Box, Button, Tooltip, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FirmaPad from '@/shared/components/FirmaPad';
import { COLOR, leerArchivoComoDataUrl, redimensionarImagen } from './helpers';
import { validarArchivo } from '@/shared/utils/archivosPermitidos';

export function FirmaRepresentante({ value, onChange }) {
  const inputRef        = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errImg,   setErrImg]   = useState('');

  const handleSubir = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const errArchivo = validarArchivo(file, { tipos: 'imagen' });
    if (errArchivo) { setErrImg(errArchivo); return; }
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
      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title="Sube una foto o escaneo de la firma">
          <Button size="small" variant="outlined"
            startIcon={<UploadFileIcon />} onClick={() => inputRef.current?.click()} disabled={subiendo}
            sx={{ color: COLOR, borderColor: COLOR, fontSize: '0.75rem' }}>
            {subiendo ? 'Procesando…' : 'Subir imagen de firma'}
          </Button>
        </Tooltip>
        <Typography sx={{ color: 'text.secondary' }} variant="caption">JPG · PNG · máx. 5 MB</Typography>
      </Box>
      {errImg && <Typography sx={{ display: 'block', mt: 0.5 }} variant="caption" color="error">{errImg}</Typography>}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleSubir} />
    </Box>
  );
}
