import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Tabs, Tab, Grid, Card, CardContent,
  Alert, Skeleton, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, LinearProgress,
} from '@mui/material';
import PeopleIcon          from '@mui/icons-material/People';
import FolderIcon          from '@mui/icons-material/Folder';
import InventoryIcon       from '@mui/icons-material/Inventory';
import EventIcon           from '@mui/icons-material/Event';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import WarningAmberIcon    from '@mui/icons-material/WarningAmber';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer,
} from 'recharts';
import apiClient from '../../../../infrastructure/http/apiClient';

// ── Paleta de colores para gráficas ─────────────────────────────────────────
const COLORES = ['#4E1B95','#7C3AED','#A78BFA','#2563EB','#60A5FA','#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4'];

// ── Componente tarjeta KPI ────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'primary.main', icon }) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '12px !important' }}>
        <Box sx={{ color, fontSize: 36, lineHeight: 1 }}>{icon}</Box>
        <Box>
          <Typography variant="h5" fontWeight={700} color={color}>{value ?? '—'}</Typography>
          <Typography variant="body2" fontWeight={500}>{label}</Typography>
          {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Wrapper de gráfica con título ─────────────────────────────────────────────
function GraficaCard({ titulo, children, height = 260 }) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" fontWeight={700} mb={1} color="text.secondary">{titulo}</Typography>
        <Box sx={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Skeleton de carga ─────────────────────────────────────────────────────────
function SkeletonSection() {
  return (
    <Grid container spacing={2}>
      {[1,2,3,4].map(i => (
        <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
          <Skeleton variant="rounded" height={90} />
        </Grid>
      ))}
      {[1,2,3].map(i => (
        <Grid key={i} size={{ xs: 12, md: 4 }}>
          <Skeleton variant="rounded" height={300} />
        </Grid>
      ))}
    </Grid>
  );
}

// ── Tooltip personalizado ─────────────────────────────────────────────────────
const TooltipCustom = ({ active, payload, label, prefix = '', suffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <Paper elevation={3} sx={{ p: 1.5, fontSize: 13 }}>
      <Typography variant="caption" fontWeight={700}>{label}</Typography>
      {payload.map((p, i) => (
        <Box key={i} sx={{ color: p.color }}>
          {p.name}: {prefix}{p.value?.toLocaleString('es-CO')}{suffix}
        </Box>
      ))}
    </Paper>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// TABS
// ════════════════════════════════════════════════════════════════════════════

function TabBeneficiarios() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    apiClient.get('/api/reportes/beneficiarios')
      .then(r => setData(r.data))
      .catch(() => setError('Error al cargar reporte de beneficiarios'));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data)  return <SkeletonSection />;

  const { resumen, porEdad, porGenero, porPrograma, porGrado, nuevosPorMes } = data;

  return (
    <Grid container spacing={2}>
      {/* KPIs */}
      <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
        <KpiCard label="Total registrados" value={resumen.total} icon={<PeopleIcon fontSize="inherit" />} color="#4E1B95" />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
        <KpiCard label="Activos" value={resumen.activos} icon={<PeopleIcon fontSize="inherit" />} color="#10B981" />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
        <KpiCard label="Inactivos / baja" value={resumen.inactivos} icon={<PeopleIcon fontSize="inherit" />} color="#EF4444" />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
        <KpiCard label="Con discapacidad" value={resumen.conDiscapacidad} icon={<PeopleIcon fontSize="inherit" />} color="#F59E0B" />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
        <KpiCard label="Con autorización" value={resumen.conAutorizacion} icon={<PeopleIcon fontSize="inherit" />} color="#2563EB" />
      </Grid>

      {/* Nuevos por mes - ancho completo */}
      <Grid size={{ xs: 12 }}>
        <GraficaCard titulo="Nuevos beneficiarios por mes (últimos 12 meses)" height={220}>
          <AreaChart data={nuevosPorMes}>
            <defs>
              <linearGradient id="gradBen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#4E1B95" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#4E1B95" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip content={<TooltipCustom />} />
            <Area type="monotone" dataKey="cantidad" name="Nuevos" stroke="#4E1B95" fill="url(#gradBen)" strokeWidth={2} />
          </AreaChart>
        </GraficaCard>
      </Grid>

      {/* Por edad */}
      <Grid size={{ xs: 12, md: 6 }}>
        <GraficaCard titulo="Distribución por rango de edad">
          <BarChart data={porEdad} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="etiqueta" width={80} tick={{ fontSize: 11 }} />
            <Tooltip content={<TooltipCustom />} />
            <Bar dataKey="cantidad" name="Beneficiarios" fill="#4E1B95" radius={[0,4,4,0]}>
              {porEdad.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
            </Bar>
          </BarChart>
        </GraficaCard>
      </Grid>

      {/* Por género */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <GraficaCard titulo="Por género / sexo">
          <PieChart>
            <Pie data={porGenero} dataKey="cantidad" nameKey="etiqueta" cx="50%" cy="50%" outerRadius={90} label={({ etiqueta, percent }) => `${etiqueta} ${(percent*100).toFixed(0)}%`} labelLine={false}>
              {porGenero.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v, n]} />
          </PieChart>
        </GraficaCard>
      </Grid>

      {/* Por grado escolar */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <GraficaCard titulo="Por grado escolar">
          <PieChart>
            <Pie data={porGrado.slice(0,8)} dataKey="cantidad" nameKey="etiqueta" cx="50%" cy="50%" outerRadius={90} label={({ etiqueta, percent }) => percent > 0.04 ? `${(percent*100).toFixed(0)}%` : ''} labelLine={false}>
              {porGrado.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v, n]} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </GraficaCard>
      </Grid>

      {/* Por programa */}
      <Grid size={{ xs: 12 }}>
        <GraficaCard titulo="Beneficiarios por programa (top 10)" height={260}>
          <BarChart data={porPrograma}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip content={<TooltipCustom />} />
            <Bar dataKey="cantidad" name="Inscritos" radius={[4,4,0,0]}>
              {porPrograma.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
            </Bar>
          </BarChart>
        </GraficaCard>
      </Grid>
    </Grid>
  );
}

function TabProgramas() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    apiClient.get('/api/reportes/programas')
      .then(r => setData(r.data))
      .catch(() => setError('Error al cargar reporte de programas'));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data)  return <SkeletonSection />;

  const { resumen, inscritosPorPrograma, estadoInscripciones, porSede } = data;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 6, sm: 4, md: 4 }}>
        <KpiCard label="Total programas" value={resumen.total} icon={<FolderIcon fontSize="inherit" />} color="#4E1B95" />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 4 }}>
        <KpiCard label="Programas activos" value={resumen.activos} icon={<FolderIcon fontSize="inherit" />} color="#10B981" />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 4 }}>
        <KpiCard label="Total inscripciones activas" value={resumen.totalInscritos} icon={<PeopleIcon fontSize="inherit" />} color="#2563EB" />
      </Grid>

      {/* Inscritos por programa */}
      <Grid size={{ xs: 12, md: 8 }}>
        <GraficaCard titulo="Inscripciones por programa" height={300}>
          <BarChart data={inscritosPorPrograma}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="programa" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip content={<TooltipCustom />} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="inscritos" name="Total inscritos" fill="#7C3AED" radius={[4,4,0,0]} />
            <Bar dataKey="inscritosActivos" name="Activos" fill="#10B981" radius={[4,4,0,0]} />
          </BarChart>
        </GraficaCard>
      </Grid>

      {/* Estado inscripciones */}
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <GraficaCard titulo="Estado de inscripciones">
          <PieChart>
            <Pie data={estadoInscripciones} dataKey="cantidad" nameKey="etiqueta" cx="50%" cy="50%" outerRadius={90} label={({ etiqueta, percent }) => `${etiqueta} ${(percent*100).toFixed(0)}%`} labelLine={false}>
              {estadoInscripciones.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v, n]} />
          </PieChart>
        </GraficaCard>
      </Grid>

      {/* Por sede */}
      <Grid size={{ xs: 12, md: 6 }}>
        <GraficaCard titulo="Programas por sede">
          <BarChart data={porSede}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip content={<TooltipCustom />} />
            <Bar dataKey="cantidad" name="Programas" radius={[4,4,0,0]}>
              {porSede.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
            </Bar>
          </BarChart>
        </GraficaCard>
      </Grid>
    </Grid>
  );
}

