import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Container,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Chip, TextField, InputAdornment, Pagination,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Tooltip, Button, Snackbar, Tabs, Tab,
  Divider, Stack, LinearProgress, useMediaQuery, useTheme,
} from '@mui/material';
import SearchIcon           from '@mui/icons-material/Search';
import DeleteIcon           from '@mui/icons-material/Delete';
import VisibilityIcon       from '@mui/icons-material/Visibility';
import EditIcon             from '@mui/icons-material/Edit';
import DownloadIcon         from '@mui/icons-material/Download';
import BlockIcon            from '@mui/icons-material/Block';
import CheckCircleIcon      from '@mui/icons-material/CheckCircle';
import PeopleIcon           from '@mui/icons-material/People';
import VerifiedUserIcon     from '@mui/icons-material/VerifiedUser';
import PersonOffIcon        from '@mui/icons-material/PersonOff';
import LockIcon             from '@mui/icons-material/Lock';
import WhatsAppIcon         from '@mui/icons-material/WhatsApp';
import WarningAmberIcon     from '@mui/icons-material/WarningAmber';
import AssignmentLateIcon   from '@mui/icons-material/AssignmentLate';
import BarChartIcon         from '@mui/icons-material/BarChart';
import CloseIcon            from '@mui/icons-material/Close';
import * as XLSX from 'xlsx';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SyncIcon      from '@mui/icons-material/Sync';
import api              from '../../services/api';
import DetalleInscripcion  from './DetalleInscripcion';
import EditarInscripcion   from './EditarInscripcion';
import NuevoBeneficiario   from './NuevoBeneficiario';

// ── Caché en sessionStorage ───────────────────────────────────────────────────
const CACHE_PREFIX = 'ben_';
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutos

function cacheKey(estado, pagina, buscar) {
  return `${CACHE_PREFIX}${estado}_${pagina}_${buscar ?? ''}`;
}
function leerCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, total, ts } = JSON.parse(raw);
    return Date.now() - ts < CACHE_TTL_MS ? { data, total } : null;
  } catch { return null; }
}
function escribirCache(key, data, total) {
  try { sessionStorage.setItem(key, JSON.stringify({ data, total, ts: Date.now() })); }
  catch { /* sessionStorage llena */ }
}
export function limpiarCache() {
  Object.keys(sessionStorage).filter(k => k.startsWith(CACHE_PREFIX))
    .forEach(k => sessionStorage.removeItem(k));
}

const POR_PAGINA = 15;

/* ── StatCard del banner ────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, color }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 },
      bgcolor: 'rgba(255,255,255,0.12)', borderRadius: 2,
      px: { xs: 1.5, sm: 2.5 }, py: { xs: 1, sm: 1.5 },
      border: '1px solid rgba(255,255,255,0.18)',
      minWidth: { xs: 0, sm: 130 }, flex: { xs: 1, sm: 'none' },
    }}>
      <Box sx={{ color, fontSize: { xs: '1.2rem', sm: '1.6rem' }, lineHeight: 1, display: 'flex', flexShrink: 0 }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' }, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: { xs: '0.6rem', sm: '0.68rem' }, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

/* ── Barra de estadística ───────────────────────────────────────────────────── */
function BaraStat({ label, count, total, color = '#4E1B95', icon }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <Box sx={{ mb: 1.2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
          {icon && <Box sx={{ color, display: 'flex', fontSize: '1rem' }}>{icon}</Box>}
          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>{label}</Typography>
        </Box>
        <Typography variant="caption" fontWeight={700} sx={{ color, minWidth: 60, textAlign: 'right' }}>
          {count} <Typography component="span" variant="caption" color="text.secondary">/ {total}</Typography>
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 8, borderRadius: 4,
          bgcolor: 'rgba(0,0,0,0.06)',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
        }}
      />
    </Box>
  );
}

