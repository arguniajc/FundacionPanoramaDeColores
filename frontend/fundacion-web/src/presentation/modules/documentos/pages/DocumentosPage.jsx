import { useState, useRef, useCallback, useMemo } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Button, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, CircularProgress, Alert, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Autocomplete,
  Tooltip, Snackbar, LinearProgress,
} from '@mui/material';
import MuiAlert           from '@mui/material/Alert';
import FolderIcon         from '@mui/icons-material/Folder';
import AddIcon            from '@mui/icons-material/Add';
import DownloadIcon       from '@mui/icons-material/Download';
import DeleteIcon         from '@mui/icons-material/Delete';
import SearchIcon         from '@mui/icons-material/Search';
import UploadFileIcon     from '@mui/icons-material/UploadFile';
import PersonIcon         from '@mui/icons-material/Person';
import CloseIcon          from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import WarningAmberIcon   from '@mui/icons-material/WarningAmber';
import VisibilityIcon     from '@mui/icons-material/Visibility';

import apiClient from '../../../../infrastructure/http/apiClient';
import { useDocumentosInstitucionales } from '../../../../application/documentos/useDocumentosInstitucionales';
import { useDocumentosBeneficiario }    from '../../../../application/documentos/useDocumentosBeneficiario';

const CATEGORIAS    = ['Actas', 'Políticas', 'Formularios', 'Informes', 'Certificados', 'Otros'];
const HEADER_GRADIENT = 'linear-gradient(135deg, #4E1B95, #2D984F)';

