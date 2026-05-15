import { useEffect, useState } from 'react';
import { Box, Typography, Grid, Card, CardActionArea, Chip, Skeleton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import ChildCareIcon        from '@mui/icons-material/ChildCare';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import MonetizationOnIcon   from '@mui/icons-material/MonetizationOn';
import FolderSpecialIcon    from '@mui/icons-material/FolderSpecial';
import InventoryIcon        from '@mui/icons-material/Inventory';
import AssessmentIcon       from '@mui/icons-material/Assessment';
import PublicIcon           from '@mui/icons-material/Public';
import LocationOnIcon       from '@mui/icons-material/LocationOn';
import InfoOutlinedIcon     from '@mui/icons-material/InfoOutlined';
import { useAuth }      from '../../../../application/auth/AuthContext';
import { useThemeMode } from '../../../../shared/theme/ThemeContext';
import apiClient        from '../../../../infrastructure/http/apiClient';

const MODULOS = [
  { label: 'Beneficiarios', desc: 'Niños inscritos en la fundación',    icon: <ChildCareIcon sx={{ fontSize: 36 }} />,        grad: 'linear-gradient(135deg, var(--color-primario) 0%, #7c3aed 100%)', ruta: '/sede/beneficiarios' },
  { label: 'Donantes',      desc: 'Personas y empresas que apoyan',     icon: <VolunteerActivismIcon sx={{ fontSize: 36 }} />, grad: 'linear-gradient(135deg, #2D984F 0%, #16a34a 100%)',               ruta: '/sede/donantes' },
  { label: 'Donaciones',    desc: 'Registro de aportes recibidos',      icon: <MonetizationOnIcon sx={{ fontSize: 36 }} />,   grad: 'linear-gradient(135deg, #F59D1E 0%, #d97706 100%)',               ruta: '/sede/donaciones' },
  { label: 'Proyectos',     desc: 'Programas y proyectos activos',      icon: <FolderSpecialIcon sx={{ fontSize: 36 }} />,    grad: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',               ruta: '/sede/proyectos' },
  { label: 'Inventario',    desc: 'Control de bienes y materiales',     icon: <InventoryIcon sx={{ fontSize: 36 }} />,        grad: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',               ruta: '/sede/inventario' },
  { label: 'Reportes',      desc: 'Informes y estadísticas',            icon: <AssessmentIcon sx={{ fontSize: 36 }} />,       grad: 'linear-gradient(135deg, #B4E8E8 0%, #0891b2 100%)',               ruta: '/sede/reportes' },
];

const COLORES_RANGO = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

const COLORES_GENERO = {
  'Masculino':        '#3b82f6',
  'Femenino':         '#ec4899',
  'No binario':       '#8b5cf6',
  'Prefiero no decir':'#94a3b8',
  'No especificado':  '#cbd5e1',
};

// ── Tooltip personalizado del gráfico de rangos ────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
               borderRadius: 2, p: 1.5, boxShadow: 3, minWidth: 160 }}>
      <Typography fontWeight={700} fontSize="0.8rem">{d.codigo} — {d.nombre}</Typography>
      <Typography fontSize="0.75rem" color="text.secondary">{d.rango}</Typography>
      <Typography fontWeight={800} fontSize="1.1rem" mt={0.5} color={d.color}>
        {d.total} {d.total === 1 ? 'niño' : 'niños'}
      </Typography>
    </Box>
  );
}

// ── Tooltip personalizado del gráfico de género ────────────────────────────
function GeneroTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
               borderRadius: 2, p: 1.5, boxShadow: 3 }}>
      <Typography fontWeight={700} fontSize="0.82rem">{d.genero}</Typography>
      <Typography fontWeight={800} fontSize="1rem" mt={0.3} color={COLORES_GENERO[d.genero] ?? '#64748b'}>
        {d.total} {d.total === 1 ? 'niño' : 'niños'}
      </Typography>
    </Box>
  );
}

