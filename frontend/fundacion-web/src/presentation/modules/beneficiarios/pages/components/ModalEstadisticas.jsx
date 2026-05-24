import { useState, useEffect } from 'react';
import {
  Box, CircularProgress, Dialog, DialogContent, DialogTitle,
  Divider, IconButton, LinearProgress, Paper, Typography,
  useMediaQuery, useTheme,
} from '@mui/material';
import BarChartIcon       from '@mui/icons-material/BarChart';
import CloseIcon          from '@mui/icons-material/Close';
import WhatsAppIcon       from '@mui/icons-material/WhatsApp';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import apiClient          from '../../../../../infrastructure/http/apiClient';

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

function BaraStat({ label, count, total, color = 'var(--color-primario)', icon }) {
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

function StatSection({ title, children }) {
  return (
    <Paper elevation={0} sx={{
      p: { xs: 2, sm: 2.5 },
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 3,
      height: '100%',
    }}>
      <Typography variant="subtitle2" fontWeight={700} color="var(--color-primario)"
        sx={{ mb: 1.8, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 0.7 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

const TIPOS_FILTRO = [
  { v: 'todos',  label: 'Todos'     },
  { v: 'niño',   label: '👦 Niños'  },
  { v: 'adulto', label: '🧑 Adultos' },
];

export function ModalEstadisticas({ open, onClose }) {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [stats,      setStats]      = useState(null);
  const [cargando,   setCargando]   = useState(false);

  useEffect(() => {
    if (!open) return;
    setStats(null);
    setCargando(true);
    const params = tipoFiltro !== 'todos' ? `?tipo=${tipoFiltro}` : '';
    apiClient.get(`/api/beneficiarios/stats${params}`)
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [open, tipoFiltro]);

  useEffect(() => {
    if (!open) setTipoFiltro('todos');
  }, [open]);

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
        <CircularProgress size={32} sx={{ color: 'var(--color-primario)' }} />
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
    const maxEdad   = Math.max(...edadItems.map(i => i.val), 1);
    const mesItems  = Object.entries(porMes  || {}).map(([k, v]) => ({ key: k, val: v }));
    const maxMes    = Math.max(...mesItems.map(i => i.val), 1);

    const topCamisaItems   = (topCamisa   || []).map(t => ({ key: `Talla ${t.talla}`, val: t.cantidad }));
    const topZapatosItems  = (topZapatos  || []).map(t => ({ key: `Talla ${t.talla}`, val: t.cantidad }));
    const topPantalonItems = (topPantalon || []).map(t => ({ key: `Talla ${t.talla}`, val: t.cantidad }));
    const maxCamisa   = Math.max(...topCamisaItems.map(i => i.val), 1);
    const maxZapatos  = Math.max(...topZapatosItems.map(i => i.val), 1);
    const maxPantalon = Math.max(...topPantalonItems.map(i => i.val), 1);

    return (
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
        gap: { xs: 2, sm: 2.5 },
        p: { xs: 2, sm: 3 },
      }}>
        <StatSection title="📊 Resumen general">
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1 }}>
            {[
              { label: 'Total',    val: total,      bg: '#ede7f6', color: 'var(--color-primario)' },
              { label: 'Activos',  val: activos,    bg: '#e8f5e9', color: '#2e7d32' },
              { label: 'En baja',  val: baja,       bg: '#fce4ec', color: '#c62828' },
              { label: 'Alergias', val: conAlergia, bg: '#fff3e0', color: '#e65100' },
            ].map(({ label, val, bg, color }) => (
              <Box key={label} sx={{ bgcolor: bg, borderRadius: 2, p: 1.2, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color, lineHeight: 1 }}>{val}</Typography>
                <Typography sx={{ fontSize: '0.7rem', color, fontWeight: 600, mt: 0.3 }}>{label}</Typography>
              </Box>
            ))}
          </Box>
        </StatSection>

        <StatSection title="👶 Distribución por edad">
          {renderBarras(edadItems, maxEdad, 'var(--color-primario)')}
        </StatSection>

        <StatSection title="📋 Datos por completar">
          <BaraStat label="Sin n° documento"   count={sinDocumento} total={total} color="#c62828" icon={<AssignmentLateIcon fontSize="inherit" />} />
          <BaraStat label="Sin EPS"            count={sinEps}       total={total} color="#e65100" />
          <BaraStat label="Sin WhatsApp"       count={sinWhatsapp}  total={total} color="#f57c00" icon={<WhatsAppIcon fontSize="inherit" />} />
          <BaraStat label="Sin dirección"      count={sinDireccion} total={total} color="#795548" />
          <BaraStat label="Tallas incompletas" count={sinTallas}    total={total} color="#5c6bc0" />
          <BaraStat label="Sin foto"           count={sinFoto}      total={total} color="#9e9e9e" />
        </StatSection>

        <StatSection title="📅 Inscripciones por mes (últimos 4)">
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 90, mt: 1 }}>
            {mesItems.map(m => (
              <Box key={m.key} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" fontWeight={700} color="var(--color-primario)">{m.val}</Typography>
                <Box sx={{
                  width: '100%', borderRadius: '4px 4px 0 0',
                  height: `${Math.max((m.val / maxMes) * 60, m.val > 0 ? 8 : 2)}px`,
                  background: m.val > 0 ? 'linear-gradient(180deg, #7C3AED, var(--color-primario))' : 'rgba(0,0,0,0.08)',
                  transition: 'height 0.5s ease',
                }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', textAlign: 'center' }}>
                  {m.key}
                </Typography>
              </Box>
            ))}
          </Box>
        </StatSection>

        <StatSection title="👕 Talla camisa más frecuente">
          {topCamisaItems.length
            ? renderBarras(topCamisaItems, maxCamisa, 'var(--color-secundario)')
            : <Typography variant="caption" color="text.secondary">Sin datos</Typography>}
        </StatSection>

        <StatSection title="👟 Talla zapatos / pantalón">
          <Typography variant="caption" fontWeight={700} color="#1976d2" sx={{ mb: 1, display: 'block' }}>Zapatos</Typography>
          {topZapatosItems.length
            ? renderBarras(topZapatosItems, maxZapatos, '#1976d2')
            : <Typography variant="caption" color="text.secondary">Sin datos</Typography>}
          <Divider sx={{ my: 1.2 }} />
          <Typography variant="caption" fontWeight={700} color="#5c6bc0" sx={{ mb: 1, display: 'block' }}>Pantalón</Typography>
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
        background: 'linear-gradient(135deg, var(--color-primario) 0%, var(--color-gradiente) 100%)',
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

      {/* ── Filtro tipo ── */}
      <Box sx={{ display: 'flex', gap: 1, px: 3, py: 1.5, bgcolor: '#faf5ff', borderBottom: '1px solid', borderColor: 'divider', flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ alignSelf: 'center', mr: 0.5 }}>
          Ver estadísticas de:
        </Typography>
        {TIPOS_FILTRO.map(op => (
          <Box key={op.v} component="button" type="button"
            onClick={() => setTipoFiltro(op.v)}
            sx={{
              px: 2, py: 0.5, borderRadius: 5, border: '2px solid',
              borderColor: tipoFiltro === op.v ? 'var(--color-primario)' : '#ddd',
              bgcolor: tipoFiltro === op.v ? 'var(--color-primario)' : 'transparent',
              color: tipoFiltro === op.v ? '#fff' : 'text.secondary',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
              transition: 'all 0.15s', lineHeight: 1.8,
            }}>
            {op.label}
          </Box>
        ))}
      </Box>

      <DialogContent sx={{ p: 0, overflowY: 'auto' }}>
        {content()}
      </DialogContent>
    </Dialog>
  );
}

export { StatCard };
