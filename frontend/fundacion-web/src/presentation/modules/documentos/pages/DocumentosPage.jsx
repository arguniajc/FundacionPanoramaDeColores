import { useState, useRef } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Button, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, CircularProgress, Alert, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Autocomplete,
  Tooltip,
} from '@mui/material';
import FolderIcon       from '@mui/icons-material/Folder';
import AddIcon          from '@mui/icons-material/Add';
import DownloadIcon     from '@mui/icons-material/Download';
import DeleteIcon       from '@mui/icons-material/Delete';
import SearchIcon       from '@mui/icons-material/Search';
import UploadFileIcon   from '@mui/icons-material/UploadFile';
import PersonIcon       from '@mui/icons-material/Person';
import CloseIcon        from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

import apiClient from '../../../../infrastructure/http/apiClient';
import { useDocumentosInstitucionales } from '../../../../application/documentos/useDocumentosInstitucionales';
import { useDocumentosBeneficiario }    from '../../../../application/documentos/useDocumentosBeneficiario';

const CATEGORIAS = ['Actas', 'Políticas', 'Formularios', 'Informes', 'Certificados', 'Otros'];

const HEADER_GRADIENT = 'linear-gradient(135deg, #4E1B95, #2D984F)';

function fmt(fecha) {
  return new Date(fecha).toLocaleString('es-CO', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Modal subir documento institucional ──────────────────────────────────────
function ModalSubirInstitucional({ onCerrar, onSubido }) {
  const [titulo,      setTitulo]      = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria,   setCategoria]   = useState('Otros');
  const [archivo,     setArchivo]     = useState(null);
  const [subiendo,    setSubiendo]    = useState(false);
  const [error,       setError]       = useState('');
  const inputRef = useRef();

  const handleSubir = async () => {
    if (!titulo.trim() || !archivo) { setError('El título y el archivo son obligatorios.'); return; }
    setSubiendo(true); setError('');
    try {
      const form = new FormData();
      form.append('archivo', archivo);
      const { data: up } = await apiClient.post('/api/archivos/upload?carpeta=documentos-institucionales', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await onSubido({ titulo: titulo.trim(), descripcion: descripcion.trim() || undefined, categoria, url: up.url, nombreOriginal: archivo.name });
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
        <Box display="flex" alignItems="center" gap={1}><UploadFileIcon /> Subir documento institucional</Box>
        <IconButton onClick={onCerrar} size="small" sx={{ color: 'rgba(255,255,255,0.8)' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ py: 2.5, px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Título *" size="small" fullWidth value={titulo} onChange={e => setTitulo(e.target.value)} />
        <TextField label="Descripción" size="small" fullWidth multiline rows={2} value={descripcion} onChange={e => setDescripcion(e.target.value)} />
        <FormControl size="small" fullWidth>
          <InputLabel>Categoría</InputLabel>
          <Select label="Categoría" value={categoria} onChange={e => setCategoria(e.target.value)}>
            {CATEGORIAS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
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
          <input
            ref={inputRef} type="file" accept="application/pdf" hidden
            onChange={e => { setArchivo(e.target.files[0] || null); setError(''); }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onCerrar} variant="outlined" disabled={subiendo}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubir}
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

// ── Modal subir archivo de beneficiario ──────────────────────────────────────
function ModalSubirArchivoBeneficiario({ beneficiario, onCerrar, onSubido }) {
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
          Beneficiario: <strong>{beneficiario.nombre}</strong>
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
          <input
            ref={inputRef} type="file" accept="application/pdf" hidden
            onChange={e => { setArchivo(e.target.files[0] || null); setError(''); }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onCerrar} variant="outlined" disabled={subiendo}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubir}
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
function TabInstitucionales() {
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [buscar,          setBuscar]          = useState('');
  const [modalAbierto,    setModalAbierto]     = useState(false);

  const { documentos, cargando, error, crear, eliminar } = useDocumentosInstitucionales(categoriaFiltro);

  const filtrados = buscar.trim()
    ? documentos.filter(d => d.titulo?.toLowerCase().includes(buscar.toLowerCase()))
    : documentos;

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={2}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            label="Todos"
            onClick={() => setCategoriaFiltro('')}
            sx={{ fontWeight: 600, bgcolor: categoriaFiltro === '' ? '#4E1B95' : undefined, color: categoriaFiltro === '' ? '#fff' : undefined }}
          />
          {CATEGORIAS.map(c => (
            <Chip
              key={c} label={c}
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
          Subir documento
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
                  <TableCell sx={{ fontWeight: 700, color: '#4E1B95' }}>Título</TableCell>
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
                      <Typography variant="body2" fontWeight={600} sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.titulo}
                      </Typography>
                      {doc.descripcion && (
                        <Typography variant="caption" color="text.secondary">{doc.descripcion}</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Chip label={doc.categoria} size="small" sx={{ bgcolor: '#f0eaff', color: '#4E1B95', fontWeight: 600, fontSize: '0.72rem' }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>
                      {doc.subidoPorEmail}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {fmt(doc.fechaCreacion)}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Descargar">
                        <IconButton size="small" href={doc.url} target="_blank" rel="noopener noreferrer">
                          <DownloadIcon fontSize="small" sx={{ color: '#4E1B95' }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" onClick={() => eliminar(doc.id)}>
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
        <ModalSubirInstitucional onCerrar={() => setModalAbierto(false)} onSubido={crear} />
      )}
    </Box>
  );
}

// ── Tab 2: Por beneficiario ───────────────────────────────────────────────────
function TabPorBeneficiario() {
  const [beneficiario,  setBeneficiario]  = useState(null);
  const [opciones,      setOpciones]      = useState([]);
  const [buscando,      setBuscando]      = useState(false);
  const [modalAbierto,  setModalAbierto]  = useState(false);

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
              slotProps={{ input: { ...params.InputProps, startAdornment: <><PersonIcon fontSize="small" sx={{ mr: 0.5, color: 'text.disabled' }} />{params.InputProps.startAdornment}</> } }}
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
                        <TableCell align="right">
                          <Tooltip title="Descargar">
                            <IconButton size="small" href={a.url} target="_blank" rel="noopener noreferrer">
                              <DownloadIcon fontSize="small" sx={{ color: '#4E1B95' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton size="small" onClick={() => eliminar(a.id, beneficiario.id)}>
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
        />
      )}
    </Box>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function DocumentosPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ background: HEADER_GRADIENT, borderRadius: 3, p: { xs: 2, sm: 3 }, mb: 3, color: 'white' }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <FolderIcon sx={{ fontSize: 32, opacity: 0.85 }} />
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>
              Documentos
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.3 }}>
              Gestión de documentos institucionales y por beneficiario
            </Typography>
          </Box>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 2, '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minWidth: 160 }, '& .Mui-selected': { color: '#4E1B95' }, '& .MuiTabs-indicator': { bgcolor: '#4E1B95' } }}
        >
          <Tab label="Institucionales" />
          <Tab label="Por beneficiario" />
        </Tabs>
      </Paper>

      {tab === 0 && <TabInstitucionales />}
      {tab === 1 && <TabPorBeneficiario />}
    </Box>
  );
}