function fmt(fecha) {
  return new Date(fecha).toLocaleString('es-CO', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function sinExtension(nombre) {
  return nombre?.replace(/\.[^/.]+$/, '') ?? nombre;
}

// ── Hook toast ───────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });
  const show  = useCallback((msg, severity = 'success') => setToast({ open: true, msg, severity }), []);
  const close = useCallback(() => setToast(t => ({ ...t, open: false })), []);
  return { toast, show, close };
}

// ── Snackbar global ──────────────────────────────────────────────────────────
function ToastGlobal({ toast, onClose }) {
  return (
    <Snackbar
      open={toast.open}
      autoHideDuration={3500}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <MuiAlert onClose={onClose} severity={toast.severity} variant="filled" sx={{ width: '100%', borderRadius: 2 }}>
        {toast.msg}
      </MuiAlert>
    </Snackbar>
  );
}

// ── Confirmación antes de eliminar ───────────────────────────────────────────
function ConfirmarEliminar({ nombre, onConfirmar, onCerrar }) {
  const [eliminando, setEliminando] = useState(false);
  const handleConfirmar = async () => {
    setEliminando(true);
    await onConfirmar();
    onCerrar();
  };
  return (
    <Dialog open onClose={onCerrar} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 3, pb: 1 }}>
        <WarningAmberIcon sx={{ color: '#d32f2f', fontSize: 28 }} />
        <Typography fontWeight={700} fontSize="1.05rem">Eliminar documento</Typography>
      </DialogTitle>
      <DialogContent sx={{ pb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          ¿Estás seguro de que quieres eliminar{' '}
          <strong style={{ color: '#111' }}>{nombre}</strong>?
          Esta acción no se puede deshacer.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onCerrar} variant="outlined" disabled={eliminando}>Cancelar</Button>
        <Button
          variant="contained" onClick={handleConfirmar} disabled={eliminando}
          startIcon={eliminando ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' }, fontWeight: 700, minWidth: 120 }}
        >
          {eliminando ? 'Eliminando…' : 'Eliminar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


// ── Modal subir múltiples documentos institucionales ─────────────────────────
function ModalSubirInstitucional({ onCerrar, onSubido, onToast }) {
  const [categoria,  setCategoria]  = useState('Otros');
  const [archivos,   setArchivos]   = useState([]); // array de File
  const [subiendo,   setSubiendo]   = useState(false);
  const [progreso,   setProgreso]   = useState(0);  // 0-100
  const [error,      setError]      = useState('');
  const inputRef = useRef();

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
        const form = new FormData();
        form.append('archivo', file);
        const { data: up } = await apiClient.post(
          '/api/archivos/upload?carpeta=documentos-institucionales', form,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        await onSubido({
          titulo: sinExtension(file.name),
          categoria,
          url: up.url,
          nombreOriginal: file.name,
        });
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
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
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

        <Box
          onClick={() => inputRef.current.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); agregarArchivos(e.dataTransfer.files); }}
          sx={{
            border: '2px dashed', borderColor: archivos.length ? '#4E1B95' : 'divider',
            borderRadius: 2, p: 2.5, textAlign: 'center', cursor: 'pointer',
            bgcolor: archivos.length ? '#f5f0ff' : 'transparent',
            '&:hover': { borderColor: '#4E1B95', bgcolor: '#f5f0ff' },
          }}
        >
          <InsertDriveFileIcon sx={{ fontSize: 36, color: archivos.length ? '#4E1B95' : 'text.disabled', mb: 0.5 }} />
          <Typography variant="body2" color={archivos.length ? '#4E1B95' : 'text.secondary'} fontWeight={600}>
            {archivos.length
              ? `${archivos.length} archivo${archivos.length > 1 ? 's' : ''} seleccionado${archivos.length > 1 ? 's' : ''}`
              : 'Haz clic o arrastra PDFs aquí (máx. 10 MB c/u)'}
          </Typography>
          {archivos.length === 0 && (
            <Typography variant="caption" color="text.disabled">Puedes seleccionar varios a la vez</Typography>
          )}
          <input
            ref={inputRef} type="file" accept="application/pdf" multiple hidden
            onChange={e => agregarArchivos(e.target.files)}
          />
        </Box>

        {archivos.length > 0 && (
          <Box sx={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {archivos.map(f => (
              <Box key={f.name} display="flex" alignItems="center" justifyContent="space-between"
                sx={{ bgcolor: '#f5f0ff', borderRadius: 1, px: 1.5, py: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#4E1B95', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>
                  {f.name}
                </Typography>
                <IconButton size="small" onClick={() => quitarArchivo(f.name)} disabled={subiendo}>
                  <CloseIcon sx={{ fontSize: 14, color: '#4E1B95' }} />
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
            <LinearProgress variant="determinate" value={progreso} sx={{ borderRadius: 1, '& .MuiLinearProgress-bar': { bgcolor: '#4E1B95' } }} />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onCerrar} variant="outlined" disabled={subiendo}>Cancelar</Button>
        <Button
          variant="contained" onClick={handleSubir}
          disabled={subiendo || archivos.length === 0}
          startIcon={subiendo ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
          sx={{ bgcolor: '#4E1B95', '&:hover': { bgcolor: '#3a1470' }, fontWeight: 700, minWidth: 140 }}
        >
          {subiendo ? `Subiendo ${progreso}%` : `Subir ${archivos.length > 1 ? `${archivos.length} archivos` : 'archivo'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Modal subir archivo de beneficiario ──────────────────────────────────────
function ModalSubirArchivoBeneficiario({ beneficiario, onCerrar, onSubido, onToast }) {
  const [titulo,   setTitulo]   = useState('');
  const [archivo,  setArchivo]  = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error,    setError]    = useState('');
  const inputRef = useRef();

  const handleSubir = async () => {
    if (!titulo.trim() || !archivo) { setError('El nombre y el archivo son obligatorios.'); return; }
    setSubiendo(true); setError('');
    try {
      const form = new FormData();
      form.append('archivo', archivo);
      const { data: up } = await apiClient.post(
        `/api/archivos/upload?carpeta=documentos-beneficiarios/${beneficiario.id}`,
        form, { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      await onSubido({ titulo: titulo.trim(), url: up.url, nombreOriginal: archivo.name });
      onToast('Documento subido correctamente', 'success');
      onCerrar();
    } catch (e) {
      setError(e.response?.data?.mensaje ?? 'Error al subir el archivo.');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ background: HEADER_GRADIENT, color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={1}><UploadFileIcon /> Subir documento</Box>
        <IconButton onClick={onCerrar} size="small" sx={{ color: 'rgba(255,255,255,0.8)' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ py: 2.5, px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <Typography variant="body2" color="text.secondary">
          Beneficiario: <strong>{beneficiario.nombreMenor ?? beneficiario.nombre}</strong>
        </Typography>
        <TextField label="Nombre del documento *" size="small" fullWidth value={titulo} onChange={e => setTitulo(e.target.value)} />
        <Box
          onClick={() => inputRef.current.click()}
          sx={{
            border: '2px dashed', borderColor: archivo ? '#4E1B95' : 'divider',
            borderRadius: 2, p: 2.5, textAlign: 'center', cursor: 'pointer',
            bgcolor: archivo ? '#f5f0ff' : 'transparent',
            '&:hover': { borderColor: '#4E1B95', bgcolor: '#f5f0ff' },
          }}
        >
          <InsertDriveFileIcon sx={{ fontSize: 36, color: archivo ? '#4E1B95' : 'text.disabled', mb: 0.5 }} />
          <Typography variant="body2" color={archivo ? '#4E1B95' : 'text.secondary'} fontWeight={archivo ? 600 : 400}>
            {archivo ? archivo.name : 'Haz clic para seleccionar un PDF (máx. 10 MB)'}
          </Typography>
          <input ref={inputRef} type="file" accept="application/pdf" hidden
            onChange={e => { setArchivo(e.target.files[0] || null); setError(''); }} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onCerrar} variant="outlined" disabled={subiendo}>Cancelar</Button>
        <Button
          variant="contained" onClick={handleSubir}
          disabled={subiendo || !titulo.trim() || !archivo}
          startIcon={subiendo ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
          sx={{ bgcolor: '#4E1B95', '&:hover': { bgcolor: '#3a1470' }, fontWeight: 700, minWidth: 140 }}
        >
          {subiendo ? 'Subiendo…' : 'Subir documento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Tab 1: Institucionales ────────────────────────────────────────────────────
function TabInstitucionales({ onToast }) {
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [buscar,          setBuscar]          = useState('');
  const [modalAbierto,    setModalAbierto]     = useState(false);
  const [confirmar,       setConfirmar]        = useState(null);

  const { documentos, cargando, error, crear, eliminar } = useDocumentosInstitucionales();

  const conteo = useMemo(() => {
    const m = {};
    CATEGORIAS.forEach(c => { m[c] = 0; });
    documentos.forEach(d => { if (m[d.categoria] !== undefined) m[d.categoria]++; });
    return m;
  }, [documentos]);

  const filtrados = useMemo(() => {
    let lista = categoriaFiltro ? documentos.filter(d => d.categoria === categoriaFiltro) : documentos;
    if (buscar.trim()) lista = lista.filter(d => d.titulo?.toLowerCase().includes(buscar.toLowerCase()));
    return lista;
  }, [documentos, categoriaFiltro, buscar]);

  const handleEliminar = async (id) => {
    await eliminar(id);
    onToast('Documento eliminado', 'success');
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={2}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            label={`Todos (${documentos.length})`}
            onClick={() => setCategoriaFiltro('')}
            sx={{ fontWeight: 600, bgcolor: categoriaFiltro === '' ? '#4E1B95' : undefined, color: categoriaFiltro === '' ? '#fff' : undefined }}
          />
          {CATEGORIAS.map(c => (
            <Chip
              key={c}
              label={`${c}${conteo[c] > 0 ? ` (${conteo[c]})` : ''}`}
              onClick={() => setCategoriaFiltro(prev => prev === c ? '' : c)}
              sx={{ fontWeight: 600, bgcolor: categoriaFiltro === c ? '#4E1B95' : undefined, color: categoriaFiltro === c ? '#fff' : undefined }}
            />
          ))}
        </Stack>
        <Button
          variant="contained" startIcon={<AddIcon />}
          onClick={() => setModalAbierto(true)}
          sx={{ bgcolor: '#4E1B95', '&:hover': { bgcolor: '#3a1470' }, fontWeight: 700 }}
        >
          Subir documentos
        </Button>
      </Box>

      <TextField
        size="small" placeholder="Buscar por título…" value={buscar}
        onChange={e => setBuscar(e.target.value)}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        sx={{ mb: 2, width: { xs: '100%', sm: 320 } }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        {cargando ? (
          <Box display="flex" justifyContent="center" py={5}><CircularProgress sx={{ color: '#4E1B95' }} /></Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fdfbff' }}>
                  <TableCell sx={{ fontWeight: 700, color: '#4E1B95' }}>Título / Descripción</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#4E1B95', display: { xs: 'none', sm: 'table-cell' } }}>Categoría</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#4E1B95', display: { xs: 'none', md: 'table-cell' } }}>Subido por</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#4E1B95' }}>Fecha</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#4E1B95' }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      No hay documentos todavía.
                    </TableCell>
                  </TableRow>
                ) : filtrados.map(doc => (
                  <TableRow key={doc.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}
                        sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.titulo}
                      </Typography>
                      {doc.descripcion && (
                        <Tooltip
                          title={doc.descripcion.length > 60 ? doc.descripcion : ''}
                          arrow placement="top"
                        >
                          <Typography variant="caption" color="text.secondary"
                            sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', cursor: doc.descripcion.length > 60 ? 'help' : 'default' }}>
                            {doc.descripcion.length > 60 ? `${doc.descripcion.slice(0, 60)}…` : doc.descripcion}
                          </Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Chip label={doc.categoria} size="small"
                        sx={{ bgcolor: '#f0eaff', color: '#4E1B95', fontWeight: 600, fontSize: '0.72rem' }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>
                      {doc.subidoPorEmail}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {fmt(doc.fechaCreacion)}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="Ver / Imprimir">
                        <IconButton size="small" onClick={() => window.open(doc.url, '_blank', 'noopener,noreferrer')}>
                          <VisibilityIcon fontSize="small" sx={{ color: '#2D984F' }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Descargar">
                        <IconButton size="small" component="a" href={doc.url} target="_blank" rel="noopener noreferrer">
                          <DownloadIcon fontSize="small" sx={{ color: '#4E1B95' }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" onClick={() => setConfirmar({ id: doc.id, nombre: doc.titulo })}>
                          <DeleteIcon fontSize="small" sx={{ color: '#d32f2f' }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {modalAbierto && (
        <ModalSubirInstitucional
          onCerrar={() => setModalAbierto(false)}
          onSubido={crear}
          onToast={onToast}
        />
      )}
      {confirmar && (
        <ConfirmarEliminar
          nombre={confirmar.nombre}
          onConfirmar={() => handleEliminar(confirmar.id)}
          onCerrar={() => setConfirmar(null)}
        />
      )}
    </Box>
  );
}

// ── Tab 2: Por beneficiario ───────────────────────────────────────────────────
function TabPorBeneficiario({ onToast }) {
  const [beneficiario, setBeneficiario] = useState(null);
  const [opciones,     setOpciones]     = useState([]);
  const [buscando,     setBuscando]     = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [confirmar,    setConfirmar]    = useState(null);

  const { archivos, cargando, error, cargar, guardar, eliminar } = useDocumentosBeneficiario();

  const buscarBeneficiarios = async (q) => {
    if (!q || q.length < 2) { setOpciones([]); return; }
    setBuscando(true);
    try {
      const { data } = await apiClient.get('/api/beneficiarios', { params: { buscar: q, porPagina: 10 } });
      setOpciones(data.data ?? []);
    } catch { /* ignorar */ }
    finally { setBuscando(false); }
  };

  const seleccionar = (ben) => {
    setBeneficiario(ben);
    if (ben) cargar(ben.id);
    else cargar(null);
  };

  const handleEliminar = async (id) => {
    await eliminar(id, beneficiario?.id);
    onToast('Documento eliminado', 'success');
  };

  return (
    <Box>
      <Box display="flex" alignItems="flex-start" flexWrap="wrap" gap={2} mb={2}>
        <Autocomplete
          sx={{ width: { xs: '100%', sm: 380 } }}
          options={opciones}
          getOptionLabel={o => o.nombreMenor ?? o.nombre ?? ''}
          loading={buscando}
          value={beneficiario}
          onChange={(_, v) => seleccionar(v)}
          onInputChange={(_, v) => buscarBeneficiarios(v)}
          noOptionsText="Sin resultados"
          loadingText="Buscando…"
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              label="Buscar beneficiario"
              placeholder="Escribe el nombre…"
            />
          )}
        />
        {beneficiario && (
          <Button
            variant="contained" startIcon={<AddIcon />}
            onClick={() => setModalAbierto(true)}
            sx={{ bgcolor: '#4E1B95', '&:hover': { bgcolor: '#3a1470' }, fontWeight: 700, height: 40 }}
          >
            Subir documento
          </Button>
        )}
      </Box>

      {!beneficiario ? (
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, py: 6, textAlign: 'center' }}>
          <PersonIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Busca un beneficiario para ver sus documentos.
          </Typography>
        </Paper>
      ) : (
        <>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            {cargando ? (
              <Box display="flex" justifyContent="center" py={5}><CircularProgress sx={{ color: '#4E1B95' }} /></Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#fdfbff' }}>
                      <TableCell sx={{ fontWeight: 700, color: '#4E1B95' }}>Nombre del archivo</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#4E1B95' }}>Fecha</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#4E1B95' }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {archivos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                          Este beneficiario no tiene documentos adicionales.
                        </TableCell>
                      </TableRow>
                    ) : archivos.map(a => (
                      <TableRow key={a.id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <InsertDriveFileIcon fontSize="small" sx={{ color: '#4E1B95' }} />
                            <Typography variant="body2" fontWeight={600}>{a.nombreOriginal ?? 'Documento'}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                          {fmt(a.fechaCreacion)}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip title="Ver / Imprimir">
                            <IconButton size="small" onClick={() => window.open(a.url, '_blank', 'noopener,noreferrer')}>
                              <VisibilityIcon fontSize="small" sx={{ color: '#2D984F' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Descargar">
                            <IconButton size="small" component="a" href={a.url} target="_blank" rel="noopener noreferrer">
                              <DownloadIcon fontSize="small" sx={{ color: '#4E1B95' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton size="small" onClick={() => setConfirmar({ id: a.id, nombre: a.nombreOriginal ?? 'Documento' })}>
                              <DeleteIcon fontSize="small" sx={{ color: '#d32f2f' }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </>
      )}

      {modalAbierto && beneficiario && (
        <ModalSubirArchivoBeneficiario
          beneficiario={beneficiario}
          onCerrar={() => setModalAbierto(false)}
          onSubido={(dto) => guardar(beneficiario.id, dto)}
          onToast={onToast}
        />
      )}
      {confirmar && (
        <ConfirmarEliminar
          nombre={confirmar.nombre}
          onConfirmar={() => handleEliminar(confirmar.id)}
          onCerrar={() => setConfirmar(null)}
        />
      )}
    </Box>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function DocumentosPage() {
  const [tabValue, setTabValue] = useState(0);
  const { toast, show: showToast, close: closeToast } = useToast();

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ background: HEADER_GRADIENT, borderRadius: 3, p: { xs: 2, sm: 3 }, mb: 3, color: 'white' }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <FolderIcon sx={{ fontSize: 32, opacity: 0.85 }} />
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>Documentos</Typography>
            <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.3 }}>
              Gestión de documentos institucionales y por beneficiario
            </Typography>
          </Box>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{ px: 2, '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minWidth: 160 }, '& .Mui-selected': { color: '#4E1B95' }, '& .MuiTabs-indicator': { bgcolor: '#4E1B95' } }}
        >
          <Tab label="Institucionales" />
          <Tab label="Por beneficiario" />
        </Tabs>
      </Paper>

      {tabValue === 0 && <TabInstitucionales onToast={showToast} />}
      {tabValue === 1 && <TabPorBeneficiario onToast={showToast} />}

      <ToastGlobal toast={toast} onClose={closeToast} />
    </Box>
  );
}
