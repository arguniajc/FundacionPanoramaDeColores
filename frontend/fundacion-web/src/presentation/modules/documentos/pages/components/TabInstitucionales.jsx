import { useState, useMemo } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, IconButton, InputAdornment,
  Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon        from '@mui/icons-material/Add';
import DeleteIcon     from '@mui/icons-material/Delete';
import DownloadIcon   from '@mui/icons-material/Download';
import SearchIcon     from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useDocumentosInstitucionales } from '@/application/documentos/useDocumentosInstitucionales';
import { CATEGORIAS, fmt }              from './helpers';
import { ModalSubirInstitucional }      from './ModalSubirInstitucional';
import { ConfirmarEliminar }            from './ConfirmarEliminar';

export function TabInstitucionales({ onToast }) {
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [buscar,          setBuscar]          = useState('');
  const [modalAbierto,    setModalAbierto]    = useState(false);
  const [confirmar,       setConfirmar]       = useState(null);

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
          <Chip label={`Todos (${documentos.length})`} onClick={() => setCategoriaFiltro('')}
            sx={{ fontWeight: 600, bgcolor: categoriaFiltro === '' ? 'var(--color-primario)' : undefined, color: categoriaFiltro === '' ? '#fff' : undefined }} />
          {CATEGORIAS.map(c => (
            <Chip key={c}
              label={`${c}${conteo[c] > 0 ? ` (${conteo[c]})` : ''}`}
              onClick={() => setCategoriaFiltro(prev => prev === c ? '' : c)}
              sx={{ fontWeight: 600, bgcolor: categoriaFiltro === c ? 'var(--color-primario)' : undefined, color: categoriaFiltro === c ? '#fff' : undefined }} />
          ))}
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalAbierto(true)}
          sx={{ bgcolor: 'var(--color-primario)', '&:hover': { bgcolor: 'var(--color-gradiente)' }, fontWeight: 700 }}>
          Subir documentos
        </Button>
      </Box>

      <TextField size="small" placeholder="Buscar por título…" value={buscar}
        onChange={e => setBuscar(e.target.value)}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        sx={{ mb: 2, width: { xs: '100%', sm: 320 } }} />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        {cargando ? (
          <Box display="flex" justifyContent="center" py={5}><CircularProgress sx={{ color: 'var(--color-primario)' }} /></Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fdfbff' }}>
                  <TableCell sx={{ fontWeight: 700, color: 'var(--color-primario)' }}>Título / Descripción</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'var(--color-primario)', display: { xs: 'none', sm: 'table-cell' } }}>Categoría</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'var(--color-primario)', display: { xs: 'none', md: 'table-cell' } }}>Subido por</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'var(--color-primario)' }}>Fecha</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'var(--color-primario)' }}>Acciones</TableCell>
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
                        <Tooltip title={doc.descripcion.length > 60 ? doc.descripcion : ''} arrow placement="top">
                          <Typography variant="caption" color="text.secondary"
                            sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', cursor: doc.descripcion.length > 60 ? 'help' : 'default' }}>
                            {doc.descripcion.length > 60 ? `${doc.descripcion.slice(0, 60)}…` : doc.descripcion}
                          </Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Chip label={doc.categoria} size="small"
                        sx={{ bgcolor: '#f0eaff', color: 'var(--color-primario)', fontWeight: 600, fontSize: '0.72rem' }} />
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
                          <VisibilityIcon fontSize="small" sx={{ color: 'var(--color-secundario)' }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Descargar">
                        <IconButton size="small" component="a" href={doc.url} target="_blank" rel="noopener noreferrer">
                          <DownloadIcon fontSize="small" sx={{ color: 'var(--color-primario)' }} />
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
        <ModalSubirInstitucional onCerrar={() => setModalAbierto(false)} onSubido={crear} onToast={onToast} />
      )}
      {confirmar && (
        <ConfirmarEliminar nombre={confirmar.nombre}
          onConfirmar={() => handleEliminar(confirmar.id)}
          onCerrar={() => setConfirmar(null)} />
      )}
    </Box>
  );
}
