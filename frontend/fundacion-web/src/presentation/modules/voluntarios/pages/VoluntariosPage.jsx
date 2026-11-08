import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, CircularProgress, Grid, IconButton,
  InputAdornment, Snackbar, TextField, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon    from '@mui/icons-material/Add';
import CloseIcon  from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon  from '@mui/icons-material/Assignment';
import AccessTimeIcon  from '@mui/icons-material/AccessTime';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import { voluntariosRepository } from '@/infrastructure/repositories/voluntariosRepository';
import { useConfirm } from '@/shared/components/useConfirm';
import { COLOR }               from './components/helpers';
import { StatCard }            from './components/StatCard';
import { VoluntarioCard }      from './components/VoluntarioCard';
import { VoluntarioDialog }    from './components/VoluntarioDialog';
import { AsignacionesDialog }  from './components/AsignacionesDialog';
import { mensajeErrorApi }     from '@/shared/utils/mensajeErrorApi';
import { exportarExcel }       from '@/shared/utils/exportarExcel';
import { fechaLocalISO }       from '@/shared/utils/fecha';
import usePermisos             from '@/shared/hooks/usePermisos';

const POR_PAGINA_EXPORT = 500;   // máximo que acepta GET /api/voluntarios por página
const soloFecha = f => (f ? String(f).slice(0, 10) : '');

const COLUMNAS_EXPORT = [
  ['Nombre',             v => v.nombre ?? '',            30],
  ['Tipo documento',     v => v.tipoDocumento ?? '',     10],
  ['Documento',          v => v.documento ?? '',         15],
  ['Correo',             v => v.email ?? '',             28],
  ['Teléfono',           v => v.telefono ?? '',          14],
  ['País',               v => v.pais ?? '',              14],
  ['Departamento',       v => v.departamento ?? '',      18],
  ['Ciudad',             v => v.ciudad ?? '',            18],
  ['Profesión',          v => v.profesion ?? '',         22],
  ['Fecha nacimiento',   v => soloFecha(v.fechaNacimiento), 12],
  ['Fecha inicio',       v => soloFecha(v.fechaInicio),  12],
  ['Programas',          v => Number(v.totalProgramas ?? 0), 10],
  ['Horas/semana',       v => Number(v.horasSemanales ?? 0), 12],
  ['Estado',             v => (v.activo ? 'Activo' : 'Inactivo'), 10],
  ['Notas',              v => v.notas ?? '',             40],
];

