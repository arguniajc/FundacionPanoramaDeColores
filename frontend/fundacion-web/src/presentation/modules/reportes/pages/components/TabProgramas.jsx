import { useState, useEffect } from 'react';
import { Alert, Grid } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import PeopleIcon from '@mui/icons-material/People';
import {
  BarChart, Bar, CartesianGrid, Cell, Legend,
  PieChart, Pie, Tooltip, XAxis, YAxis,
} from 'recharts';
import apiClient from '../../../../../infrastructure/http/apiClient';
import { COLORES, GraficaCard, KpiCard, SkeletonSection, TooltipCustom } from './helpers';

export function TabProgramas() {
  const [data,  setData]  = useState(null);
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

      <Grid size={{ xs: 12, md: 8 }}>
        <GraficaCard titulo="Inscripciones por programa" height={300}>
          <BarChart data={inscritosPorPrograma}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="programa" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip content={<TooltipCustom />} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="inscritos"        name="Total inscritos" fill="#7C3AED" radius={[4,4,0,0]} />
            <Bar dataKey="inscritosActivos" name="Activos"         fill="#10B981" radius={[4,4,0,0]} />
          </BarChart>
        </GraficaCard>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <GraficaCard titulo="Estado de inscripciones">
          <PieChart>
            <Pie data={estadoInscripciones} dataKey="cantidad" nameKey="etiqueta" cx="50%" cy="50%" outerRadius={90}
              label={({ etiqueta, percent }) => `${etiqueta} ${(percent*100).toFixed(0)}%`} labelLine={false}>
              {estadoInscripciones.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v, n]} />
          </PieChart>
        </GraficaCard>
      </Grid>

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
