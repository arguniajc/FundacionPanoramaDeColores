// Gestión de inscripciones: listado con filtros, alta por stepper y edición/PDF del formulario dinámico.
import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress,
  Divider, FormControl, Grid, IconButton, InputLabel,
  MenuItem, Select, Snackbar, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon        from '@mui/icons-material/Add';
import DeleteIcon     from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { sedesRepository }    from '@/infrastructure/repositories/sedesRepository';
import { useInscripciones }   from '@/application/inscripciones/useInscripciones';
import { COLOR, ESTADOS, chipEstado } from './components/campos';
import { VerFormularioDialog }        from './components/VerFormularioDialog';
import { NuevaInscripcionDialog }     from './components/NuevaInscripcionDialog';

export default function InscripcionesPage() {
  const { inscripciones, cargando, error, cargar, actualizar, cambiarEstado, eliminar } = useInscripciones();

  const [filtroProg,     setFiltroProg]     = useState('');
  const [filtroEstado,   setFiltroEstado]   = useState('');
  const [filtroBuscar,   setFiltroBuscar]   = useState('');
  const [programas,      setProgramas]      = useState([]);
  const [nuevaAbierta,   setNuevaAbierta]   = useState(false);
  const [verInscripcion, setVerInscripcion] = useState(null);
  const [cambiandoId,    setCambiandoId]    = useState(null);
  const [toast,          setToast]          = useState('');

  useEffect(() => {
    sedesRepository.listar().then(({ data }) => {
      setProgramas(data.flatMap(s =>
        (s.programas ?? []).map(p => ({ ...p, nombreSede: s.nombre }))
      ));
    }).catch(() => {});
  }, []);

  const recargar = useCallback(() => {
    cargar({ programaId: filtroProg || undefined, estado: filtroEstado || undefined });
  }, [cargar, filtroProg, filtroEstado]);

  useEffect(() => { recargar(); }, [recargar]);

  const filtradas = inscripciones.filter(i => {
    if (filtroBuscar) {
      const q = filtroBuscar.toLowerCase();
      if (!i.nombreBeneficiario?.toLowerCase().includes(q) &&
          !i.documentoBeneficiario?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleCambiarEstado = async (id, estado) => {
    setCambiandoId(id);
    try {
      await cambiarEstado(id, estado);
      setToast('Estado actualizado');
    } catch { setToast('Error al cambiar estado'); }
    finally  { setCambiandoId(null); }
  };

  const handleEliminar = async (id) => {
    try {
      await eliminar(id);
      setToast('Inscripción eliminada');
    } catch { setToast('Error al eliminar'); }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>

      {/* ── Cabecera ─────────────────────────────────────────────── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 2, mb: 4,
      }}>
        <Box>
          <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary',
            textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.5 }}>
            Módulo
          </Typography>
          <Typography variant="h5" fontWeight={800} color={COLOR}>Inscripciones</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => setNuevaAbierta(true)}
          sx={{ bgcolor: COLOR, flexShrink: 0, px: 2.5 }}>
          Nueva inscripción
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* ── Barra de filtros ─────────────────────────────────────── */}
      <Box sx={{
        display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center',
        bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
        borderRadius: 2, p: 2, mb: 3,
      }}>
        <TextField size="small" label="Buscar beneficiario" sx={{ minWidth: 200, flex: 1 }}
          value={filtroBuscar} onChange={e => setFiltroBuscar(e.target.value)} />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Programa</InputLabel>
          <Select label="Programa" value={filtroProg}
            onChange={e => setFiltroProg(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            {programas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Estado</InputLabel>
          <Select label="Estado" value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            {ESTADOS.map(e => <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {cargando ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress sx={{ color: COLOR }} />
        </Box>
      ) : filtradas.length === 0 ? (
        <Alert severity="info">No hay inscripciones que coincidan con los filtros.</Alert>
      ) : (
        <Grid container spacing={2}>
          {filtradas.map(i => (
            <Grid key={i.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Box sx={{
                border: '1.5px solid #e2d9f3', borderRadius: 2, overflow: 'hidden',
                bgcolor: '#fdfbff', display: 'flex', flexDirection: 'column', height: '100%',
              }}>
                <Box sx={{ px: 2, pt: 2, pb: 1.5, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: COLOR, width: 44, height: 44, flexShrink: 0, fontWeight: 800 }}>
                    {(i.nombreBeneficiario || '?')[0].toUpperCase()}
                  </Avatar>
                  <Box minWidth={0} flex={1}>
                    <Typography fontWeight={800} noWrap sx={{ fontSize: '0.95rem' }}>
                      {i.nombreBeneficiario}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {i.documentoBeneficiario ?? 'Sin documento'}
                    </Typography>
                  </Box>
                </Box>

                <Divider />

                <Box sx={{ px: 2, py: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}
                      sx={{ textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: '0.07em' }}>
                      Programa
                    </Typography>
                    <Chip label={i.nombrePrograma} size="small"
                      sx={{ bgcolor: '#ede7f6', color: COLOR, fontWeight: 600 }} />
                  </Box>
                  <Grid container spacing={1.5}>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}
                        sx={{ textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: '0.07em' }}>
                        Sede
                      </Typography>
                      <Typography variant="body2" noWrap>{i.nombreSede}</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}
                        sx={{ textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: '0.07em' }}>
                        Inscripción
                      </Typography>
                      <Typography variant="body2">
                        {new Date(i.fechaInscripcion).toLocaleDateString('es-CO')}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                <Box sx={{
                  px: 2, py: 1.5,
                  bgcolor: 'rgba(78,27,149,0.04)',
                  borderTop: '1.5px solid #e2d9f3',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select value={i.estado} size="small"
                      disabled={cambiandoId === i.id}
                      onChange={e => handleCambiarEstado(i.id, e.target.value)}>
                      {ESTADOS.map(e => <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <Box display="flex" gap={0.5}>
                    <Tooltip title="Ver / Editar formulario">
                      <IconButton size="small" onClick={() => setVerInscripcion(i)}>
                        <VisibilityIcon fontSize="small" sx={{ color: COLOR }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar inscripción">
                      <IconButton size="small" onClick={() => handleEliminar(i.id)}>
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      {nuevaAbierta && (
        <NuevaInscripcionDialog
          onCerrar={() => setNuevaAbierta(false)}
          onCreada={(ins) => {
            setNuevaAbierta(false);
            setToast(`${ins.nombreBeneficiario} inscrito en ${ins.nombrePrograma}`);
            recargar();
          }}
        />
      )}

      {verInscripcion && (
        <VerFormularioDialog
          inscripcion={verInscripcion}
          onCerrar={() => setVerInscripcion(null)}
          onActualizada={(updated) => {
            actualizar(verInscripcion.id, { datos: updated.datos, observaciones: updated.observaciones });
            setVerInscripcion(updated);
            setToast('Formulario actualizado');
          }}
        />
      )}

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}
