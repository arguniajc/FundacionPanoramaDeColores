import { useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, CircularProgress, IconButton,
  Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon            from '@mui/icons-material/Add';
import DeleteIcon         from '@mui/icons-material/Delete';
import DownloadIcon       from '@mui/icons-material/Download';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PersonIcon         from '@mui/icons-material/Person';
import VisibilityIcon     from '@mui/icons-material/Visibility';
import apiClient                        from '@/infrastructure/http/apiClient';
import { useDocumentosBeneficiario }    from '@/application/documentos/useDocumentosBeneficiario';
import { fmt }                          from './helpers';
import { ModalSubirArchivoBeneficiario } from './ModalSubirArchivoBeneficiario';
import { ConfirmarEliminar }             from './ConfirmarEliminar';

export function TabPorBeneficiario({ onToast }) {
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
        <Autocomplete sx={{ width: { xs: '100%', sm: 380 } }}
          options={opciones}
          getOptionLabel={o => o.nombreMenor ?? o.nombre ?? ''}
          loading={buscando} value={beneficiario}
          onChange={(_, v) => seleccionar(v)}
          onInputChange={(_, v) => buscarBeneficiarios(v)}
          noOptionsText="Sin resultados" loadingText="Buscando…"
          renderInput={(params) => (
            <TextField {...params} size="small" label="Buscar beneficiario" placeholder="Escribe el nombre…" />
          )} />
        {beneficiario && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalAbierto(true)}
            sx={{ bgcolor: 'var(--color-primario)', '&:hover': { bgcolor: 'var(--color-gradiente)' }, fontWeight: 700, height: 40 }}>
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
              <Box display="flex" justifyContent="center" py={5}><CircularProgress sx={{ color: 'var(--color-primario)' }} /></Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#fdfbff' }}>
                      <TableCell sx={{ fontWeight: 700, color: 'var(--color-primario)' }}>Nombre del archivo</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'var(--color-primario)' }}>Fecha</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'var(--color-primario)' }}>Acciones</TableCell>
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
                            <InsertDriveFileIcon fontSize="small" sx={{ color: 'var(--color-primario)' }} />
                            <Typography variant="body2" fontWeight={600}>{a.nombreOriginal ?? 'Documento'}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                          {fmt(a.fechaCreacion)}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip title="Ver / Imprimir">
                            <IconButton size="small" onClick={() => window.open(a.url, '_blank', 'noopener,noreferrer')}>
                              <VisibilityIcon fontSize="small" sx={{ color: 'var(--color-secundario)' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Descargar">
                            <IconButton size="small" component="a" href={a.url} target="_blank" rel="noopener noreferrer">
                              <DownloadIcon fontSize="small" sx={{ color: 'var(--color-primario)' }} />
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
          onToast={onToast} />
      )}
      {confirmar && (
        <ConfirmarEliminar nombre={confirmar.nombre}
          onConfirmar={() => handleEliminar(confirmar.id)}
          onCerrar={() => setConfirmar(null)} />
      )}
    </Box>
  );
}