/* ── Card contenedor para el modal de estadísticas ──────────────────────────── */
function StatSection({ title, children }) {
  return (
    <Paper elevation={0} sx={{
      p: { xs: 2, sm: 2.5 },
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 3,
      height: '100%',
    }}>
      <Typography variant="subtitle2" fontWeight={700} color="#4E1B95"
        sx={{ mb: 1.8, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 0.7 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

/* ── Modal de estadísticas detalladas ───────────────────────────────────────── */
function ModalEstadisticas({ open, onClose, stats, cargando }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const renderBarras = (items, maxVal, color) =>
    items.map(({ key, val }) => (
      <Box key={key} sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
          <Typography variant="caption" fontWeight={600}>{key}</Typography>
          <Typography variant="caption" fontWeight={700} color={color}>{val}</Typography>
        </Box>
        <Box sx={{ bgcolor: 'rgba(0,0,0,0.06)', borderRadius: 4, height: 10, overflow: 'hidden' }}>
          <Box sx={{
            height: '100%', borderRadius: 4,
            width: `${maxVal > 0 ? (val / maxVal) * 100 : 0}%`,
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            transition: 'width 0.6s ease',
            minWidth: val > 0 ? 8 : 0,
          }} />
        </Box>
      </Box>
    ));

  const content = () => {
    if (cargando) return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8, gap: 2 }}>
        <CircularProgress size={32} sx={{ color: '#4E1B95' }} />
        <Typography color="text.secondary">Calculando estadísticas…</Typography>
      </Box>
    );
    if (!stats) return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">No hay estadísticas disponibles.</Typography>
      </Box>
    );

    const { total, activos, baja, conAlergia,
            sinDocumento, sinEps, sinWhatsapp, sinDireccion, sinTallas, sinFoto,
            porEdad, porMes, topCamisa, topZapatos, topPantalon } = stats;

    const edadItems = Object.entries(porEdad || {}).map(([k, v]) => ({ key: k, val: v }));
    const maxEdad = Math.max(...edadItems.map(i => i.val), 1);

    const mesItems = Object.entries(porMes || {}).map(([k, v]) => ({ key: k, val: v }));
    const maxMes = Math.max(...mesItems.map(i => i.val), 1);

    const topCamisaItems = (topCamisa || []).map(t => ({ key: `Talla ${t.talla}`, val: t.cantidad }));
    const topZapatosItems = (topZapatos || []).map(t => ({ key: `Talla ${t.talla}`, val: t.cantidad }));
    const topPantalonItems = (topPantalon || []).map(t => ({ key: `Talla ${t.talla}`, val: t.cantidad }));
    const maxCamisa = Math.max(...topCamisaItems.map(i => i.val), 1);
    const maxZapatos = Math.max(...topZapatosItems.map(i => i.val), 1);
    const maxPantalon = Math.max(...topPantalonItems.map(i => i.val), 1);

    return (
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
        gap: { xs: 2, sm: 2.5 },
        p: { xs: 2, sm: 3 },
      }}>

        {/* ── Resumen general ── */}
        <StatSection title="📊 Resumen general">
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1 }}>
            {[
              { label: 'Total',   val: total,    bg: '#ede7f6', color: '#4E1B95' },
              { label: 'Activos', val: activos,  bg: '#e8f5e9', color: '#2e7d32' },
              { label: 'En baja', val: baja,     bg: '#fce4ec', color: '#c62828' },
              { label: 'Alergias',val: conAlergia,bg:'#fff3e0', color: '#e65100' },
            ].map(({ label, val, bg, color }) => (
              <Box key={label} sx={{ bgcolor: bg, borderRadius: 2, p: 1.2, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color, lineHeight: 1 }}>{val}</Typography>
                <Typography sx={{ fontSize: '0.7rem', color, fontWeight: 600, mt: 0.3 }}>{label}</Typography>
              </Box>
            ))}
          </Box>
        </StatSection>

        {/* ── Distribución por edad ── */}
        <StatSection title="👶 Distribución por edad">
          {renderBarras(edadItems, maxEdad, '#4E1B95')}
        </StatSection>

        {/* ── Datos faltantes ── */}
        <StatSection title="📋 Datos por completar">
          <BaraStat label="Sin n° documento"       count={sinDocumento}  total={total} color="#c62828" icon={<AssignmentLateIcon fontSize="inherit" />} />
          <BaraStat label="Sin EPS"                count={sinEps}        total={total} color="#e65100" />
          <BaraStat label="Sin WhatsApp"           count={sinWhatsapp}   total={total} color="#f57c00" icon={<WhatsAppIcon fontSize="inherit" />} />
          <BaraStat label="Sin dirección"          count={sinDireccion}  total={total} color="#795548" />
          <BaraStat label="Tallas incompletas"     count={sinTallas}     total={total} color="#5c6bc0" />
          <BaraStat label="Sin foto del menor"     count={sinFoto}       total={total} color="#9e9e9e" />
        </StatSection>

        {/* ── Inscripciones por mes ── */}
        <StatSection title="📅 Inscripciones por mes (últimos 4)">
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 90, mt: 1 }}>
            {mesItems.map(m => (
              <Box key={m.key} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" fontWeight={700} color="#4E1B95">{m.val}</Typography>
                <Box sx={{
                  width: '100%', borderRadius: '4px 4px 0 0',
                  height: `${Math.max((m.val / maxMes) * 60, m.val > 0 ? 8 : 2)}px`,
                  background: m.val > 0 ? 'linear-gradient(180deg, #7C3AED, #4E1B95)' : 'rgba(0,0,0,0.08)',
                  transition: 'height 0.5s ease',
                }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', textAlign: 'center' }}>
                  {m.key}
                </Typography>
              </Box>
            ))}
          </Box>
        </StatSection>

        {/* ── Top tallas camisa + pantalon ── */}
        <StatSection title="👕 Talla camisa más frecuente">
          {topCamisaItems.length
            ? renderBarras(topCamisaItems, maxCamisa, '#2D984F')
            : <Typography variant="caption" color="text.secondary">Sin datos</Typography>}
        </StatSection>

        <StatSection title="👟 Talla zapatos / pantalón">
          <Typography variant="caption" fontWeight={700} color="#1976d2" sx={{ mb: 1, display: 'block' }}>
            Zapatos
          </Typography>
          {topZapatosItems.length
            ? renderBarras(topZapatosItems, maxZapatos, '#1976d2')
            : <Typography variant="caption" color="text.secondary">Sin datos</Typography>}
          <Divider sx={{ my: 1.2 }} />
          <Typography variant="caption" fontWeight={700} color="#5c6bc0" sx={{ mb: 1, display: 'block' }}>
            Pantalón
          </Typography>
          {topPantalonItems.length
            ? renderBarras(topPantalonItems, maxPantalon, '#5c6bc0')
            : <Typography variant="caption" color="text.secondary">Sin datos</Typography>}
        </StatSection>

      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3, maxHeight: '90vh' } }}
    >
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #4E1B95 0%, #3a1470 100%)',
        color: '#fff', py: 2, px: 3,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BarChartIcon />
          <Typography fontWeight={800} sx={{ fontSize: '1.05rem' }}>
            Estadísticas de beneficiarios
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.12)' } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflowY: 'auto' }}>
        {content()}
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const [inscripciones,  setInscripciones]  = useState([]);
  const [total,          setTotal]          = useState(0);
  const [pagina,         setPagina]         = useState(1);
  const [buscar,         setBuscar]         = useState('');
  const [estado,         setEstado]         = useState('activos');
  const [cargando,       setCargando]       = useState(false);
  const [error,          setError]          = useState('');
  const [toast,          setToast]          = useState('');
  const [exportando,     setExportando]     = useState(false);
  const [stats,          setStats]          = useState({ activos: 0, baja: 0, total: 0 });
  const [statsDetalle,   setStatsDetalle]   = useState(null);
  const [cargandoStats,  setCargandoStats]  = useState(false);
  const [modalStats,     setModalStats]     = useState(false);
  const [seleccionada,   setSeleccionada]   = useState(null);
  const [editando,       setEditando]       = useState(null);
  const [creando,        setCreando]        = useState(false);
  const [idEliminar,     setIdEliminar]     = useState(null);
  const [eliminando,     setEliminando]     = useState(false);
  const [idBaja,         setIdBaja]         = useState(null);
  const [procesandoBaja, setProcesandoBaja] = useState(false);
  const [actualizando,   setActualizando]   = useState(false);

  /* ── Stats banner ─────────────────────────────────────────────────────────── */
  const cargarStats = useCallback(async () => {
    try {
      const [{ data: a }, { data: b }] = await Promise.all([
        api.get('/api/beneficiarios', { params: { pagina: 1, porPagina: 1, estado: 'activos' } }),
        api.get('/api/beneficiarios', { params: { pagina: 1, porPagina: 1, estado: 'baja'    } }),
      ]);
      setStats({ activos: a.total, baja: b.total, total: a.total + b.total });
    } catch { /* silencioso */ }
  }, []);

  /* ── Estadísticas detalladas (endpoint dedicado) ──────────────────────────── */
  const cargarStatsDetalle = useCallback(async () => {
    setCargandoStats(true);
    try {
      const { data } = await api.get('/api/beneficiarios/stats');
      setStatsDetalle(data);
    } catch { /* silencioso */ }
    finally { setCargandoStats(false); }
  }, []);

  /* ── Tabla paginada (con caché stale-while-revalidate) ───────────────────── */
  const cargar = useCallback(async (forzar = false) => {
    const key = cacheKey(estado, pagina, buscar);
    const cached = !forzar && leerCache(key);

    if (cached) {
      // Mostrar datos cacheados inmediatamente
      setInscripciones(cached.data);
      setTotal(cached.total);
      setActualizando(true);
      // Actualizar en segundo plano
      try {
        const { data } = await api.get('/api/beneficiarios', {
          params: { pagina, porPagina: POR_PAGINA, buscar: buscar || undefined, estado },
        });
        setInscripciones(data.data);
        setTotal(data.total);
        escribirCache(key, data.data, data.total);
      } catch { /* mantener caché si falla la red */ }
      finally { setActualizando(false); }
      return;
    }

    setCargando(true); setActualizando(false); setError('');
    try {
      const { data } = await api.get('/api/beneficiarios', {
        params: { pagina, porPagina: POR_PAGINA, buscar: buscar || undefined, estado },
      });
      setInscripciones(data.data);
      setTotal(data.total);
      escribirCache(key, data.data, data.total);
    } catch {
      setError('No se pudieron cargar los beneficiarios.');
    } finally { setCargando(false); }
  }, [pagina, buscar, estado]);

  useEffect(() => { cargarStats(); cargarStatsDetalle(); }, [cargarStats, cargarStatsDetalle]);
  useEffect(() => { cargar(); },     [cargar]);
  useEffect(() => { setPagina(1); }, [buscar, estado]);

  /* ── Dar de baja ──────────────────────────────────────────────────────────── */
  const handleDarDeBaja = async () => {
    if (!idBaja) return;
    setProcesandoBaja(true);
    try {
      await api.patch(`/api/beneficiarios/${idBaja}/baja`);
      setIdBaja(null);
      setToast('Beneficiario dado de baja correctamente');
      limpiarCache(); cargar(true); cargarStats(); cargarStatsDetalle();
    } catch { setError('No se pudo dar de baja al beneficiario.'); }
    finally  { setProcesandoBaja(false); }
  };

  const handleReactivar = async (id) => {
    try {
      await api.patch(`/api/beneficiarios/${id}/reactivar`);
      setToast('Beneficiario reactivado correctamente');
      limpiarCache(); cargar(true); cargarStats(); cargarStatsDetalle();
    } catch { setError('No se pudo reactivar el beneficiario.'); }
  };

  /* ── Eliminar ─────────────────────────────────────────────────────────────── */
  const handleEliminar = async () => {
    if (!idEliminar) return;
    setEliminando(true);
    try {
      await api.delete(`/api/beneficiarios/${idEliminar}`);
      setIdEliminar(null);
      setToast('Registro eliminado permanentemente');
      limpiarCache(); cargar(true); cargarStats(); cargarStatsDetalle();
    } catch { setError('No se pudo eliminar el registro.'); }
    finally  { setEliminando(false); }
  };

  const handleGuardadoEdicion = () => {
    setEditando(null);
    setToast('Beneficiario actualizado correctamente');
    limpiarCache(); cargar(true); cargarStatsDetalle();
  };

  const handleBeneficiarioCreado = () => {
    setCreando(false);
    setToast('Beneficiario inscrito correctamente');
    limpiarCache(); cargar(true); cargarStats(); cargarStatsDetalle();
  };

  /* ── Excel ────────────────────────────────────────────────────────────────── */
  const exportarExcel = async () => {
    setExportando(true);
    setToast('Preparando exportación completa…');
    try {
      const { data } = await api.get('/api/beneficiarios', {
        params: { pagina: 1, porPagina: 9999, estado: 'todos' },
      });
      const todos = data.data;
      if (!todos.length) { setToast('No hay datos para exportar'); return; }

      const encabezados = [
        'NOMBRE','F. NACIMIENTO','TIPO DOC.','N° DOCUMENTO',
        'EDAD','EPS','T. CAMISA','T. PANTALÓN','T. ZAPATOS',
        'ALERGIA','DESC. ALERGIA','OBS. SALUD',
        'ACUDIENTE','PARENTESCO','WHATSAPP','DIRECCIÓN',
        'ESTADO','F. INSCRIPCIÓN',
      ];
      const filas = todos.map(ins => [
        ins.nombreMenor        || '—', ins.fechaNacimiento  || '—',
        ins.tipoDocumento      || '—', ins.numeroDocumento  || '—',
        calcularEdad(ins.fechaNacimiento),
        ins.eps                || '—', ins.tallaCamisa      || '—',
        ins.tallaPantalon      || '—', ins.tallaZapatos     || '—',
        ins.tieneAlergia === 'si' ? 'Sí' : 'No',
        ins.descripcionAlergia || '—', ins.observacionesSalud || '—',
        ins.nombreAcudiente    || '—', ins.parentesco       || '—',
        ins.whatsapp           || '—', ins.direccion        || '—',
        ins.activo ? 'Activo' : 'Baja',
        ins.createdAt ? new Date(ins.createdAt).toLocaleDateString('es-CO') : '—',
      ]);

      const hoja = XLSX.utils.aoa_to_sheet([encabezados, ...filas]);
      hoja['!cols'] = [30,15,14,18,10,20,10,11,10,10,30,30,30,14,18,30,12,16].map(wch => ({ wch }));
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, 'Beneficiarios');
      XLSX.writeFile(libro, `beneficiarios_${new Date().toISOString().slice(0,10)}.xlsx`);
      setToast(`${todos.length} registros exportados`);
    } catch { setToast('Error al generar el Excel. Intenta de nuevo.'); }
    finally  { setExportando(false); }
  };

  const totalPaginas = Math.ceil(total / POR_PAGINA);
  const TABS = [
    { value: 'activos', label: `Activos (${stats.activos})` },
    { value: 'baja',    label: `Baja (${stats.baja})` },
    { value: 'todos',   label: `Todos (${stats.total})` },
  ];

  /* ── Hover de filas ───────────────────────────────────────────────────────── */
  const hoverSx = () => ({
    bgcolor: '#ede7f6 !important',
    '& .MuiTableCell-root': { color: '#1a1a1a !important' },
    '& .MuiTableCell-root:first-of-type': { borderLeft: '3px solid #7C3AED' },
    '& a': { color: '#1a6b35 !important' },
  });

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>

      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      <Box sx={{
        background: 'linear-gradient(135deg, #4E1B95 0%, #3a1470 60%, #2D984F 100%)',
        px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 },
      }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.3 }}>
              Módulo
            </Typography>
            <Typography sx={{ fontSize: { xs: '1.3rem', sm: '1.6rem' }, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              Beneficiarios
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', mt: 0.3 }}>
              Gestión de niños y niñas inscritos
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, width: { xs: '100%', sm: 'auto' }, alignItems: { xs: 'stretch', sm: 'center' } }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <StatCard icon={<PeopleIcon />}       label="Total"   value={stats.total}   color="#B4E8E8" />
              <StatCard icon={<VerifiedUserIcon />} label="Activos" value={stats.activos} color="#81c784" />
              <StatCard icon={<PersonOffIcon />}    label="Baja"    value={stats.baja}    color="#ef9a9a" />
            </Box>
            <Button
              variant="contained" size="small"
              startIcon={<PersonAddIcon />}
              onClick={() => setCreando(true)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.18)',
                border: '1.5px solid rgba(255,255,255,0.35)',
                color: '#fff', fontWeight: 700,
                borderRadius: 2, whiteSpace: 'nowrap',
                backdropFilter: 'blur(6px)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' },
              }}
            >
              Nuevo beneficiario
            </Button>
          </Box>
        </Box>
      </Box>

      {/* ── Contenido ──────────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1 }}>
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>

          {/* Búsqueda + Estadísticas + Export */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
            <TextField
              placeholder="Buscar nombre, documento, acudiente…"
              size="small" fullWidth
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              sx={{ maxWidth: { sm: 420 } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: '#9e9e9e' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              <Tooltip title="Ver estadísticas detalladas de beneficiarios">
                <Button
                  variant="contained" size="small"
                  startIcon={cargandoStats ? <CircularProgress size={14} color="inherit" /> : <BarChartIcon />}
                  onClick={() => setModalStats(true)}
                  disabled={cargandoStats}
                  sx={{ bgcolor: '#4E1B95', '&:hover': { bgcolor: '#3a1470' }, whiteSpace: 'nowrap', fontWeight: 700, borderRadius: 2 }}
                >
                  Estadísticas
                </Button>
              </Tooltip>
              <Tooltip title="Exporta TODOS los beneficiarios de la base de datos">
                <Button
                  variant="contained" size="small"
                  startIcon={exportando ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
                  onClick={exportarExcel} disabled={exportando}
                  sx={{ bgcolor: '#2D984F', '&:hover': { bgcolor: '#1e6e38' }, whiteSpace: 'nowrap', fontWeight: 700, borderRadius: 2, flexShrink: 0 }}
                >
                  {exportando ? 'Exportando…' : 'Exportar Excel'}
                </Button>
              </Tooltip>
            </Box>
          </Stack>

          {/* Tabs */}
          <Tabs
            value={estado} onChange={(_, v) => setEstado(v)}
            variant="scrollable" scrollButtons="auto"
            sx={{
              mb: 2,
              '& .MuiTab-root':       { fontWeight: 600, textTransform: 'none', minHeight: 40, fontSize: '0.85rem' },
              '& .Mui-selected':      { color: '#4E1B95' },
              '& .MuiTabs-indicator': { bgcolor: '#4E1B95', height: 3, borderRadius: 2 },
            }}
          >
            {TABS.map(t => <Tab key={t.value} value={t.value} label={t.label} />)}
          </Tabs>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* Indicador sutil de actualización en segundo plano */}
          {actualizando && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1, opacity: 0.6 }}>
              <SyncIcon sx={{ fontSize: '0.85rem', color: '#4E1B95', animation: 'spin 1.2s linear infinite',
                '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />
              <Typography variant="caption" color="text.secondary">Actualizando…</Typography>
            </Box>
          )}

          {/* Tabla */}
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{
                  background: 'linear-gradient(90deg, #4E1B95, #3a1470)',
                  '& .MuiTableCell-root': { color: '#fff', fontWeight: 700, fontSize: '0.8rem', py: 1.5, borderBottom: 'none', whiteSpace: 'nowrap' },
                }}>
                  {['Nombre del menor','Documento','Edad','WhatsApp','Alergia','Estado','Acciones'].map(h => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {cargando ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><CircularProgress size={32} sx={{ color: '#4E1B95' }} /></TableCell></TableRow>
                ) : inscripciones.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>No se encontraron beneficiarios.</TableCell></TableRow>
                ) : (
                  inscripciones.map((ins, idx) => (
                    <TableRow
                      key={ins.id} hover
                      onClick={() => setSeleccionada(ins)}
                      sx={{
                        cursor: 'pointer',
                        opacity: ins.activo ? 1 : 0.65,
                        bgcolor: idx % 2 === 0 ? 'inherit' : 'rgba(78,27,149,0.04)',
                        transition: 'background 0.15s',
                        '&:hover': hoverSx(),
                        '&:last-child td': { borderBottom: 0 },
                      }}
                    >
                      <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', color: 'text.primary' }}>
                        {ins.nombreMenor}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', whiteSpace: 'nowrap', color: 'text.secondary' }}>
                        {ins.tipoDocumento} {ins.numeroDocumento || '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', whiteSpace: 'nowrap', color: 'text.primary' }}>
                        {calcularEdad(ins.fechaNacimiento)}
                      </TableCell>
                      {/* WhatsApp: ícono a la IZQUIERDA del número */}
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {ins.whatsapp ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title="Abrir en WhatsApp">
                              <IconButton
                                size="small"
                                component="a"
                                href={`https://wa.me/${ins.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                onClick={e => e.stopPropagation()}
                                sx={{ color: '#25D366', p: 0.3, '&:hover': { bgcolor: 'rgba(37,211,102,0.12)' } }}
                              >
                                <WhatsAppIcon sx={{ fontSize: '1rem' }} />
                              </IconButton>
                            </Tooltip>
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: 'text.primary' }}>
                              {ins.whatsapp}
                            </Typography>
                          </Box>
                        ) : '—'}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Chip
                          label={ins.tieneAlergia === 'si' ? 'Sí' : 'No'}
                          color={ins.tieneAlergia === 'si' ? 'warning' : 'default'}
                          size="small" sx={{ fontSize: '0.72rem', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Chip
                          label={ins.activo ? 'Activo' : 'Baja'} size="small"
                          sx={{
                            fontSize: '0.72rem', fontWeight: 700,
                            bgcolor: ins.activo ? '#e8f5e9' : '#fce4ec',
                            color:   ins.activo ? '#2e7d32' : '#c62828',
                          }}
                        />
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()} sx={{ whiteSpace: 'nowrap', pr: 0.5 }}>
                        <Tooltip title="Ver detalle">
                          <IconButton size="small" sx={{ color: '#4E1B95', '&:hover': { bgcolor: 'rgba(78,27,149,0.1)' } }} onClick={() => setSeleccionada(ins)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton size="small" sx={{ color: '#1976d2', '&:hover': { bgcolor: 'rgba(25,118,210,0.1)' } }} onClick={() => setEditando(ins)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {ins.activo ? (
                          <Tooltip title="Dar de baja">
                            <IconButton size="small" sx={{ color: '#e65100', '&:hover': { bgcolor: 'rgba(230,81,0,0.1)' } }} onClick={() => setIdBaja(ins.id)}>
                              <BlockIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Reactivar">
                            <IconButton size="small" sx={{ color: '#2e7d32', '&:hover': { bgcolor: 'rgba(46,125,50,0.1)' } }} onClick={() => handleReactivar(ins.id)}>
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Eliminar permanentemente">
                          <IconButton size="small" sx={{ color: '#c62828', '&:hover': { bgcolor: 'rgba(198,40,40,0.1)' } }} onClick={() => setIdEliminar(ins.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination count={totalPaginas} page={pagina} onChange={(_, v) => setPagina(v)} size="small"
                sx={{ '& .Mui-selected': { bgcolor: '#4E1B95 !important', color: '#fff' }, '& .MuiPaginationItem-root': { fontWeight: 600 } }}
              />
            </Box>
          )}

          {/* Footer */}
          <Box sx={{ mt: 5, pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
              <LockIcon sx={{ fontSize: '1rem', color: '#4E1B95', mt: '2px', flexShrink: 0 }} />
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#4E1B95', display: 'block', mb: 0.3 }}>Aviso de confidencialidad</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  La información contenida en este panel es de carácter <strong>estrictamente confidencial</strong> y de uso exclusivo del personal autorizado de la fundación.
                  Queda prohibida su reproducción, divulgación o uso no autorizado. El acceso indebido a estos datos puede constituir una infracción a la <strong>Ley 1581 de 2012</strong>.
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Fundación Panorama de Colores</strong> · Entidad sin ánimo de lucro · NIT registrado ante la DIAN
              </Typography>
              <Typography variant="caption" color="text.secondary">Panel Administrativo · {new Date().getFullYear()}</Typography>
            </Box>
          </Box>

        </Container>
      </Box>

      {/* ── Modal de estadísticas ──────────────────────────────────────────── */}
      <ModalEstadisticas
        open={modalStats}
        onClose={() => setModalStats(false)}
        stats={statsDetalle}
        cargando={cargandoStats}
      />

      {/* ── Modal nuevo beneficiario ───────────────────────────────────────── */}
      {creando && (
        <NuevoBeneficiario onCerrar={() => setCreando(false)} onCreado={handleBeneficiarioCreado} />
      )}

      {/* ── Modales ────────────────────────────────────────────────────────── */}
      {seleccionada && (
        <DetalleInscripcion
          inscripcion={seleccionada}
          onCerrar={() => setSeleccionada(null)}
          onEditar={() => { setEditando(seleccionada); setSeleccionada(null); }}
          onEliminar={() => { setIdEliminar(seleccionada.id); setSeleccionada(null); }}
        />
      )}
      {editando && (
        <EditarInscripcion inscripcion={editando} onCerrar={() => setEditando(null)} onGuardado={handleGuardadoEdicion} />
      )}

      <Dialog open={!!idBaja} onClose={() => setIdBaja(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#e65100', fontWeight: 700, pb: 1 }}>¿Dar de baja al beneficiario?</DialogTitle>
        <DialogContent>
          <DialogContentText>El beneficiario quedará inactivo pero su información se conservará. Podrás reactivarlo en cualquier momento.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIdBaja(null)} variant="outlined">Cancelar</Button>
          <Button variant="contained" onClick={handleDarDeBaja} disabled={procesandoBaja}
            sx={{ bgcolor: '#e65100', '&:hover': { bgcolor: '#bf360c' } }}>
            {procesandoBaja ? 'Procesando…' : 'Dar de baja'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!idEliminar} onClose={() => setIdEliminar(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#c62828', fontWeight: 700, pb: 1 }}>¿Eliminar permanentemente?</DialogTitle>
        <DialogContent>
          <DialogContentText>Esta acción no se puede deshacer. El registro se borrará definitivamente de la base de datos.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIdEliminar(null)} variant="outlined">Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleEliminar} disabled={eliminando}>
            {eliminando ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast('')} message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}

export function calcularEdad(fechaNac) {
  if (!fechaNac) return '—';
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return `${edad} años`;
}
