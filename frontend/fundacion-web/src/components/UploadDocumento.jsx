import { useRef, useState, useEffect } from 'react';
import {
  Box, Typography, CircularProgress, IconButton, Tooltip,
  Menu, MenuItem, ListItemIcon, ListItemText, Link,
} from '@mui/material';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import CameraAltIcon    from '@mui/icons-material/CameraAlt';
import DeleteIcon       from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import CamaraFoto       from './CamaraFoto';
import api from '../services/api';

const ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif';

const toDataUrl = file => new Promise(resolve => {
  const r = new FileReader();
  r.onload = e => resolve(e.target.result);
  r.readAsDataURL(file);
});

async function crearPdf(frenteDataUrl, reversoDataUrl) {
  const { default: jsPDF } = await import('jspdf');
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297, m = 14;
  const imgW = W - m * 2;
  const imgH = H / 2 - m * 2.8;

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Frente del documento', m, m + 4);
  doc.addImage(frenteDataUrl, 'JPEG', m, m + 8, imgW, imgH);

  doc.text('Reverso del documento', m, H / 2 + m * 0.5);
  doc.addImage(reversoDataUrl, 'JPEG', m, H / 2 + m * 0.5 + 4, imgW, imgH);

  return doc.output('blob');
}

/**
 * Captura frente y reverso de un documento, genera un PDF y lo sube.
 * Props: value (URL del PDF guardado), onChange(url)
 */
