// Gestión de inscripciones: listado con filtros, alta por stepper y edición/PDF del formulario dinámico.
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress,
  Divider, FormControl, Grid, IconButton, InputLabel,
  MenuItem, Pagination, Select, Skeleton, Snackbar, TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha }      from '@mui/material/styles';
import AddIcon        from '@mui/icons-material/Add';
import DeleteIcon     from '@mui/icons-material/Delete';
import DownloadIcon   from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { sedesRepository }    from '@/infrastructure/repositories/sedesRepository';
import { useInscripciones }   from '@/application/inscripciones/useInscripciones';
import { useToast } from '@/shared/context/useToast';
import { mensajeErrorApi }    from '@/shared/utils/mensajeErrorApi';
import { exportarExcel }      from '@/shared/utils/exportarExcel';
import { fechaLocalISO }      from '@/shared/utils/fecha';
import usePermisos            from '@/shared/hooks/usePermisos';
import { useValorDiferido }   from '@/shared/hooks/useValorDiferido';
import { COLOR, ESTADOS } from './components/camposUtils';
import { VerFormularioDialog }        from './components/VerFormularioDialog';
import { NuevaInscripcionDialog }     from './components/NuevaInscripcionDialog';

const POR_PAGINA = 18; // llena filas de 1, 2 y 3 tarjetas

const etiquetaEstado = (estado) => ESTADOS.find(e => e.value === estado)?.label ?? estado;

