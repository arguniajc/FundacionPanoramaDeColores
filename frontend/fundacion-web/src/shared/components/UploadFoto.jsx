import { useRef, useState } from 'react';
import {
  Box, Typography, CircularProgress, IconButton,
  Tooltip, Menu, MenuItem, ListItemIcon, ListItemText,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloudUploadIcon  from '@mui/icons-material/CloudUpload';
import DeleteIcon       from '@mui/icons-material/Delete';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import CameraAltIcon    from '@mui/icons-material/CameraAlt';
import CamaraFoto       from './CamaraFoto';
import apiClient        from '@/infrastructure/http/apiClient';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { useArchivoUrl } from '@/shared/utils/archivos';

const ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif';

/**
 * @param {{ label: string, carpeta?: string, value: string|null, onChange: (url: string|null) => void }} props
 */
export default function UploadFoto({ label, carpeta = 'fotos', value, onChange }) {
  const inputRef = useRef(null);

  const [subiendo,      setSubiendo]      = useState(false);
  const vista = useArchivoUrl(value); // privado → enlace temporal para la vista previa
  const [errorMsg,      setErrorMsg]      = useState('');
  const [anchorEl,      setAnchorEl]      = useState(null);
  const [camaraAbierta, setCamaraAbierta] = useState(false);

  const abrirMenu  = (e) => { if (!subiendo) setAnchorEl(e.currentTarget); };
  const cerrarMenu = ()  => setAnchorEl(null);

  const subirArchivo = async (archivo) => {
    setSubiendo(true);
    setErrorMsg('');
    try {
      const form = new FormData();
      form.append('archivo', archivo);
      const { data } = await apiClient.post(`/api/archivos/upload?carpeta=${carpeta}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(data.url);
    } catch (err) {
      setErrorMsg(mensajeErrorApi(err, { accion: 'subir la imagen' }));
    } finally {
      setSubiendo(false);
    }
  };

  const handleSeleccionar = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    e.target.value = '';
    await subirArchivo(archivo);
  };

  const handleCaptura  = async (file) => { setCamaraAbierta(false); await subirArchivo(file); };
  const handleEliminar = () => { onChange(null); setErrorMsg(''); };

  return (
    <Box>
      <Typography sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }} variant="caption">
        {label}
      </Typography>

      {value ? (
        <Box sx={{ position: 'relative', display: 'inline-block' }}>
          <Box
            component="img"
            src={vista || undefined}
            alt={label}
            onClick={abrirMenu}
            sx={{
              width: 120, height: 90, objectFit: 'cover',
              borderRadius: 2, border: '2px solid', borderColor: 'divider',
              display: 'block', cursor: 'pointer',
            }}
          />
          <Tooltip title="Eliminar foto">
            <IconButton
              size="small"
              onClick={handleEliminar}
              sx={{
                position: 'absolute', top: -8, right: -8,
                bgcolor: 'error.main', color: 'error.contrastText', width: 22, height: 22,
                '&:hover': { bgcolor: 'error.dark' },
              }}
            >
              <DeleteIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Box
            component="button" type="button"
            onClick={abrirMenu}
            sx={{
              mt: 0.5, display: 'block', width: '100%',
              fontSize: 11, color: 'var(--color-primario-texto)', background: 'none',
              border: 'none', cursor: 'pointer', textDecoration: 'underline', p: 0,
            }}
          >
            Cambiar foto
          </Box>
        </Box>
      ) : (
        <Box
          component="button" type="button"
          onClick={abrirMenu}
          sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            width: 120, height: 90, border: '2px dashed', borderColor: (t) => alpha(t.palette.text.primary, 0.25), borderRadius: 2,
            bgcolor: 'superficie2', cursor: subiendo ? 'default' : 'pointer',
            transition: 'border-color .2s, background .2s',
            '&:hover': !subiendo ? { borderColor: 'var(--color-primario-texto)', bgcolor: (t) => alpha(t.palette.primary.main, 0.06) } : {},
            gap: 0.5, p: 0,
          }}
        >
          {subiendo
            ? <CircularProgress size={22} sx={{ color: 'var(--color-primario-texto)' }} />
            : <CloudUploadIcon sx={{ color: 'text.disabled', fontSize: 28 }} />
          }
          <Typography sx={{ color: 'text.disabled', fontSize: 10 }} variant="caption">
            {subiendo ? 'Subiendo…' : 'Subir / Tomar foto'}
          </Typography>
        </Box>
      )}

      {errorMsg && (
        <Typography sx={{ display: 'block', mt: 0.5, maxWidth: 160 }} variant="caption" color="error">
          {errorMsg}
        </Typography>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={cerrarMenu}
        slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 180 } } }}
      >
        <MenuItem onClick={() => { cerrarMenu(); inputRef.current?.click(); }}>
          <ListItemIcon><PhotoLibraryIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Galería</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { cerrarMenu(); setCamaraAbierta(true); }}>
          <ListItemIcon><CameraAltIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Cámara</ListItemText>
        </MenuItem>
      </Menu>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        style={{ display: 'none' }}
        onChange={handleSeleccionar}
      />

      <CamaraFoto
        open={camaraAbierta}
        onCerrar={() => setCamaraAbierta(false)}
        onCaptura={handleCaptura}
      />
    </Box>
  );
}
