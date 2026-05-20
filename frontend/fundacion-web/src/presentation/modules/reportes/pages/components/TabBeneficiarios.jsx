import { useState, useEffect } from 'react';
import { Alert, Grid } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid, Cell,
  Legend, PieChart, Pie, Tooltip, XAxis, YAxis,
} from 'recharts';
import apiClient from '../../../../../infrastructure/http/apiClient';
import { COLORES, GraficaCard, KpiCard, SkeletonSection, TooltipCustom } from './helpers';

export function TabBeneficiarios() {
  const [data,  setData]  = useState(null);
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

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <GraficaCard titulo="Por género / sexo">
          <PieChart>
            <Pie data={porGenero} dataKey="cantidad" nameKey="etiqueta" cx="50%" cy="50%" outerRadius={90}
              label={({ etiqueta, percent }) => `${etiqueta} ${(percent*100).toFixed(0)}%`} labelLine={false}>
              {porGenero.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v, n]} />
          </PieChart>
        </GraficaCard>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <GraficaCard titulo="Por grado escolar">
          <PieChart>
            <Pie data={porGrado.slice(0,8)} dataKey="cantidad" nameKey="etiqueta" cx="50%" cy="50%" outerRadius={90}
              label={({ percent }) => percent > 0.04 ? `${(percent*100).toFixed(0)}%` : ''} labelLine={false}>
              {porGrado.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v, n]} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </GraficaCard>
      </Grid>

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