export default function InscripcionesPage() {
  const {
    inscripciones, total, cargando, error, cargar, reemplazarLocal, cambiarEstado, eliminar, listarTodas,
  } = useInscripciones();
  const toastGlobal = useToast();
  const { puedo }   = usePermisos();

  const [filtroProg,     setFiltroProg]     = useState('');
  const [filtroEstado,   setFiltroEstado]   = useState('');
  const [filtroBuscar,   setFiltroBuscar]   = useState('');
  const [programas,      setProgramas]      = useState([]);
  const [nuevaAbierta,   setNuevaAbierta]   = useState(false);
  const [verInscripcion, setVerInscripcion] = useState(null);
  const [cambiandoId,    setCambiandoId]    = useState(null);
  const [toast,          setToast]          = useState('');
  const [pagina,         setPagina]         = useState(1);
  const [exportando,     setExportando]     = useState(false);

  // La búsqueda va al servidor 350 ms después de dejar de escribir
  const buscar = useValorDiferido(filtroBuscar.trim());

  useEffect(() => {
    sedesRepository.listar().then(({ data }) => {
      setProgramas(data.flatMap(s =>
        (s.programas ?? []).map(p => ({ ...p, nombreSede: s.nombre }))
      ));
    }).catch(() => { /* opcional: sin catálogo el filtro de programa queda vacío, el listado sigue funcionando */ });
  }, []);

  const filtros = useMemo(() => ({
    programaId: filtroProg   || undefined,
    estado:     filtroEstado || undefined,
    buscar:     buscar       || undefined,
  }), [filtroProg, filtroEstado, buscar]);

  // Al cambiar un filtro se vuelve a la primera página (ajuste durante el render, sin efecto extra)
  const [filtrosPrevios, setFiltrosPrevios] = useState(filtros);
  if (filtrosPrevios !== filtros) {
    setFiltrosPrevios(filtros);
    setPagina(1);
  }

  const recargar = useCallback(() => {
    cargar({ ...filtros, pagina, porPagina: POR_PAGINA });
  }, [cargar, filtros, pagina]);

  useEffect(() => { recargar(); }, [recargar]);

  const totalPaginas = Math.ceil(total / POR_PAGINA);

  // Exporta TODAS las inscripciones del filtro actual (todas las páginas), no solo las visibles
  const handleExportar = async () => {
    setExportando(true);
    try {
      const todas = await listarTodas(filtros);
      if (!todas.length) { setToast('No hay inscripciones para exportar'); return; }
      const ok = await exportarExcel(`inscripciones_${fechaLocalISO()}`, [{
        nombre: 'Inscripciones',
        filas: [
          ['Beneficiario', 'Documento', 'Programa', 'Sede', 'Estado', 'Fecha de inscripción', 'Observaciones'],
          ...todas.map(i => [
            i.nombreBeneficiario    || '—',
            i.documentoBeneficiario || '—',
            i.nombrePrograma        || '—',
            i.nombreSede            || '—',
            etiquetaEstado(i.estado),
            i.fechaInscripcion ? new Date(i.fechaInscripcion).toLocaleDateString('es-CO') : '—',
            i.observaciones || '',
          ]),
        ],
        cols: [32, 16, 26, 20, 12, 18, 40],
      }]);
      if (ok) setToast(`${todas.length} inscripciones exportadas`);
    } catch (err) {
      toastGlobal(mensajeErrorApi(err, { accion: 'exportar las inscripciones' }), 'error');
    } finally { setExportando(false); }
  };

  const handleCambiarEstado = async (id, estado) => {
    setCambiandoId(id);
    try {
      await cambiarEstado(id, estado);
      setToast('Estado actualizado');
    } catch (err) { toastGlobal(mensajeErrorApi(err, { accion: 'cambiar el estado de la inscripción' }), 'error'); }
    finally  { setCambiandoId(null); }
  };

  const handleEliminar = async (id) => {
    try {
      await eliminar(id);
      setToast('Inscripción eliminada');
      // Si la página quedó vacía se vuelve a la anterior; si no, se recarga para completarla
      if (inscripciones.length === 1 && pagina > 1) setPagina(p => p - 1); else recargar();
    } catch (err) { toastGlobal(mensajeErrorApi(err, { accion: 'eliminar la inscripción' }), 'error'); }
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
          <Typography sx={{ fontWeight: 800, color: COLOR }} variant="h5">Inscripciones</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {puedo('inscripciones', 'ver') && (
            <Tooltip title="Exporta todas las inscripciones que cumplen los filtros actuales">
              <span>
                <Button variant="outlined"
                  startIcon={exportando ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
                  onClick={handleExportar} disabled={exportando || total === 0}
                  sx={{ flexShrink: 0, fontWeight: 700 }}>
                  {exportando ? 'Exportando…' : 'Exportar Excel'}
                </Button>
              </span>
            </Tooltip>
          )}
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => setNuevaAbierta(true)}
            sx={{ bgcolor: COLOR, flexShrink: 0, px: 2.5 }}>
            Nueva inscripción
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* ── Barra de filtros ─────────────────────────────────────── */}
      <Box sx={{
        display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center',
        bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
        borderRadius: 2, p: 2, mb: 3,
      }}>
        <TextField size="small" label="Buscar beneficiario, documento o programa" sx={{ minWidth: 200, flex: 1 }}
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

      {cargando && inscripciones.length === 0 ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, k) => (
            <Grid key={k} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Skeleton variant="rounded" height={210} />
            </Grid>
          ))}
        </Grid>
      ) : inscripciones.length === 0 ? (
        <Alert severity="info">No hay inscripciones que coincidan con los filtros.</Alert>
      ) : (
        <>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
          {total} {total === 1 ? 'inscripción' : 'inscripciones'}
        </Typography>
        <Grid container spacing={2} sx={{ opacity: cargando ? 0.6 : 1, transition: 'opacity .2s' }}>
          {inscripciones.map(i => (
            <Grid key={i.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Box sx={{
                border: '1.5px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden',
                bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', height: '100%',
              }}>
                <Box sx={{ px: 2, pt: 2, pb: 1.5, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: COLOR, width: 44, height: 44, flexShrink: 0, fontWeight: 800 }}>
                    {(i.nombreBeneficiario || '?')[0].toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontWeight: 800, fontSize: '0.95rem' }}>
                      {i.nombreBeneficiario}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', display: 'block' }} variant="caption">
                      {i.documentoBeneficiario ?? 'Sin documento'}
                    </Typography>
                  </Box>
                </Box>

                <Divider />

                <Box sx={{ px: 2, py: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="caption"
                      sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.5, textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: '0.07em' }}>
                      Programa
                    </Typography>
                    <Chip label={i.nombrePrograma} size="small"
                      sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.12), color: COLOR, fontWeight: 600 }} />
                  </Box>
                  <Grid container spacing={1.5}>
                    <Grid size={6}>
                      <Typography variant="caption"
                        sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.5, textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: '0.07em' }}>
                        Sede
                      </Typography>
                      <Typography variant="body2" noWrap>{i.nombreSede}</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption"
                        sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.5, textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: '0.07em' }}>
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
                  borderTop: '1.5px solid', borderTopColor: 'divider',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select value={i.estado} size="small"
                      disabled={cambiandoId === i.id}
                      onChange={e => handleCambiarEstado(i.id, e.target.value)}>
                      {ESTADOS.map(e => <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
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
        {totalPaginas > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination count={totalPaginas} page={pagina} onChange={(_, v) => setPagina(v)} size="small"
              sx={{ '& .Mui-selected': { bgcolor: 'var(--color-primario) !important', color: '#fff' }, '& .MuiPaginationItem-root': { fontWeight: 600 } }}
            />
          </Box>
        )}
        </>
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
            // El diálogo ya guardó en el servidor: solo se refleja en la lista
            reemplazarLocal(updated);
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
