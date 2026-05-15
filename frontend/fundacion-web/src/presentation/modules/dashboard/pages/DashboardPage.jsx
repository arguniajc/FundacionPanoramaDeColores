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
import ExpandMoreIcon       from '@mui/icons-material/ExpandMore';
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

  const [deptoExpandido, setDeptoExpandido] = useState(null);

  const maxDepto = Math.max(
    ...(stats?.departamentosConCiudades?.map(d => d.total) ?? [1]),
    1,
  );
  const maxPais = Math.max(
    ...(stats?.topPaises?.map(p => p.total) ?? [1]),
    1,
  );

  const renderLabelGenero = ({ cx, cy, midAngle, outerRadius, percent, index }) => {
    if (percent < 0.03) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 44;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const g = generoData[index];
    if (!g) return null;
    return (
      <text x={x} y={y} fill={g.color}
            textAnchor={x > cx ? 'start' : 'end'}
            dominantBaseline="central"
            fontSize={12} fontWeight={700}>
        {`${g.genero}: ${g.total} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

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

            {/* Título */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2.5}>
              <Typography fontWeight={800} fontSize="0.95rem">Lugar de origen</Typography>
              <Box sx={{ fontSize: '0.68rem', color: 'text.disabled', fontWeight: 500 }}>
                clic en depto. para ver ciudades
              </Box>
            </Box>

            {/* ── Extranjeros ── */}
            <Box mb={2.5}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Box display="flex" alignItems="center" gap={0.8}>
                  <PublicIcon sx={{ fontSize: 14, color: '#0ea5e9' }} />
                  <Typography fontSize="0.72rem" fontWeight={700} color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Extranjeros
                  </Typography>
                </Box>
                <Box sx={{
                  bgcolor: '#0ea5e915', color: '#0ea5e9', px: 1.2, py: 0.25,
                  borderRadius: 2, fontSize: '0.78rem', fontWeight: 800,
                  border: '1px solid #0ea5e930',
                }}>
                  {stats?.extranjeros ?? 0}
                </Box>
              </Box>
              {cargando ? <Skeleton height={44} sx={{ borderRadius: 2 }} /> :
                stats?.topPaises?.length > 0
                  ? stats.topPaises.map((p, i) => (
                      <Box key={p.pais} display="flex" alignItems="center" gap={1.5}
                        sx={{ p: '5px 8px', borderRadius: 2, mb: 0.4,
                              '&:hover': { bgcolor: 'action.hover' } }}>
                        <Typography fontSize="0.65rem" fontWeight={700} color="text.disabled"
                          sx={{ minWidth: 14 }}>
                          {i + 1}
                        </Typography>
                        <Typography fontSize="0.8rem" fontWeight={600} color="text.primary"
                          sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={p.pais}>{p.pais}
                        </Typography>
                        <Box sx={{
                          bgcolor: '#0ea5e915', color: '#0ea5e9', px: 0.9, py: 0.1,
                          borderRadius: 1.5, fontSize: '0.72rem', fontWeight: 800,
                          minWidth: 24, textAlign: 'center',
                        }}>
                          {p.total}
                        </Box>
                      </Box>
                    ))
                  : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1,
                                bgcolor: 'action.hover', borderRadius: 2 }}>
                      <PublicIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography fontSize="0.74rem" color="text.disabled" fontStyle="italic">
                        Todos los niños son de Colombia
                      </Typography>
                    </Box>
                  )
              }
            </Box>

            {/* Divisor */}
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />

            {/* ── Departamentos acordeón ── */}
            <Box>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Box display="flex" alignItems="center" gap={0.8}>
                  <LocationOnIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                  <Typography fontSize="0.72rem" fontWeight={700} color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Colombia · departamentos
                  </Typography>
                </Box>
              </Box>

              {cargando ? <Skeleton height={120} sx={{ borderRadius: 2 }} /> :
                stats?.departamentosConCiudades?.length > 0
                  ? stats.departamentosConCiudades.map((d, i) => {
                      const abierto = deptoExpandido === d.departamento;
                      const hasCiudades = d.ciudades?.length > 0;
                      return (
                        <Box key={d.departamento}>
                          {/* Fila departamento */}
                          <Box
                            onClick={() => hasCiudades && setDeptoExpandido(abierto ? null : d.departamento)}
                            sx={{
                              display: 'flex', alignItems: 'center', gap: 1.2,
                              p: '6px 8px', borderRadius: 2, mb: 0.3,
                              cursor: hasCiudades ? 'pointer' : 'default',
                              transition: 'background 0.15s',
                              bgcolor: abierto ? '#f59e0b08' : 'transparent',
                              border: abierto ? '1px solid #f59e0b20' : '1px solid transparent',
                              '&:hover': hasCiudades ? { bgcolor: '#f59e0b08' } : {},
                            }}
                          >
                            <Typography fontSize="0.64rem" fontWeight={700} color="text.disabled"
                              sx={{ minWidth: 14, textAlign: 'center' }}>
                              {i + 1}
                            </Typography>
                            <Typography fontSize="0.8rem" fontWeight={600}
                              sx={{ flex: 1, color: abierto ? '#f59e0b' : 'text.primary',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    transition: 'color 0.15s' }}
                              title={d.departamento}>{d.departamento}
                            </Typography>
                            <Box sx={{
                              bgcolor: abierto ? '#f59e0b' : '#f59e0b15',
                              color: abierto ? '#fff' : '#f59e0b',
                              px: 0.9, py: 0.1, borderRadius: 1.5,
                              fontSize: '0.72rem', fontWeight: 800,
                              minWidth: 24, textAlign: 'center',
                              transition: 'all 0.15s',
                            }}>
                              {d.total}
                            </Box>
                            {hasCiudades && (
                              <ExpandMoreIcon sx={{
                                fontSize: 15, color: abierto ? '#f59e0b' : 'text.disabled',
                                flexShrink: 0, transition: 'transform 0.2s, color 0.15s',
                                transform: abierto ? 'rotate(180deg)' : 'none',
                              }} />
                            )}
                          </Box>

                          {/* Ciudades desplegadas */}
                          {abierto && hasCiudades && (
                            <Box sx={{ ml: 3, mb: 0.8, pl: 1.5,
                                        borderLeft: '2px solid', borderColor: '#f59e0b40' }}>
                              {d.ciudades.map(c => (
                                <Box key={c.ciudad} display="flex" alignItems="center"
                                  justifyContent="space-between"
                                  sx={{ py: 0.4, px: 0.5, borderRadius: 1.5,
                                        '&:hover': { bgcolor: 'action.hover' } }}>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Box sx={{ width: 5, height: 5, borderRadius: '50%',
                                                bgcolor: '#8b5cf6', flexShrink: 0 }} />
                                    <Typography fontSize="0.75rem" color="text.secondary"
                                      sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}
                                      title={c.ciudad}>{c.ciudad}
                                    </Typography>
                                  </Box>
                                  <Box sx={{
                                    bgcolor: '#8b5cf615', color: '#8b5cf6',
                                    px: 0.8, py: 0.1, borderRadius: 1.5,
                                    fontSize: '0.7rem', fontWeight: 800,
                                    minWidth: 22, textAlign: 'center',
                                  }}>
                                    {c.total}
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          )}
                        </Box>
                      );
                    })
                  : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1,
                                bgcolor: 'action.hover', borderRadius: 2 }}>
                      <LocationOnIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography fontSize="0.74rem" color="text.disabled" fontStyle="italic">
                        Sin departamentos registrados
                      </Typography>
                    </Box>
                  )
              }
            </Box>

          </Box>
        </Grid>

      </Grid>

      {/* ── Género ──────────────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12 }}>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2.5 }}>
            <Typography fontWeight={700} fontSize="0.95rem" mb={1}>Niños y niñas</Typography>
            {cargando ? (
              <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
            ) : generoData.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography fontSize="0.8rem" color="text.disabled">Sin datos de género registrados</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={generoData}
                    dataKey="total"
                    nameKey="genero"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    label={renderLabelGenero}
                    labelLine={{ strokeWidth: 1, stroke: '#94a3b8' }}
                  >
                    {generoData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RTooltip content={<GeneroTooltip />} />
                </PieChart>
              </ResponsiveContainer>
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
