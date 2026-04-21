// Sube el documento de identidad del beneficiario.
// Tres modos: ver PDF guardado, subir PDF directo, o fotografiar frente+reverso (genera PDF con jsPDF).
// Props: value (URL guardada), onChange(url), beneficiarioId (para log de descarga).
import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, CircularProgress, IconButton, Tooltip,
  Menu, MenuItem, ListItemIcon, ListItemText, Button,
} from '@mui/material';
import PhotoLibraryIcon  from '@mui/icons-material/PhotoLibrary';
import CameraAltIcon     from '@mui/icons-material/CameraAlt';
import DeleteIcon        from '@mui/icons-material/Delete';
import PictureAsPdfIcon  from '@mui/icons-material/PictureAsPdf';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import DownloadIcon      from '@mui/icons-material/Download';
import UploadFileIcon    from '@mui/icons-material/UploadFile';
import CamaraFoto        from './CamaraFoto';
import apiClient         from '../../infrastructure/http/apiClient';

const ACCEPT_IMG = 'image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif';
const ACCEPT_PDF = 'application/pdf';

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

export default function UploadDocumento({ value, onChange, beneficiarioId }) {
  const inputPdfRef     = useRef(null);
  const inputFrenteRef  = useRef(null);
  const inputReversoRef = useRef(null);
  const generandoRef    = useRef(false);
  const onChangeRef     = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const [modo,        setModo]        = useState('ver');
  const [frente,      setFrente]      = useState({ file: null, preview: null });
  const [reverso,     setReverso]     = useState({ file: null, preview: null });
  const [menuEl,      setMenuEl]      = useState({ frente: null, reverso: null });
  const [camara,      setCamara]      = useState({ frente: false, reverso: false });
  const [generando,   setGenerando]   = useState(false);
  const [subiendo,    setSubiendo]    = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [errorMsg,    setErrorMsg]    = useState('');
  const [pdfListo,    setPdfListo]    = useState(false);

  useEffect(() => {
    if (value) { setModo('ver'); setFrente({ file: null, preview: null }); setReverso({ file: null, preview: null }); }
  }, [value]);

  useEffect(() => {
    if (!frente.file || !reverso.file || generandoRef.current) return;
    generandoRef.current = true;
    setPdfListo(false);
    setGenerando(true);
    setErrorMsg('');
    (async () => {
      try {
        const fUrl    = frente.preview  ?? await toDataUrl(frente.file);
        const rUrl    = reverso.preview ?? await toDataUrl(reverso.file);
        const pdfBlob = await crearPdf(fUrl, rUrl);
        const fd      = new FormData();
        fd.append('archivo', new File([pdfBlob], `documento-${Date.now()}.pdf`, { type: 'application/pdf' }));
        const { data } = await apiClient.post('/api/archivos/upload?carpeta=documentos', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        onChangeRef.current(data.url);
        setPdfListo(true);
      } catch (err) {
        setErrorMsg(err.response?.data?.mensaje ?? 'Error al generar el PDF.');
      } finally {
        setGenerando(false);
        generandoRef.current = false;
      }
    })();
  }, [frente.file, reverso.file]);

  const handleDescargar = async () => {
    if (!value || descargando) return;
    setDescargando(true);
    try {
      if (beneficiarioId) {
        await apiClient.post('/api/archivos/log-descarga', {
          beneficiarioId,
          tipoArchivo: 'documento',
          urlArchivo:  value,
        }).catch(() => {});
      }
      const anchor    = document.createElement('a');
      anchor.href     = value;
      anchor.download = `documento-${beneficiarioId ?? 'beneficiario'}.pdf`;
      anchor.target   = '_blank';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch {
      setErrorMsg('Error al descargar el PDF.');
    } finally {
      setDescargando(false);
    }
  };

  const handleSubirPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setSubiendo(true);
    setErrorMsg('');
    try {
      const fd = new FormData();
      fd.append('archivo', file);
      const { data } = await apiClient.post('/api/archivos/upload?carpeta=documentos', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(data.url);
    } catch (err) {
      setErrorMsg(err.response?.data?.mensaje ?? 'Error al subir el PDF.');
    } finally {
      setSubiendo(false);
    }
  };

  const capturarLado = useCallback((lado) => (file) => {
    const reader = new FileReader();
    reader.onload = e => {
      if (lado === 'frente') setFrente({ file, preview: e.target.result });
      else                    setReverso({ file, preview: e.target.result });
    };
    reader.readAsDataURL(file);
    onChangeRef.current(null); setPdfListo(false);
  }, []);

  const handleInputFoto = useCallback((lado) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    capturarLado(lado)(file);
  }, [capturarLado]);

  const handleCamara = useCallback((lado) => (file) => {
    setCamara(prev => ({ ...prev, [lado]: false }));
    capturarLado(lado)(file);
  }, [capturarLado]);

  const eliminarLado = useCallback((lado) => () => {
    if (lado === 'frente') setFrente({ file: null, preview: null });
    else                    setReverso({ file: null, preview: null });
    onChangeRef.current(null); setPdfListo(false);
  }, []);

  const cancelar = useCallback(() => {
    setModo('ver');
    setFrente({ file: null, preview: null });
    setReverso({ file: null, preview: null });
    setErrorMsg(''); setPdfListo(false);
  }, []);

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
              component="img" src={estado.preview} alt={label}
              onClick={(e) => setMenuEl(prev => ({ ...prev, [lado]: e.currentTarget }))}
              sx={{ width: 110, height: 82, objectFit: 'cover', borderRadius: 2, border: '2px solid #e0e0e0', display: 'block', cursor: 'pointer' }}
            />
            <Tooltip title="Eliminar">
              <IconButton size="small" onClick={eliminarLado(lado)}
                sx={{ position: 'absolute', top: -8, right: -8, bgcolor: '#d32f2f', color: '#fff', width: 22, height: 22, '&:hover': { bgcolor: '#b71c1c' } }}>
                <DeleteIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
            <Box component="button" type="button"
              onClick={(e) => setMenuEl(prev => ({ ...prev, [lado]: e.currentTarget }))}
              sx={{ mt: 0.5, display: 'block', width: '100%', fontSize: 11, color: '#4E1B95', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', p: 0 }}>
              Cambiar
            </Box>
          </Box>
        ) : (
          <Box component="button" type="button"
            onClick={(e) => setMenuEl(prev => ({ ...prev, [lado]: e.currentTarget }))}
            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 110, height: 82, border: '2px dashed #bdbdbd', borderRadius: 2, bgcolor: '#fafafa', cursor: 'pointer', transition: 'border-color .2s, background .2s', '&:hover': { borderColor: '#4E1B95', bgcolor: '#f3effe' }, gap: 0.5, p: 0 }}>
            <CameraAltIcon sx={{ color: '#bdbdbd', fontSize: 26 }} />
            <Typography variant="caption" color="text.disabled" fontSize={10}>{label}</Typography>
          </Box>
        )}
        <Menu anchorEl={menuEl[lado]} open={Boolean(menuEl[lado])} onClose={() => setMenuEl(prev => ({ ...prev, [lado]: null }))}
          slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 160 } } }}>
          <MenuItem onClick={() => { setMenuEl(prev => ({ ...prev, [lado]: null })); inputRef.current?.click(); }}>
            <ListItemIcon><PhotoLibraryIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Galería</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setMenuEl(prev => ({ ...prev, [lado]: null })); setCamara(prev => ({ ...prev, [lado]: true })); }}>
            <ListItemIcon><CameraAltIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Cámara</ListItemText>
          </MenuItem>
        </Menu>
        <input ref={inputRef} type="file" accept={ACCEPT_IMG} style={{ display: 'none' }} onChange={handleInputFoto(lado)} />
        <CamaraFoto open={camara[lado]} onCerrar={() => setCamara(prev => ({ ...prev, [lado]: false }))} onCaptura={handleCamara(lado)} />
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
        Documento de identidad
      </Typography>

      {modo === 'ver' && value && (
        <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PictureAsPdfIcon sx={{ color: '#16a34a', fontSize: 28, flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontSize={12} fontWeight={700} color="#166534">PDF guardado</Typography>
              <Typography fontSize={11} color="text.secondary">
                Documento de identidad (frente y reverso)
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
            <Button
              size="small" variant="contained"
              onClick={handleDescargar}
              sx={{
                bgcolor: '#166534', '&:hover': { bgcolor: '#14532d' },
                borderRadius: 2, fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: '5px',
              }}
            >
              {descargando
                ? <><CircularProgress size={12} sx={{ color: '#fff' }} /> Descargando…</>
                : <><DownloadIcon sx={{ fontSize: 14 }} /> Descargar PDF</>
              }
            </Button>
            <Button
              size="small" variant="outlined"
              onClick={() => setModo('elegir')}
              sx={{ borderColor: '#4E1B95', color: '#4E1B95', borderRadius: 2, fontSize: 12 }}
            >
              Reemplazar
            </Button>
          </Box>
        </Box>
      )}

      {modo === 'ver' && !value && (
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Box component="button" type="button"
            onClick={() => { setModo('subirPdf'); setTimeout(() => inputPdfRef.current?.click(), 50); }}
            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 130, height: 90, border: '2px dashed #bdbdbd', borderRadius: 2, bgcolor: '#fafafa', cursor: 'pointer', gap: 0.5, p: 0, transition: 'border-color .2s, background .2s', '&:hover': { borderColor: '#4E1B95', bgcolor: '#f3effe' } }}>
            <UploadFileIcon sx={{ color: '#bdbdbd', fontSize: 28 }} />
            <Typography variant="caption" color="text.disabled" fontSize={10}>Subir PDF</Typography>
          </Box>
          <Box component="button" type="button"
            onClick={() => setModo('fotografiar')}
            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 130, height: 90, border: '2px dashed #bdbdbd', borderRadius: 2, bgcolor: '#fafafa', cursor: 'pointer', gap: 0.5, p: 0, transition: 'border-color .2s, background .2s', '&:hover': { borderColor: '#4E1B95', bgcolor: '#f3effe' } }}>
            <CameraAltIcon sx={{ color: '#bdbdbd', fontSize: 28 }} />
            <Typography variant="caption" color="text.disabled" fontSize={10} textAlign="center">Fotografiar{'\n'}frente y reverso</Typography>
          </Box>
        </Box>
      )}

      {modo === 'elegir' && (
        <Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
            <Box component="button" type="button"
              onClick={() => { setModo('subirPdf'); setTimeout(() => inputPdfRef.current?.click(), 50); }}
              sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 130, height: 80, border: '2px dashed #4E1B95', borderRadius: 2, bgcolor: '#f3effe', cursor: 'pointer', gap: 0.5, p: 0 }}>
              <UploadFileIcon sx={{ color: '#4E1B95', fontSize: 26 }} />
              <Typography variant="caption" color="#4E1B95" fontSize={10} fontWeight={600}>Subir PDF</Typography>
            </Box>
            <Box component="button" type="button"
              onClick={() => setModo('fotografiar')}
              sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 130, height: 80, border: '2px dashed #4E1B95', borderRadius: 2, bgcolor: '#f3effe', cursor: 'pointer', gap: 0.5, p: 0 }}>
              <CameraAltIcon sx={{ color: '#4E1B95', fontSize: 26 }} />
              <Typography variant="caption" color="#4E1B95" fontSize={10} fontWeight={600} textAlign="center">Fotografiar{'\n'}frente y reverso</Typography>
            </Box>
          </Box>
          <Button size="small" onClick={cancelar} sx={{ color: 'text.secondary', fontSize: 11 }}>
            Cancelar
          </Button>
        </Box>
      )}

      {modo === 'fotografiar' && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
            <LadoBox lado="frente"  label="Frente"  inputRef={inputFrenteRef} />
            <LadoBox lado="reverso" label="Reverso" inputRef={inputReversoRef} />
          </Box>
          {generando && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <CircularProgress size={14} sx={{ color: '#4E1B95' }} />
              <Typography fontSize={12} color="text.secondary">Generando PDF…</Typography>
            </Box>
          )}
          {!generando && pdfListo && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
              <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 16 }} />
              <Typography fontSize={12} color="#166534" fontWeight={600}>PDF generado correctamente</Typography>
            </Box>
          )}
          {!pdfListo && !generando && (
            <Button size="small" onClick={cancelar} sx={{ mt: 0.5, color: 'text.secondary', fontSize: 11 }}>
              Cancelar
            </Button>
          )}
        </Box>
      )}

      {modo === 'subirPdf' && (
        <Box>
          {subiendo ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} sx={{ color: '#4E1B95' }} />
              <Typography fontSize={12} color="text.secondary">Subiendo PDF…</Typography>
            </Box>
          ) : (
            <Button size="small" onClick={cancelar} sx={{ color: 'text.secondary', fontSize: 11 }}>
              Cancelar
            </Button>
          )}
        </Box>
      )}

      {errorMsg && (
        <Typography variant="caption" color="error" display="block" mt={0.5}>
          {errorMsg}
        </Typography>
      )}

      <input ref={inputPdfRef} type="file" accept={ACCEPT_PDF} style={{ display: 'none' }} onChange={handleSubirPdf} />
    </Box>
  );
}
