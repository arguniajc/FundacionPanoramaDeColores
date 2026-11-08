import { useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, CircularProgress, IconButton,
  Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon            from '@mui/icons-material/Add';
import DeleteIcon         from '@mui/icons-material/Delete';
import DownloadIcon       from '@mui/icons-material/Download';
import EditIcon           from '@mui/icons-material/Edit';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PersonIcon         from '@mui/icons-material/Person';
import VisibilityIcon     from '@mui/icons-material/Visibility';
import apiClient                        from '@/infrastructure/http/apiClient';
import { useDocumentosBeneficiario }    from '@/application/documentos/useDocumentosBeneficiario';
import { mensajeErrorApi }              from '@/shared/utils/mensajeErrorApi';
import { fmt }                          from './helpers';
import { ModalSubirArchivoBeneficiario } from './ModalSubirArchivoBeneficiario';
import { ConfirmarEliminar }             from './ConfirmarEliminar';
import { ModalEditarDocumento }          from './ModalEditarDocumento';
import usePermisos                       from '@/shared/hooks/usePermisos';
import { abrirArchivo } from '@/shared/utils/archivos';

export function TabPorBeneficiario({ onToast }) {
  const [beneficiario, setBeneficiario] = useState(null);
  const [opciones,     setOpciones]     = useState([]);
  const [buscando,     setBuscando]     = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [confirmar,    setConfirmar]    = useState(null);
  const [editando,     setEditando]     = useState(null);
  const puedeEditar = usePermisos().puedo('documentos', 'editar');

  const { archivos, cargando, error, cargar, guardar, editar, eliminar } = useDocumentosBeneficiario();

  const buscarBeneficiarios = async (q) => {
    if (!q || q.length < 2) { setOpciones([]); return; }
    setBuscando(true);
    try {
      const { data } = await apiClient.get('/api/beneficiarios', { params: { buscar: q, porPagina: 10 } });
      setOpciones(data.data ?? []);
    } catch (err) {
      setOpciones([]);
      onToast(mensajeErrorApi(err, { accion: 'buscar beneficiarios' }), 'error');
    }
    finally { setBuscando(false); }
  };

  const seleccionar = (ben) => {
    setBeneficiario(ben);
    if (ben) cargar(ben.id);
    else cargar(null);
  };

  const handleEliminar = async (id) => {
    try {
      await eliminar(id, beneficiario?.id);
      onToast('Documento eliminado', 'success');
    } catch (err) {
      onToast(mensajeErrorApi(err, { accion: 'eliminar el documento' }), 'error');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
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
          <Typography sx={{ color: 'text.secondary' }} variant="body2">
            Busca un beneficiario para ver sus documentos.
          </Typography>
        </Paper>
      ) : (
        <>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            {cargando ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress sx={{ color: 'var(--color-primario-texto)' }} /></Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'superficie2' }}>
                      <TableCell sx={{ fontWeight: 700, color: 'var(--color-primario-texto)' }}>Nombre del archivo</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'var(--color-primario-texto)' }}>Fecha</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'var(--color-primario-texto)' }}>Acciones</TableCell>
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <InsertDriveFileIcon fontSize="small" sx={{ color: 'var(--color-primario-texto)' }} />
                            <Typography sx={{ fontWeight: 600 }} variant="body2">{a.nombreOriginal ?? 'Documento'}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                          {fmt(a.fechaCreacion)}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip title="Ver / Imprimir">
                            <IconButton size="small" onClick={() => abrirArchivo(a.url)}>
                              <VisibilityIcon fontSize="small" sx={{ color: 'var(--color-secundario)' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Descargar">
                            <IconButton size="small" onClick={() => abrirArchivo(a.url)}>
                              <DownloadIcon fontSize="small" sx={{ color: 'var(--color-primario-texto)' }} />
                            </IconButton>
                          </Tooltip>
                          {puedeEditar && (
                            <Tooltip title="Editar nombre">
                              <IconButton size="small" aria-label={`Editar ${a.nombreOriginal ?? 'documento'}`} onClick={() => setEditando(a)}>
                                <EditIcon fontSize="small" sx={{ color: 'var(--color-primario-texto)' }} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Eliminar">
                            <IconButton size="small" onClick={() => setConfirmar({ id: a.id, nombre: a.nombreOriginal ?? 'Documento' })}>
                              <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
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
      {editando && beneficiario && (
        <ModalEditarDocumento documento={editando} conCategoria={false}
          onGuardar={dto => editar(editando.id, beneficiario.id, dto)}
          onCerrar={() => setEditando(null)} onToast={onToast} />
      )}
      {confirmar && (
        <ConfirmarEliminar nombre={confirmar.nombre}
          onConfirmar={() => handleEliminar(confirmar.id)}
          onCerrar={() => setConfirmar(null)} />
      )}
    </Box>
  );
}