function TabInventario() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    apiClient.get('/api/reportes/inventario')
      .then(r => setData(r.data))
      .catch(() => setError('Error al cargar reporte de inventario'));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data)  return <SkeletonSection />;

  const { resumen, porCategoria, movimientosPorTipo, itemsCriticos } = data;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 6, sm: 3 }}>
        <KpiCard label="Total ítems" value={resumen.totalItems} icon={<InventoryIcon fontSize="inherit" />} color="#4E1B95" />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <KpiCard label="Bajo stock mínimo" value={resumen.itemsBajoStock} icon={<WarningAmberIcon fontSize="inherit" />} color="#EF4444" />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <KpiCard label="Categorías" value={resumen.categorias} icon={<InventoryIcon fontSize="inherit" />} color="#F59E0B" />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <KpiCard label="Stock total (unidades)" value={Number(resumen.stockTotal).toLocaleString('es-CO')} icon={<InventoryIcon fontSize="inherit" />} color="#10B981" />
      </Grid>

      {/* Por categoría - barras */}
      <Grid size={{ xs: 12, md: 6 }}>
        <GraficaCard titulo="Ítems por categoría">
          <BarChart data={porCategoria}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="categoria" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip content={<TooltipCustom />} />
            <Bar dataKey="items" name="Ítems" radius={[4,4,0,0]}>
              {porCategoria.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
            </Bar>
          </BarChart>
        </GraficaCard>
      </Grid>

      {/* Movimientos últimos 30 días */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <GraficaCard titulo="Movimientos últimos 30 días">
          <PieChart>
            <Pie data={movimientosPorTipo} dataKey="cantidad" nameKey="etiqueta" cx="50%" cy="50%" outerRadius={90} label={({ etiqueta, percent }) => percent > 0.05 ? `${(percent*100).toFixed(0)}%` : ''} labelLine={false}>
              {movimientosPorTipo.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v, n]} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </GraficaCard>
      </Grid>

      {/* Stock por categoría */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <GraficaCard titulo="Stock total por categoría">
          <PieChart>
            <Pie data={porCategoria} dataKey="stockTotal" nameKey="categoria" cx="50%" cy="50%" outerRadius={90} label={({ percent }) => percent > 0.05 ? `${(percent*100).toFixed(0)}%` : ''} labelLine={false}>
              {porCategoria.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => [v?.toLocaleString('es-CO'), 'Stock']} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </GraficaCard>
      </Grid>

      {/* Tabla ítems críticos */}
      {itemsCriticos.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'error.light' }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <WarningAmberIcon color="error" fontSize="small" />
                <Typography variant="subtitle2" fontWeight={700} color="error.main">
                  Ítems bajo stock mínimo
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell fontWeight={700}>Ítem</TableCell>
                      <TableCell>Categoría</TableCell>
                      <TableCell align="right">Stock actual</TableCell>
                      <TableCell align="right">Stock mínimo</TableCell>
                      <TableCell>Nivel</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {itemsCriticos.map((it, i) => {
                      const pct = it.stockMinimo > 0 ? Math.min(100, (it.stockActual / it.stockMinimo) * 100) : 0;
                      return (
                        <TableRow key={i} hover>
                          <TableCell>{it.nombre}</TableCell>
                          <TableCell><Chip label={it.categoria} size="small" /></TableCell>
                          <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>{Number(it.stockActual).toLocaleString('es-CO')}</TableCell>
                          <TableCell align="right">{Number(it.stockMinimo).toLocaleString('es-CO')}</TableCell>
                          <TableCell sx={{ minWidth: 120 }}>
                            <LinearProgress variant="determinate" value={pct} color="error" sx={{ height: 8, borderRadius: 4 }} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
}

function TabActividades() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    apiClient.get('/api/reportes/actividades')
      .then(r => setData(r.data))
      .catch(() => setError('Error al cargar reporte de actividades'));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data)  return <SkeletonSection />;

  const { resumen, porEstado, asistenciaPorActividad, porMes } = data;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <KpiCard label="Total actividades" value={resumen.total} icon={<EventIcon fontSize="inherit" />} color="#4E1B95" />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <KpiCard label="Completadas" value={resumen.completadas} icon={<EventIcon fontSize="inherit" />} color="#10B981" />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <KpiCard label="En curso" value={resumen.enCurso} icon={<EventIcon fontSize="inherit" />} color="#F59E0B" />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <KpiCard label="Planificadas" value={resumen.planificadas} icon={<EventIcon fontSize="inherit" />} color="#2563EB" />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <KpiCard label="Total asistencias" value={resumen.totalAsistencia} icon={<PeopleIcon fontSize="inherit" />} color="#7C3AED" />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <KpiCard label="Promedio asistencia" value={resumen.promedioAsistencia} icon={<PeopleIcon fontSize="inherit" />} color="#06B6D4" />
      </Grid>

      {/* Por mes */}
      <Grid size={{ xs: 12, md: 8 }}>
        <GraficaCard titulo="Actividades por mes (últimos 12 meses)" height={240}>
          <BarChart data={porMes}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip content={<TooltipCustom />} />
            <Bar dataKey="cantidad" name="Actividades" fill="#4E1B95" radius={[4,4,0,0]}>
              {porMes.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
            </Bar>
          </BarChart>
        </GraficaCard>
      </Grid>

      {/* Por estado */}
      <Grid size={{ xs: 12, md: 4 }}>
        <GraficaCard titulo="Por estado" height={240}>
          <PieChart>
            <Pie data={porEstado} dataKey="cantidad" nameKey="etiqueta" cx="50%" cy="50%" outerRadius={90} label={({ etiqueta, percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
              {porEstado.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v, n]} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </GraficaCard>
      </Grid>

      {/* Asistencia por actividad */}
      {asistenciaPorActividad.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <GraficaCard titulo="Asistencia en actividades completadas (últimas 10)" height={280}>
            <BarChart data={asistenciaPorActividad}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="titulo" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<TooltipCustom />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="inscritos"  name="Inscritos"  fill="#A78BFA" radius={[4,4,0,0]} />
              <Bar dataKey="asistieron" name="Asistieron" fill="#10B981"  radius={[4,4,0,0]} />
            </BarChart>
          </GraficaCard>
        </Grid>
      )}
    </Grid>
  );
}

function TabDonaciones() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    apiClient.get('/api/reportes/donaciones')
      .then(r => setData(r.data))
      .catch(() => setError('Error al cargar reporte de donaciones'));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data)  return <SkeletonSection />;

  const { resumen, porTipo, montosPorMes, topDonantes } = data;

  const fmtCop = (v) => `$${Number(v).toLocaleString('es-CO')}`;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 6, sm: 4 }}>
        <KpiCard label="Total donaciones" value={resumen.total} icon={<VolunteerActivismIcon fontSize="inherit" />} color="#4E1B95" />
      </Grid>
      <Grid size={{ xs: 6, sm: 4 }}>
        <KpiCard label="Monto recaudado" value={fmtCop(resumen.totalMonto)} icon={<VolunteerActivismIcon fontSize="inherit" />} color="#10B981" />
      </Grid>
      <Grid size={{ xs: 6, sm: 4 }}>
        <KpiCard label="Promedio por donación" value={fmtCop(resumen.promedioMonto)} icon={<VolunteerActivismIcon fontSize="inherit" />} color="#F59E0B" />
      </Grid>

      {/* Monto por mes */}
      <Grid size={{ xs: 12 }}>
        <GraficaCard titulo="Recaudación mensual últimos 12 meses (COP)" height={230}>
          <AreaChart data={montosPorMes}>
            <defs>
              <linearGradient id="gradDon" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
            <Tooltip content={<TooltipCustom prefix="$" />} />
            <Area type="monotone" dataKey="monto" name="Monto (COP)" stroke="#10B981" fill="url(#gradDon)" strokeWidth={2} />
          </AreaChart>
        </GraficaCard>
      </Grid>

      {/* Por tipo */}
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <GraficaCard titulo="Por tipo de donación">
          <PieChart>
            <Pie data={porTipo} dataKey="cantidad" nameKey="tipo" cx="50%" cy="50%" outerRadius={90} label={({ tipo, percent }) => `${tipo} ${(percent*100).toFixed(0)}%`} labelLine={false}>
              {porTipo.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v, n]} />
          </PieChart>
        </GraficaCard>
      </Grid>

      {/* Top donantes */}
      {topDonantes.length > 0 && (
        <Grid size={{ xs: 12, md: 8 }}>
          <GraficaCard titulo="Top donantes por monto (COP)">
            <BarChart data={topDonantes} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="nombre" width={120} tick={{ fontSize: 11 }} />
              <Tooltip content={<TooltipCustom prefix="$" />} />
              <Bar dataKey="totalMonto" name="Monto (COP)" radius={[0,4,4,0]}>
                {topDonantes.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
              </Bar>
            </BarChart>
          </GraficaCard>
        </Grid>
      )}
    </Grid>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const TABS = [
  { label: 'Beneficiarios', icon: <PeopleIcon />,            component: <TabBeneficiarios /> },
  { label: 'Programas',     icon: <FolderIcon />,            component: <TabProgramas /> },
  { label: 'Inventario',    icon: <InventoryIcon />,          component: <TabInventario /> },
  { label: 'Actividades',   icon: <EventIcon />,              component: <TabActividades /> },
  { label: 'Donaciones',    icon: <VolunteerActivismIcon />,  component: <TabDonaciones /> },
];

export default function ReportesPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Reportes y Estadísticas</Typography>
        <Typography variant="body2" color="text.secondary">
          Visualización de datos e indicadores clave por módulo
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        {TABS.map((t, i) => (
          <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" sx={{ minHeight: 48, gap: 0.5 }} />
        ))}
      </Tabs>

      {TABS[tab].component}
    </Box>
  );
}