export default function VoluntariosPage() {
  const confirm = useConfirm();
  const { puedo } = usePermisos();
  const [exportando,  setExportando]  = useState(false);
  const [voluntarios, setVoluntarios] = useState([]);
  const [stats,       setStats]       = useState(null);
  const [cargando,    setCargando]    = useState(false);
  const [buscar,      setBuscar]      = useState('');
  const [dialVol,     setDialVol]     = useState({ open: false, voluntario: null });
  const [dialAsig,    setDialAsig]    = useState({ open: false, voluntario: null });
  const [snack,       setSnack]       = useState({ open: false, msg: '', sev: 'success' });

  const ok  = msg => setSnack({ open: true, msg, sev: 'success' });
  const err = msg => setSnack({ open: true, msg, sev: 'error' });

  const recargarStats = () =>
    voluntariosRepository.stats().then(({ data }) => setStats(data))
      .catch(() => { /* opcional: las tarjetas de resumen no bloquean el listado */ });

  const cargar = useCallback(async (q) => {
    setCargando(true);
    try {
      const { data } = await voluntariosRepository.listar(q ? { buscar: q } : {});
      setVoluntarios(data);
    } catch (e) { err(mensajeErrorApi(e, { accion: 'cargar los voluntarios' })); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); recargarStats(); }, [cargar]);

  useEffect(() => {
    const t = setTimeout(() => cargar(buscar), 280);
    return () => clearTimeout(t);
  }, [buscar, cargar]);

  const handleGuardado = (data, editando) => {
    if (editando) setVoluntarios(prev => prev.map(v => v.id === data.id ? data : v));
    else setVoluntarios(prev => [data, ...prev]);
    setDialVol({ open: false, voluntario: null });
    ok(editando ? 'Voluntario actualizado.' : 'Voluntario creado.');
    recargarStats();
  };

  const handleAsignacionCambio = useCallback(async (id) => {
    try {
      const { data } = await voluntariosRepository.obtener(id);
      setVoluntarios(prev => prev.map(v => v.id === id ? data : v));
    } catch { /* opcional: refresco en segundo plano; la tarjeta se actualiza al recargar */ }
    recargarStats();
  }, []);

  // Exporta todos los voluntarios de la búsqueda actual (no solo los cargados en pantalla)
  const handleExportar = async () => {
    setExportando(true);
    try {
      const todos = [];
      for (let pagina = 1; pagina <= 100; pagina++) {   // tope de seguridad: 50.000 registros
        const params = { pagina, porPagina: POR_PAGINA_EXPORT, ...(buscar ? { buscar } : {}) };
        const { data } = await voluntariosRepository.listar(params);
        const lote = Array.isArray(data) ? data : [];
        todos.push(...lote);
        if (lote.length < POR_PAGINA_EXPORT) break;
      }
      if (todos.length === 0) { err('No hay voluntarios para exportar con la búsqueda actual.'); return; }
      const generado = await exportarExcel(`voluntarios_${fechaLocalISO()}`, [{
        nombre: 'Voluntarios',
        filas:  [COLUMNAS_EXPORT.map(([t]) => t), ...todos.map(v => COLUMNAS_EXPORT.map(([, valor]) => valor(v)))],
        cols:   COLUMNAS_EXPORT.map(([, , ancho]) => ancho),
      }]);
      if (generado) ok(`${todos.length} voluntario${todos.length !== 1 ? 's' : ''} exportado${todos.length !== 1 ? 's' : ''}.`);
    } catch (e) { err(mensajeErrorApi(e, { accion: 'exportar los voluntarios' })); }
    finally { setExportando(false); }
  };

  const handleEliminar = async (v) => {
    if (!await confirm(`¿Eliminar a "${v.nombre}"? Si tiene asignaciones quedará inactivo.`)) return;
    try {
      await voluntariosRepository.eliminar(v.id);
      setVoluntarios(prev => prev.filter(x => x.id !== v.id));
      ok('Voluntario eliminado.');
      recargarStats();
    } catch (e) { err(mensajeErrorApi(e, { accion: 'eliminar el voluntario' })); }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box sx={{ width: 4, height: 26, borderRadius: 1, bgcolor: COLOR }} />
            <Typography sx={{ fontWeight: 800 }} variant="h5">Voluntarios</Typography>
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', pl: 0.5 }}>
            Personas que dedican su tiempo a la fundación
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {puedo('voluntarios', 'exportar') && (
            <Button variant="outlined" onClick={handleExportar} disabled={exportando}
              startIcon={exportando ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
              sx={{ fontWeight: 700, borderRadius: 2 }}>
              {exportando ? 'Exportando…' : 'Exportar Excel'}
            </Button>
          )}
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => setDialVol({ open: true, voluntario: null })}
            sx={{ bgcolor: COLOR, fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: 'primary.dark' } }}>
            Nuevo voluntario
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<PeopleIcon />}     label="Total voluntarios"    value={stats?.totalVoluntarios ?? '—'}               color={COLOR}     loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<PersonIcon />}     label="Nuevos este mes"      value={stats?.nuevosEsteMes ?? '—'}                  color="success.main" loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<AssignmentIcon />} label="Programas cubiertos"  value={stats?.programasCubiertos ?? '—'}             color="warning.main" loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<AccessTimeIcon />} label="Horas/semana (total)" value={stats ? `${stats.totalHorasSemanales}h` : '—'} color="info.main" loading={!stats} />
        </Grid>
      </Grid>

      <Box sx={{ mb: 2.5 }}>
        <TextField slotProps={{ input: {
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment>,
            endAdornment: buscar
              ? <InputAdornment position="end"><IconButton size="small" onClick={() => setBuscar('')}><CloseIcon fontSize="small" /></IconButton></InputAdornment>
              : null,
          } }} size="small" placeholder="Buscar por nombre, documento, email o profesión…"
          value={buscar} onChange={e => setBuscar(e.target.value)}
          sx={{ width: { xs: '100%', sm: 380 } }} />
      </Box>

      {cargando && voluntarios.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
      ) : voluntarios.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center', border: '1.5px dashed', borderColor: (t) => alpha(t.palette.primary.main, 0.15), borderRadius: 2, bgcolor: (t) => alpha(t.palette.primary.main, 0.04) }}>
          <PeopleIcon sx={{ fontSize: 48, color: 'primary.light', mb: 1.5 }} />
          <Typography sx={{ fontWeight: 700, color: 'text.secondary' }}>
            {buscar ? 'No se encontraron voluntarios' : 'No hay voluntarios registrados'}
          </Typography>
          {!buscar && (
            <Button variant="contained" startIcon={<AddIcon />}
              sx={{ mt: 2, bgcolor: COLOR, fontWeight: 700 }}
              onClick={() => setDialVol({ open: true, voluntario: null })}>
              Registrar primer voluntario
            </Button>
          )}
        </Box>
      ) : (
        <Grid sx={{ alignItems: 'stretch' }} container spacing={2}>
          {voluntarios.map(v => (
            <Grid key={v.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <VoluntarioCard voluntario={v}
                onEditar={x => setDialVol({ open: true, voluntario: x })}
                onEliminar={handleEliminar}
                onAsignaciones={x => setDialAsig({ open: true, voluntario: x })} />
            </Grid>
          ))}
        </Grid>
      )}

      <VoluntarioDialog
        open={dialVol.open} voluntario={dialVol.voluntario}
        onClose={() => setDialVol({ open: false, voluntario: null })}
        onGuardado={handleGuardado} />

      <AsignacionesDialog
        open={dialAsig.open} voluntario={dialAsig.voluntario}
        onClose={() => setDialAsig({ open: false, voluntario: null })}
        onCambio={handleAsignacionCambio} />

      <Snackbar open={snack.open} autoHideDuration={3500}
        onClose={() => setSnack(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(p => ({ ...p, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
