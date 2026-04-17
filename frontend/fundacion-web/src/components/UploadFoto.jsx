import { useRef, useState } from 'react';
import {
  Box, Typography, CircularProgress, IconButton,
  Tooltip, Menu, MenuItem, ListItemIcon, ListItemText,
} from '@mui/material';
import CloudUploadIcon  from '@mui/icons-material/CloudUpload';
import DeleteIcon       from '@mui/icons-material/Delete';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import CameraAltIcon    from '@mui/icons-material/CameraAlt';
import FlipCameraIosIcon from '@mui/icons-material/FlipCameraIos';
import api from '../services/api';

export default function UploadFoto({ label, carpeta = 'fotos', value, onChange }) {
  const inputGaleriaRef   = useRef(null);
  const inputTraseraRef   = useRef(null);
  const inputFrontalRef   = useRef(null);

  const [subiendo, setSubiendo] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);

  const abrirMenu  = (e) => { if (!subiendo) setAnchorEl(e.currentTarget); };
  const cerrarMenu = ()  => setAnchorEl(null);

  const elegir = (ref) => { cerrarMenu(); ref.current?.click(); };

  const handleSeleccionar = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    e.target.value = '';

    setSubiendo(true);
    setErrorMsg('');
    try {
      const form = new FormData();
      form.append('archivo', archivo);
      const { data } = await api.post(`/api/archivos/upload?carpeta=${carpeta}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(data.url);
    } catch (err) {
      const detalle = err.response?.data?.mensaje ?? 'Error al subir la imagen.';
      setErrorMsg(detalle);
    } finally {
      setSubiendo(false);
    }
  };

  const handleEliminar = () => { onChange(null); setErrorMsg(''); };

  const ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif';

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
        {label}
      </Typography>

      {value ? (
        <Box sx={{ position: 'relative', display: 'inline-block' }}>
          <Box
            component="img"
            src={value}
            alt={label}
            sx={{
              width: 120, height: 90, objectFit: 'cover',
              borderRadius: 2, border: '2px solid #e0e0e0', display: 'block',
              cursor: 'pointer',
            }}
            onClick={abrirMenu}
          />
          <Tooltip title="Eliminar foto">
            <IconButton
              size="small"
              onClick={handleEliminar}
              sx={{
                position: 'absolute', top: -8, right: -8,
                bgcolor: '#d32f2f', color: '#fff',
                width: 22, height: 22,
                '&:hover': { bgcolor: '#b71c1c' },
              }}
            >
              <DeleteIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Box
            component="button"
            type="button"
            onClick={abrirMenu}
            sx={{
              mt: 0.5, display: 'block', width: '100%',
              fontSize: 11, color: '#4E1B95', background: 'none',
              border: 'none', cursor: 'pointer', textDecoration: 'underline', p: 0,
            }}
          >
            Cambiar foto
          </Box>
        </Box>
      ) : (
        <Box
          component="button"
          type="button"
          onClick={abrirMenu}
          sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            width: 120, height: 90, border: '2px dashed #bdbdbd', borderRadius: 2,
            bgcolor: '#fafafa', cursor: subiendo ? 'default' : 'pointer',
            transition: 'border-color .2s, background .2s',
            '&:hover': !subiendo ? { borderColor: '#4E1B95', bgcolor: '#f3effe' } : {},
            gap: 0.5, p: 0,
          }}
        >
          {subiendo
            ? <CircularProgress size={22} sx={{ color: '#4E1B95' }} />
            : <CloudUploadIcon sx={{ color: '#bdbdbd', fontSize: 28 }} />
          }
          <Typography variant="caption" color="text.disabled" fontSize={10}>
            {subiendo ? 'Subiendo…' : 'Subir / Tomar foto'}
          </Typography>
        </Box>
      )}

      {errorMsg && (
        <Typography variant="caption" color="error" display="block" mt={0.5} maxWidth={160}>
          {errorMsg}
        </Typography>
      )}

      {/* Menú de opciones */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={cerrarMenu}
        slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 200 } } }}
      >
        <MenuItem onClick={() => elegir(inputGaleriaRef)}>
          <ListItemIcon><PhotoLibraryIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Galería</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => elegir(inputTraseraRef)}>
          <ListItemIcon><CameraAltIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Cámara trasera</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => elegir(inputFrontalRef)}>
          <ListItemIcon><FlipCameraIosIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Cámara frontal</ListItemText>
        </MenuItem>
      </Menu>

      {/* Input galería — sin capture para elegir de la galería */}
      <input
        ref={inputGaleriaRef}
        type="file"
        accept={ACCEPT}
        style={{ display: 'none' }}
        onChange={handleSeleccionar}
      />
      {/* Input cámara trasera */}
      <input
        ref={inputTraseraRef}
        type="file"
        accept={ACCEPT}
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleSeleccionar}
      />
      {/* Input cámara frontal */}
      <input
        ref={inputFrontalRef}
        type="file"
        accept={ACCEPT}
        capture="user"
        style={{ display: 'none' }}
        onChange={handleSeleccionar}
      />
    </Box>
  );
}
