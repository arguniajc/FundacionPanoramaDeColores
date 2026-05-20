import { useState, useEffect } from 'react';
import { Alert, Grid } from '@mui/material';
import EventIcon  from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';
import {
  BarChart, Bar, CartesianGrid, Cell, Legend,
  PieChart, Pie, Tooltip, XAxis, YAxis,
} from 'recharts';
import apiClient from '../../../../../infrastructure/http/apiClient';
import { COLORES, GraficaCard, KpiCard, SkeletonSection, TooltipCustom } from './helpers';

export function TabActividades() {
  const [data,  setData]  = useState(null);
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
        <KpiCard label="Total actividades"  value={resumen.total}           icon={<EventIcon fontSize="inherit" />}  color="#4E1B95" />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <KpiCard label="Completadas"        value={resumen.completadas}     icon={<EventIcon fontSize="inherit" />}  color="#10B981" />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <KpiCard label="En curso"           value={resumen.enCurso}         icon={<EventIcon fontSize="inherit" />}  color="#F59E0B" />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <KpiCard label="Planificadas"       value={resumen.planificadas}    icon={<EventIcon fontSize="inherit" />}  color="#2563EB" />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <KpiCard label="Total asistencias"  value={resumen.totalAsistencia} icon={<PeopleIcon fontSize="inherit" />} color="#7C3AED" />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <KpiCard label="Prom. asistencia"   value={resumen.promedioAsistencia} icon={<PeopleIcon fontSize="inherit" />} color="#06B6D4" />
      </Grid>

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

      <Grid size={{ xs: 12, md: 4 }}>
        <GraficaCard titulo="Por estado" height={240}>
          <PieChart>
            <Pie data={porEstado} dataKey="cantidad" nameKey="etiqueta" cx="50%" cy="50%" outerRadius={90}
              label={({ percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
              {porEstado.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v, n]} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </GraficaCard>
      </Grid>

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
              <Bar dataKey="asistieron" name="Asistieron" fill="#10B981" radius={[4,4,0,0]} />
            </BarChart>
          </GraficaCard>
        </Grid>
      )}
    </Grid>
  );
}