// ── Tarjeta de KPI grande ─────────────────────────────────────────────────
function KpiCard({ valor, label, sublabel, color, icon, cargando }) {
  return (
    <Box sx={{
      borderRadius: 3, p: 2.5,
      background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`,
      border: '1.5px solid', borderColor: `${color}30`,
      display: 'flex', alignItems: 'center', gap: 2, height: '100%',
    }}>
      <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: `${color}20`,
                 display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </Box>
      <Box>
        {cargando
          ? <Skeleton width={50} height={36} />
          : <Typography fontWeight={800} fontSize={{ xs: '1.6rem', sm: '2rem' }} lineHeight={1} sx={{ color }}>
              {valor}
            </Typography>}
        <Typography fontWeight={700} fontSize="0.82rem" color="text.primary" mt={0.3}>{label}</Typography>
        {sublabel && <Typography fontSize="0.72rem" color="text.secondary">{sublabel}</Typography>}
      </Box>
    </Box>
  );
}

// ── Barra de origen (departamento / país) ─────────────────────────────────
function FilaOrigen({ nombre, total, max, color }) {
  const pct = max > 0 ? Math.round((total / max) * 100) : 0;
  return (
    <Box display="flex" alignItems="center" gap={1.5} mb={0.8}>
      <Typography fontSize="0.78rem" sx={{ minWidth: 130, color: 'text.secondary', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
        title={nombre}>{nombre}</Typography>
      <Box flex={1} sx={{ bgcolor: 'action.hover', borderRadius: 4, height: 8 }}>
        <Box sx={{ width: `${pct}%`, height: 8, borderRadius: 4, bgcolor: color, transition: 'width 0.6s ease' }} />
      </Box>
      <Typography fontSize="0.78rem" fontWeight={700} sx={{ minWidth: 24, textAlign: 'right', color }}>
        {total}
      </Typography>
    </Box>
  );
}

// ── Separador de sección ──────────────────────────────────────────────────
function SeccionHeader({ titulo }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
      <Box sx={{ width: 4, height: 22, borderRadius: 1, bgcolor: 'var(--color-primario)' }} />
      <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>{titulo}</Typography>
    </Box>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { mode } = useThemeMode();
  const navigate = useNavigate();
  const hora     = new Date().getHours();
  const saludo   = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

  const [stats,    setStats]    = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    apiClient.get('/api/beneficiarios/stats-ninos')
      .then(({ data }) => setStats(data))
      .catch(() => {/* silencioso – no bloquea el dashboard */})
      .finally(() => setCargando(false));
  }, []);

  const chartData = stats?.porRango?.map((r, i) => ({
    ...r,
    color: COLORES_RANGO[i],
    label: r.codigo,
  })) ?? [];

  const generoData = stats?.porGenero?.map(g => ({
    ...g,
    color: COLORES_GENERO[g.genero] ?? '#94a3b8',
  })) ?? [];

  const maxOrigen = Math.max(
    ...(stats?.topDepartamentos?.map(d => d.total) ?? [1]),
    ...(stats?.topPaises?.map(p => p.total) ?? [1]),
    1,
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>

      {/* ── Saludo ──────────────────────────────────────────────────── */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }} gutterBottom>
          {saludo}, {user?.nombre?.split(' ')[0]}
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          Bienvenido al panel administrativo · Fundación Panorama de Colores
        </Typography>
      </Box>

      {/* ── KPIs principales ────────────────────────────────────────── */}
      <SeccionHeader titulo="Niños activos" />
      <Grid container spacing={2} sx={{ mb: 4 }}>

        {/* Total activos */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            valor={stats?.totalActivos ?? 0}
            label="Niños activos"
            sublabel="Inscritos y vigentes"
            color="var(--color-primario)"
            cargando={cargando}
            icon={<ChildCareIcon sx={{ color: 'var(--color-primario)', fontSize: 26 }} />}
          />
        </Grid>

        {/* Extranjeros */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            valor={stats?.extranjeros ?? 0}
            label="Extranjeros"
            sublabel="Nacidos fuera de Colombia"
            color="#0ea5e9"
            cargando={cargando}
            icon={<PublicIcon sx={{ color: '#0ea5e9', fontSize: 26 }} />}
          />
        </Grid>

        {/* Otras regiones */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            valor={stats?.otraRegion ?? 0}
            label="Otras regiones"
            sublabel="Colombianos de otros departamentos"
            color="#f59e0b"
            cargando={cargando}
            icon={<LocationOnIcon sx={{ color: '#f59e0b', fontSize: 26 }} />}
          />
        </Grid>
      </Grid>

      {/* ── Rangos etáreos + orígenes ────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>

        {/* Gráfico rangos */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2.5, height: '100%' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography fontWeight={700} fontSize="0.95rem">Distribución por rango etáreo</Typography>
              <Tooltip title="Clasificación del ICBF / Código de Infancia y Adolescencia (Ley 1098)">
                <InfoOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled', cursor: 'help' }} />
              </Tooltip>
            </Box>

            {/* Chips resumen */}
            <Box display="flex" flexWrap="wrap" gap={0.8} mb={2}>
              {stats?.porRango?.map((r, i) => (
                <Chip
                  key={r.codigo}
                  label={`${r.codigo}: ${r.total}`}
                  size="small"
                  sx={{
                    bgcolor: `${COLORES_RANGO[i]}20`,
                    color: COLORES_RANGO[i],
                    fontWeight: 700,
                    border: `1px solid ${COLORES_RANGO[i]}40`,
                    fontSize: '0.72rem',
                  }}
                />
              ))}
              {stats?.sinEdad > 0 && (
                <Chip
                  label={`Sin fecha: ${stats.sinEdad}`}
                  size="small"
                  sx={{ bgcolor: 'action.hover', fontWeight: 600, fontSize: '0.72rem' }}
                />
              )}
            </Box>

            {cargando ? (
              <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={mode === 'dark' ? '#333' : '#f0f0f0'} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <RTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={52}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Leyenda */}
            <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
              {[
                { codigo: 'PI',  nombre: 'Primera infancia',  rango: '0 – 5 años',   i: 0 },
                { codigo: 'IN1', nombre: 'Infancia inicial',  rango: '6 – 8 años',   i: 1 },
                { codigo: 'IN2', nombre: 'Infancia media',    rango: '9 – 11 años',  i: 2 },
                { codigo: 'PA',  nombre: 'Preadolescencia',   rango: '12 – 13 años', i: 3 },
                { codigo: 'AD',  nombre: 'Adolescencia',      rango: '14 – 16 años', i: 4 },
              ].map(({ codigo, nombre, rango, i }) => (
                <Box key={codigo} display="flex" alignItems="center" gap={0.8}>
                  <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: COLORES_RANGO[i], flexShrink: 0 }} />
                  <Typography fontSize="0.7rem" color="text.secondary">
                    <strong>{codigo}</strong> {nombre} <span style={{ opacity: 0.7 }}>({rango})</span>
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>

        {/* Orígenes */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2.5, height: '100%' }}>
            <Typography fontWeight={700} fontSize="0.95rem" mb={2}>Lugar de origen</Typography>

            {/* Extranjeros */}
            {(stats?.topPaises?.length > 0 || stats?.extranjeros > 0) && (
              <Box mb={2}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <PublicIcon sx={{ fontSize: 15, color: '#0ea5e9' }} />
                  <Typography fontSize="0.78rem" fontWeight={700} color="#0ea5e9">
                    Extranjeros ({stats?.extranjeros ?? 0})
                  </Typography>
                </Box>
                {cargando
                  ? <Skeleton height={60} />
                  : stats?.topPaises?.length > 0
                    ? stats.topPaises.map(p => (
                        <FilaOrigen key={p.pais} nombre={p.pais} total={p.total} max={maxOrigen} color="#0ea5e9" />
                      ))
                    : <Typography fontSize="0.75rem" color="text.disabled">Sin registros de país</Typography>
                }
              </Box>
            )}

            {/* Otras regiones colombianas */}
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <LocationOnIcon sx={{ fontSize: 15, color: '#f59e0b' }} />
                <Typography fontSize="0.78rem" fontWeight={700} color="#f59e0b">
                  Otras regiones de Colombia ({stats?.otraRegion ?? 0})
                </Typography>
              </Box>
              {cargando
                ? <Skeleton height={80} />
                : stats?.topDepartamentos?.length > 0
                  ? stats.topDepartamentos.map(d => (
                      <FilaOrigen key={d.departamento} nombre={d.departamento} total={d.total} max={maxOrigen} color="#f59e0b" />
                    ))
                  : <Typography fontSize="0.75rem" color="text.disabled">Sin registros de departamento</Typography>
              }
            </Box>

            {!cargando && stats?.extranjeros === 0 && stats?.otraRegion === 0 && (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <LocationOnIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
                <Typography fontSize="0.8rem" color="text.disabled" mt={1}>
                  Todos los niños son del Valle del Cauca
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* ── Género ──────────────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2.5, height: '100%' }}>
            <Typography fontWeight={700} fontSize="0.95rem" mb={2}>Niños y niñas</Typography>
            {cargando ? (
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            ) : generoData.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography fontSize="0.8rem" color="text.disabled">Sin datos de género registrados</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={generoData}
                    dataKey="total"
                    nameKey="genero"
                    cx="50%"
                    cy="45%"
                    outerRadius={80}
                    label={({ genero, percent }) =>
                      percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : ''
                    }
                    labelLine={false}
                  >
                    {generoData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RTooltip content={<GeneroTooltip />} />
                  <Legend
                    formatter={(value) => (
                      <span style={{ fontSize: '0.75rem', color: 'inherit' }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2.5, height: '100%' }}>
            <Typography fontWeight={700} fontSize="0.95rem" mb={2}>Detalle por género</Typography>
            {cargando ? (
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            ) : generoData.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography fontSize="0.8rem" color="text.disabled">Sin datos registrados</Typography>
              </Box>
            ) : (
              generoData.map(g => {
                const pct = stats?.totalActivos > 0
                  ? Math.round((g.total / stats.totalActivos) * 100)
                  : 0;
                return (
                  <Box key={g.genero} mb={1.5}>
                    <Box display="flex" justifyContent="space-between" mb={0.4}>
                      <Typography fontSize="0.82rem" fontWeight={600} sx={{ color: g.color }}>
                        {g.genero}
                      </Typography>
                      <Typography fontSize="0.82rem" fontWeight={700} sx={{ color: g.color }}>
                        {g.total} <span style={{ fontWeight: 400, color: '#94a3b8' }}>({pct}%)</span>
                      </Typography>
                    </Box>
                    <Box sx={{ bgcolor: 'action.hover', borderRadius: 4, height: 10 }}>
                      <Box sx={{
                        width: `${pct}%`, height: 10, borderRadius: 4,
                        bgcolor: g.color, transition: 'width 0.6s ease',
                      }} />
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>
        </Grid>
      </Grid>

      {/* ── Acceso rápido ───────────────────────────────────────────── */}
      <SeccionHeader titulo="Acceso rápido" />
      <Grid container spacing={2.5}>
        {MODULOS.map(({ label, desc, icon, grad, ruta }) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={label}>
            <Card elevation={0} sx={{
              borderRadius: 3, overflow: 'hidden', height: '100%',
              transition: 'transform 0.18s, box-shadow 0.18s',
              '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' },
            }}>
              <CardActionArea onClick={() => navigate(ruta)} sx={{
                background: grad, p: 3, height: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              }}>
                <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.18)',
                           display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', mb: 2 }}>
                  {icon}
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', lineHeight: 1.2 }}>
                  {label}
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
                  {desc}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

    </Box>
  );
}