export default function UploadDocumento({ value, onChange }) {
  const inputFrenteRef  = useRef(null);
  const inputReversoRef = useRef(null);
  const generandoRef    = useRef(false);

  const [frente,    setFrente]    = useState({ file: null, preview: null });
  const [reverso,   setReverso]   = useState({ file: null, preview: null });
  const [menuEl,    setMenuEl]    = useState({ frente: null, reverso: null });
  const [camara,    setCamara]    = useState({ frente: false, reverso: false });
  const [generando, setGenerando] = useState(false);
  const [errorMsg,  setErrorMsg]  = useState('');
  const [pdfListo,  setPdfListo]  = useState(false);

  // Auto-generar PDF cuando ambos lados están listos
  useEffect(() => {
    if (!frente.file || !reverso.file || generandoRef.current) return;
    generandoRef.current = true;
    setPdfListo(false);
    setGenerando(true);
    setErrorMsg('');

    (async () => {
      try {
        const fUrl   = frente.preview  ?? await toDataUrl(frente.file);
        const rUrl   = reverso.preview ?? await toDataUrl(reverso.file);
        const pdfBlob = await crearPdf(fUrl, rUrl);
        const formData = new FormData();
        formData.append('archivo', new File([pdfBlob], `documento-${Date.now()}.pdf`, { type: 'application/pdf' }));
        const { data } = await api.post('/api/archivos/upload?carpeta=documentos', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        onChange(data.url);
        setPdfListo(true);
      } catch (err) {
        setErrorMsg(err.response?.data?.mensaje ?? 'Error al generar el PDF.');
      } finally {
        setGenerando(false);
        generandoRef.current = false;
      }
    })();
  }, [frente.file, reverso.file]); // eslint-disable-line react-hooks/exhaustive-deps

  const capturarLado = (lado) => (file) => {
    const reader = new FileReader();
    reader.onload = e => {
      if (lado === 'frente') setFrente({ file, preview: e.target.result });
      else                    setReverso({ file, preview: e.target.result });
    };
    reader.readAsDataURL(file);
    onChange(null);
    setPdfListo(false);
  };

  const handleInput = (lado, ref) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    capturarLado(lado)(file);
  };

  const handleCamara = (lado) => (file) => {
    setCamara(prev => ({ ...prev, [lado]: false }));
    capturarLado(lado)(file);
  };

  const eliminarLado = (lado) => () => {
    if (lado === 'frente') setFrente({ file: null, preview: null });
    else                    setReverso({ file: null, preview: null });
    onChange(null);
    setPdfListo(false);
  };

  const reemplazar = () => {
    setFrente({ file: null, preview: null });
    setReverso({ file: null, preview: null });
    onChange(null);
    setPdfListo(false);
  };

  const LadoBox = ({ lado, label, inputRef }) => {
    const estado = lado === 'frente' ? frente : reverso;
    return (
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
          {label}
        </Typography>
        {estado.preview ? (
          <Box sx={{ position: 'relative', display: 'inline-block' }}>
            <Box
              component="img"
              src={estado.preview}
              alt={label}
              onClick={(e) => setMenuEl(prev => ({ ...prev, [lado]: e.currentTarget }))}
              sx={{
                width: 120, height: 90, objectFit: 'cover',
                borderRadius: 2, border: '2px solid #e0e0e0',
                display: 'block', cursor: 'pointer',
              }}
            />
            <Tooltip title="Eliminar">
              <IconButton
                size="small"
                onClick={eliminarLado(lado)}
                sx={{
                  position: 'absolute', top: -8, right: -8,
                  bgcolor: '#d32f2f', color: '#fff', width: 22, height: 22,
                  '&:hover': { bgcolor: '#b71c1c' },
                }}
              >
                <DeleteIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
            <Box
              component="button" type="button"
              onClick={(e) => setMenuEl(prev => ({ ...prev, [lado]: e.currentTarget }))}
              sx={{
                mt: 0.5, display: 'block', width: '100%',
                fontSize: 11, color: '#4E1B95', background: 'none',
                border: 'none', cursor: 'pointer', textDecoration: 'underline', p: 0,
              }}
            >
              Cambiar
            </Box>
          </Box>
        ) : (
          <Box
            component="button" type="button"
            onClick={(e) => setMenuEl(prev => ({ ...prev, [lado]: e.currentTarget }))}
            sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              width: 120, height: 90, border: '2px dashed #bdbdbd', borderRadius: 2,
              bgcolor: '#fafafa', cursor: 'pointer',
              transition: 'border-color .2s, background .2s',
              '&:hover': { borderColor: '#4E1B95', bgcolor: '#f3effe' },
              gap: 0.5, p: 0,
            }}
          >
            <CameraAltIcon sx={{ color: '#bdbdbd', fontSize: 28 }} />
            <Typography variant="caption" color="text.disabled" fontSize={10}>
              {label}
            </Typography>
          </Box>
        )}

        <Menu
          anchorEl={menuEl[lado]}
          open={Boolean(menuEl[lado])}
          onClose={() => setMenuEl(prev => ({ ...prev, [lado]: null }))}
          slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 170 } } }}
        >
          <MenuItem onClick={() => { setMenuEl(prev => ({ ...prev, [lado]: null })); inputRef.current?.click(); }}>
            <ListItemIcon><PhotoLibraryIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Galería</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setMenuEl(prev => ({ ...prev, [lado]: null })); setCamara(prev => ({ ...prev, [lado]: true })); }}>
            <ListItemIcon><CameraAltIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Cámara</ListItemText>
          </MenuItem>
        </Menu>

        <input ref={inputRef} type="file" accept={ACCEPT} style={{ display: 'none' }} onChange={handleInput(lado, inputRef)} />
        <CamaraFoto
          open={camara[lado]}
          onCerrar={() => setCamara(prev => ({ ...prev, [lado]: false }))}
          onCaptura={handleCamara(lado)}
        />
      </Box>
    );
  };

  const tienePdfGuardado = Boolean(value) && !frente.file && !reverso.file;

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
        Documento de identidad
      </Typography>

      {/* PDF guardado */}
      {tienePdfGuardado && (
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2,
          border: '1px solid #bbf7d0', mb: 1,
        }}>
          <PictureAsPdfIcon sx={{ color: '#16a34a', fontSize: 24, flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography fontSize={12} fontWeight={700} color="#166534">PDF guardado</Typography>
            <Link href={value} download target="_blank" rel="noopener" fontSize={11} color="#4E1B95">
              Descargar PDF
            </Link>
          </Box>
          <Box
            component="button" type="button"
            onClick={reemplazar}
            sx={{
              ml: 'auto', fontSize: 11, color: '#4E1B95', background: 'none',
              border: 'none', cursor: 'pointer', textDecoration: 'underline',
              p: 0, flexShrink: 0,
            }}
          >
            Reemplazar
          </Box>
        </Box>
      )}

      {/* Captura frente y reverso */}
      {!tienePdfGuardado && (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <LadoBox lado="frente"  label="Frente"  inputRef={inputFrenteRef} />
          <LadoBox lado="reverso" label="Reverso" inputRef={inputReversoRef} />
        </Box>
      )}

      {/* Estado de generación */}
      {generando && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
          <CircularProgress size={14} sx={{ color: '#4E1B95' }} />
          <Typography fontSize={12} color="text.secondary">Generando PDF con ambas caras…</Typography>
        </Box>
      )}
      {!generando && pdfListo && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
          <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 16 }} />
          <Typography fontSize={12} color="#166534" fontWeight={600}>PDF generado y guardado</Typography>
        </Box>
      )}
      {errorMsg && (
        <Typography variant="caption" color="error" display="block" mt={0.5}>
          {errorMsg}
        </Typography>
      )}
    </Box>
  );
}
