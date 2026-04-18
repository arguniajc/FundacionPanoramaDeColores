import { useRef, useState, useEffect } from 'react';
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
import api from '../services/api';

const ACCEPT_IMG = 'image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif';
const ACCEPT_PDF = 'application/pdf';

function esPdf(buffer) {
  const b = new Uint8Array(buffer.slice(0, 4));
  return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
}

function bufferABase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunks = [];
  for (let i = 0; i < bytes.length; i += 8192)
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
  return btoa(chunks.join(''));
}

async function imagenAArrayBufferPdf(buffer) {
  const { default: jsPDF } = await import('jspdf');
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const b64  = bufferABase64(buffer);
  const tipo = new Uint8Array(buffer.slice(0, 4))[0] === 0x89 ? 'PNG' : 'JPEG';
  const mime = tipo === 'PNG' ? 'image/png' : 'image/jpeg';
  doc.addImage(`data:${mime};base64,${b64}`, tipo, 10, 14, 190, 265);
  return doc.output('arraybuffer');
}

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
 * Props:
 *   value          — URL del PDF guardado (string | null)
 *   onChange       — callback(url: string | null)
 *   beneficiarioId — ID del beneficiario para el log de descarga (string | null)
 */
export default function UploadDocumento({ value, onChange, beneficiarioId }) {
  const inputPdfRef     = useRef(null);
  const inputFrenteRef  = useRef(null);
  const inputReversoRef = useRef(null);
  const generandoRef    = useRef(false);

  // 'ver' | 'elegir' | 'fotografiar' | 'subirPdf'
  const [modo,       setModo]       = useState('ver');
  const [frente,     setFrente]     = useState({ file: null, preview: null });
  const [reverso,    setReverso]    = useState({ file: null, preview: null });
  const [menuEl,     setMenuEl]     = useState({ frente: null, reverso: null });
  const [camara,     setCamara]     = useState({ frente: false, reverso: false });
  const [generando,  setGenerando]  = useState(false);
  const [subiendo,   setSubiendo]   = useState(false);
  const [descargando,setDescargando]= useState(false);
  const [errorMsg,   setErrorMsg]   = useState('');
  const [pdfListo,   setPdfListo]   = useState(false);

  // Reset modo a 'ver' cuando llega un nuevo value desde afuera
  useEffect(() => {
    if (value) { setModo('ver'); setFrente({ file: null, preview: null }); setReverso({ file: null, preview: null }); }
  }, [value]);

  // Auto-generar PDF cuando ambas fotos están listas
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
        const { data } = await api.post('/api/archivos/upload?carpeta=documentos', fd, {
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

  // ── Descarga (registra en BD primero) ───────────────────────────────────────
  const handleDescargar = async () => {
    if (!value) return;
    setDescargando(true);
    try {
      if (beneficiarioId) {
        await api.post('/api/archivos/log-descarga', {
          beneficiarioId,
          tipoArchivo: 'documento',
          urlArchivo:  value,
        }).catch(() => {}); // no bloquear descarga si el log falla
      }
      // Si es imagen antigua, convertir a PDF al vuelo; si ya es PDF, descargar directo
      const resp   = await fetch(value);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const buffer      = await resp.arrayBuffer();
      const finalBuffer = esPdf(buffer) ? buffer : await imagenAArrayBufferPdf(buffer);
      const blob        = new Blob([finalBuffer], { type: 'application/pdf' });
      const url         = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `documento-${beneficiarioId ?? 'beneficiario'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErrorMsg('Error al descargar el PDF.');
    } finally {
      setDescargando(false);
    }
  };

  // ── Subir PDF directamente ───────────────────────────────────────────────────
  const handleSubirPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setSubiendo(true);
    setErrorMsg('');
    try {
      const fd = new FormData();
      fd.append('archivo', file);
      const { data } = await api.post('/api/archivos/upload?carpeta=documentos', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(data.url);
    } catch (err) {
      setErrorMsg(err.response?.data?.mensaje ?? 'Error al subir el PDF.');
    } finally {
      setSubiendo(false);
    }
  };

  // ── Captura de foto (frente / reverso) ──────────────────────────────────────
  const capturarLado = (lado) => (file) => {
    const reader = new FileReader();
    reader.onload = e => {
      if (lado === 'frente') setFrente({ file, preview: e.target.result });
      else                    setReverso({ file, preview: e.target.result });
    };
    reader.readAsDataURL(file);
    onChange(null); setPdfListo(false);
  };

  const handleInputFoto = (lado) => (e) => {
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
    onChange(null); setPdfListo(false);
  };

  const cancelar = () => {
    setModo('ver');
    setFrente({ file: null, preview: null });
    setReverso({ file: null, preview: null });
    setErrorMsg(''); setPdfListo(false);
  };

  // ── Mini-caja de captura (frente o reverso) ──────────────────────────────────
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
        Documento de identidad
      </Typography>

      {/* ── MODO VER ── */}
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
              disabled={descargando}
              startIcon={descargando ? <CircularProgress size={12} color="inherit" /> : <DownloadIcon />}
              sx={{ bgcolor: '#166534', '&:hover': { bgcolor: '#14532d' }, borderRadius: 2, fontSize: 12, fontWeight: 700 }}
            >
              {descargando ? 'Descargando…' : 'Descargar PDF'}
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

      {/* ── MODO SIN PDF ── mostrar opciones directamente */}
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

      {/* ── MODO ELEGIR (reemplazar) ── */}
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

      {/* ── MODO FOTOGRAFIAR ── */}
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

      {/* ── MODO SUBIR PDF ── (el click en el input se dispara automático) */}
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

      {/* Inputs ocultos */}
      <input ref={inputPdfRef} type="file" accept={ACCEPT_PDF} style={{ display: 'none' }} onChange={handleSubirPdf} />
    </Box>
  );
}
