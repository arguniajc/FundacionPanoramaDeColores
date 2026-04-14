import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Container,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Chip, TextField, InputAdornment, Pagination,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Tooltip, Button, Snackbar, Tabs, Tab,
  Divider, Stack, Collapse, LinearProgress,
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
import ExpandMoreIcon       from '@mui/icons-material/ExpandMore';
import ExpandLessIcon       from '@mui/icons-material/ExpandLess';
import ChildCareIcon        from '@mui/icons-material/ChildCare';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import DetalleInscripcion from './DetalleInscripcion';
import EditarInscripcion  from './EditarInscripcion';

const POR_PAGINA = 15;

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function edadNumerica(fechaNac) {
  if (!fechaNac) return null;
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

const RANGOS = [
  { label: '0 – 3 años',  min: 0,  max: 3  },
  { label: '4 – 6 años',  min: 4,  max: 6  },
  { label: '7 – 9 años',  min: 7,  max: 9  },
  { label: '10 – 12 años',min: 10, max: 12 },
  { label: '13 – 15 años',min: 13, max: 15 },
  { label: '16+ años',    min: 16, max: 99  },
];

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

/* ── Panel de estadísticas ──────────────────────────────────────────────────── */
function PanelEstadisticas({ todos, cargandoStats }) {
  const [abierto, setAbierto] = useState(false);

  if (cargandoStats) return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5, px: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 2 }}>
      <CircularProgress size={16} sx={{ color: '#4E1B95' }} />
      <Typography variant="caption" color="text.secondary">Calculando estadísticas…</Typography>
    </Box>
  );

  if (!todos.length) return null;

  const activos   = todos.filter(i => i.activo);
  const total     = todos.length;
  const totalAct  = activos.length;

  // Alergias
  const conAlergia = todos.filter(i => i.tieneAlergia === 'si').length;

  // Rangos de edad
  const rangos = RANGOS.map(r => ({
    ...r,
    count: todos.filter(i => {
      const e = edadNumerica(i.fechaNacimiento);
      return e !== null && e >= r.min && e <= r.max;
    }).length,
  }));
  const sinFecha = todos.filter(i => !i.fechaNacimiento).length;
  const maxRango = Math.max(...rangos.map(r => r.count), 1);

  // Datos faltantes (sobre activos)
  const faltaDoc      = todos.filter(i => !i.numeroDocumento).length;
  const faltaEps      = todos.filter(i => !i.eps).length;
  const faltaWa       = todos.filter(i => !i.whatsapp).length;
  const faltaDireccion= todos.filter(i => !i.direccion).length;
  const faltaTallas   = todos.filter(i => !i.tallaCamisa || !i.tallaPantalon || !i.tallaZapatos).length;
  const faltaFoto     = todos.filter(i => !i.fotoMenorUrl).length;
  const incompletos   = todos.filter(i =>
    !i.numeroDocumento || !i.eps || !i.whatsapp || !i.tallaCamisa || !i.tallaPantalon || !i.tallaZapatos
  ).length;

  // Inscripciones por mes (últimos 4 meses)
  const ahora = new Date();
  const meses = Array.from({ length: 4 }, (_, k) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - (3 - k), 1);
    return {
      label: d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }),
      count: todos.filter(i => {
        if (!i.createdAt) return false;
        const c = new Date(i.createdAt);
        return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear();
      }).length,
    };
  });
  const maxMes = Math.max(...meses.map(m => m.count), 1);

  return (
    <Paper elevation={0} sx={{ mb: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
      {/* Cabecera del panel */}
      <Box
        onClick={() => setAbierto(p => !p)}
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: { xs: 2, sm: 3 }, py: 1.5, cursor: 'pointer',
          bgcolor: abierto ? 'rgba(78,27,149,0.05)' : 'transparent',
          '&:hover': { bgcolor: 'rgba(78,27,149,0.05)' },
          transition: 'background 0.2s',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ChildCareIcon sx={{ color: '#4E1B95', fontSize: '1.2rem' }} />
          <Typography fontWeight={700} sx={{ color: '#4E1B95', fontSize: '0.95rem' }}>
            Estadísticas de beneficiarios
          </Typography>
          {/* chips resumen siempre visibles */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 0.8, ml: 1 }}>
            <Chip label={`${totalAct} activos`}    size="small" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 700, fontSize: '0.7rem' }} />
            <Chip label={`${conAlergia} alergias`} size="small" sx={{ bgcolor: '#fff3e0', color: '#e65100', fontWeight: 700, fontSize: '0.7rem' }} />
            <Chip label={`${incompletos} incompletos`} size="small" sx={{ bgcolor: '#fce4ec', color: '#c62828', fontWeight: 700, fontSize: '0.7rem' }} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">{abierto ? 'Ocultar' : 'Ver detalles'}</Typography>
          {abierto ? <ExpandLessIcon sx={{ color: '#4E1B95' }} /> : <ExpandMoreIcon sx={{ color: '#4E1B95' }} />}
        </Box>
      </Box>

      <Collapse in={abierto}>
        <Divider />
        <Box sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: { xs: 2.5, sm: 3 } }}>

            {/* ── Distribución por edad ── */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="#4E1B95" sx={{ mb: 1.5, fontSize: '0.85rem' }}>
                📊 Distribución por edad
              </Typography>
              {rangos.map(r => (
                <Box key={r.label} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                    <Typography variant="caption" fontWeight={600}>{r.label}</Typography>
                    <Typography variant="caption" fontWeight={700} color="#4E1B95">{r.count}</Typography>
                  </Box>
                  <Box sx={{ bgcolor: 'rgba(0,0,0,0.06)', borderRadius: 4, height: 10, overflow: 'hidden' }}>
                    <Box sx={{
                      height: '100%', borderRadius: 4,
                      width: `${(r.count / maxRango) * 100}%`,
                      background: 'linear-gradient(90deg, #4E1B95, #7C3AED)',
                      transition: 'width 0.6s ease',
                      minWidth: r.count > 0 ? 8 : 0,
                    }} />
                  </Box>
                </Box>
              ))}
              {sinFecha > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  ⚠ {sinFecha} sin fecha de nacimiento registrada
                </Typography>
              )}
            </Box>

            {/* ── Salud y estado ── */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="#4E1B95" sx={{ mb: 1.5, fontSize: '0.85rem' }}>
                ❤️ Salud y estado
              </Typography>
              <BaraStat label="Con alergia"     count={conAlergia}            total={total} color="#e65100" icon={<WarningAmberIcon fontSize="inherit" />} />
              <BaraStat label="Sin alergia"     count={total - conAlergia}    total={total} color="#2D984F" />
              <BaraStat label="Activos"         count={totalAct}              total={total} color="#4E1B95" icon={<VerifiedUserIcon fontSize="inherit" />} />
              <BaraStat label="En baja"         count={total - totalAct}      total={total} color="#9e9e9e" icon={<PersonOffIcon fontSize="inherit" />} />
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary">
                <strong>{total}</strong> beneficiarios en total (activos + baja)
              </Typography>
            </Box>

            {/* ── Datos faltantes ── */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="#4E1B95" sx={{ mb: 1.5, fontSize: '0.85rem' }}>
                📋 Datos por completar
              </Typography>
              <BaraStat label="Sin número documento" count={faltaDoc}       total={total} color="#c62828" icon={<AssignmentLateIcon fontSize="inherit" />} />
              <BaraStat label="Sin EPS"              count={faltaEps}       total={total} color="#e65100" />
              <BaraStat label="Sin WhatsApp"         count={faltaWa}        total={total} color="#f57c00" icon={<WhatsAppIcon fontSize="inherit" />} />
              <BaraStat label="Sin dirección"        count={faltaDireccion} total={total} color="#795548" />
              <BaraStat label="Con tallas incompletas" count={faltaTallas}  total={total} color="#5c6bc0" />
              <BaraStat label="Sin foto del menor"   count={faltaFoto}      total={total} color="#9e9e9e" />
            </Box>

            {/* ── Inscripciones recientes ── */}
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1', lg: '1' } }}>
              <Typography variant="subtitle2" fontWeight={700} color="#4E1B95" sx={{ mb: 1.5, fontSize: '0.85rem' }}>
                📅 Inscripciones por mes (últimos 4 meses)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 80 }}>
                {meses.map(m => (
                  <Box key={m.label} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" fontWeight={700} color="#4E1B95">{m.count}</Typography>
                    <Box sx={{
                      width: '100%', borderRadius: '4px 4px 0 0',
                      height: `${Math.max((m.count / maxMes) * 56, m.count > 0 ? 8 : 2)}px`,
                      background: m.count > 0 ? 'linear-gradient(180deg, #7C3AED, #4E1B95)' : 'rgba(0,0,0,0.08)',
                      transition: 'height 0.5s ease',
                    }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{m.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* ── Resumen tallas más comunes ── */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="#4E1B95" sx={{ mb: 1.5, fontSize: '0.85rem' }}>
                👕 Talla de camisa más frecuente
              </Typography>
              {(() => {
                const freq = {};
                todos.forEach(i => { if (i.tallaCamisa) freq[i.tallaCamisa] = (freq[i.tallaCamisa] || 0) + 1; });
                const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
                const maxF = sorted[0]?.[1] || 1;
                return sorted.length ? sorted.map(([talla, cnt]) => (
                  <Box key={talla} sx={{ mb: 0.8 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                      <Typography variant="caption" fontWeight={600}>Talla {talla}</Typography>
                      <Typography variant="caption" fontWeight={700} color="#4E1B95">{cnt}</Typography>
                    </Box>
                    <Box sx={{ bgcolor: 'rgba(0,0,0,0.06)', borderRadius: 4, height: 8 }}>
                      <Box sx={{ height: '100%', borderRadius: 4, width: `${(cnt / maxF) * 100}%`, bgcolor: '#2D984F', transition: 'width 0.5s' }} />
                    </Box>
                  </Box>
                )) : <Typography variant="caption" color="text.secondary">Sin datos de tallas</Typography>;
              })()}
            </Box>

            {/* ── Talla zapatos más común ── */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="#4E1B95" sx={{ mb: 1.5, fontSize: '0.85rem' }}>
                👟 Talla de zapatos más frecuente
              </Typography>
              {(() => {
                const freq = {};
                todos.forEach(i => { if (i.tallaZapatos) freq[i.tallaZapatos] = (freq[i.tallaZapatos] || 0) + 1; });
                const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
                const maxF = sorted[0]?.[1] || 1;
                return sorted.length ? sorted.map(([talla, cnt]) => (
                  <Box key={talla} sx={{ mb: 0.8 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                      <Typography variant="caption" fontWeight={600}>Talla {talla}</Typography>
                      <Typography variant="caption" fontWeight={700} color="#4E1B95">{cnt}</Typography>
                    </Box>
                    <Box sx={{ bgcolor: 'rgba(0,0,0,0.06)', borderRadius: 4, height: 8 }}>
                      <Box sx={{ height: '100%', borderRadius: 4, width: `${(cnt / maxF) * 100}%`, bgcolor: '#1976d2', transition: 'width 0.5s' }} />
                    </Box>
                  </Box>
                )) : <Typography variant="caption" color="text.secondary">Sin datos de tallas</Typography>;
              })()}
            </Box>

          </Box>
        </Box>
      </Collapse>
    </Paper>
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
  const [todosReg,       setTodosReg]       = useState([]);
  const [cargandoStats,  setCargandoStats]  = useState(false);
  const [seleccionada,   setSeleccionada]   = useState(null);
  const [editando,       setEditando]       = useState(null);
  const [idEliminar,     setIdEliminar]     = useState(null);
  const [eliminando,     setEliminando]     = useState(false);
  const [idBaja,         setIdBaja]         = useState(null);
  const [procesandoBaja, setProcesandoBaja] = useState(false);

  /* ── Stats banner ─────────────────────────────────────────────────────────── */
  const cargarStats = useCallback(async () => {
    try {
      const [{ data: a }, { data: b }] = await Promise.all([
        api.get('/api/inscripciones', { params: { pagina: 1, porPagina: 1, estado: 'activos' } }),
        api.get('/api/inscripciones', { params: { pagina: 1, porPagina: 1, estado: 'baja'    } }),
      ]);
      setStats({ activos: a.total, baja: b.total, total: a.total + b.total });
    } catch { /* silencioso */ }
  }, []);

  /* ── Todos los registros para estadísticas detalladas ─────────────────────── */
  const cargarTodos = useCallback(async () => {
    setCargandoStats(true);
    try {
      const { data } = await api.get('/api/inscripciones', {
        params: { pagina: 1, porPagina: 9999, estado: 'todos' },
      });
      setTodosReg(data.data || []);
    } catch { /* silencioso */ }
    finally { setCargandoStats(false); }
  }, []);

  /* ── Tabla paginada ───────────────────────────────────────────────────────── */
  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try {
      const { data } = await api.get('/api/inscripciones', {
        params: { pagina, porPagina: POR_PAGINA, buscar: buscar || undefined, estado },
      });
      setInscripciones(data.data);
      setTotal(data.total);
    } catch {
      setError('No se pudieron cargar los beneficiarios.');
    } finally { setCargando(false); }
  }, [pagina, buscar, estado]);

  useEffect(() => { cargarStats(); cargarTodos(); }, [cargarStats, cargarTodos]);
  useEffect(() => { cargar(); },     [cargar]);
  useEffect(() => { setPagina(1); }, [buscar, estado]);

  /* ── Dar de baja ──────────────────────────────────────────────────────────── */
  const handleDarDeBaja = async () => {
    if (!idBaja) return;
    setProcesandoBaja(true);
    try {
      await api.patch(`/api/inscripciones/${idBaja}/baja`);
      setIdBaja(null);
      setToast('Beneficiario dado de baja correctamente');
      cargar(); cargarStats(); cargarTodos();
    } catch { setError('No se pudo dar de baja al beneficiario.'); }
    finally  { setProcesandoBaja(false); }
  };

  const handleReactivar = async (id) => {
    try {
      await api.patch(`/api/inscripciones/${id}/reactivar`);
      setToast('Beneficiario reactivado correctamente');
      cargar(); cargarStats(); cargarTodos();
    } catch { setError('No se pudo reactivar el beneficiario.'); }
  };

  /* ── Eliminar ─────────────────────────────────────────────────────────────── */
  const handleEliminar = async () => {
    if (!idEliminar) return;
    setEliminando(true);
    try {
      await api.delete(`/api/inscripciones/${idEliminar}`);
      setIdEliminar(null);
      setToast('Registro eliminado permanentemente');
      cargar(); cargarStats(); cargarTodos();
    } catch { setError('No se pudo eliminar el registro.'); }
    finally  { setEliminando(false); }
  };

  const handleGuardadoEdicion = () => {
    setEditando(null);
    setToast('Beneficiario actualizado correctamente');
    cargar(); cargarTodos();
  };

  /* ── Excel ────────────────────────────────────────────────────────────────── */
  const exportarExcel = async () => {
    setExportando(true);
    setToast('Preparando exportación completa…');
    try {
      const { data } = await api.get('/api/inscripciones', {
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
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap', width: { xs: '100%', sm: 'auto' } }}>
            <StatCard icon={<PeopleIcon />}       label="Total"   value={stats.total}   color="#B4E8E8" />
            <StatCard icon={<VerifiedUserIcon />} label="Activos" value={stats.activos} color="#81c784" />
            <StatCard icon={<PersonOffIcon />}    label="Baja"    value={stats.baja}    color="#ef9a9a" />
          </Box>
        </Box>
      </Box>

      {/* ── Contenido ──────────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1 }}>
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>

          {/* Panel de estadísticas */}
          <PanelEstadisticas todos={todosReg} cargandoStats={cargandoStats} />

          {/* Búsqueda + Export */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
            <TextField
              placeholder="Buscar nombre, documento, acudiente…"
              size="small" fullWidth
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              sx={{ maxWidth: { sm: 480 } }}
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
                      {/* WhatsApp: número + ícono a la derecha */}
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {ins.whatsapp ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: 'text.primary' }}>
                              {ins.whatsapp}
                            </Typography>
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
