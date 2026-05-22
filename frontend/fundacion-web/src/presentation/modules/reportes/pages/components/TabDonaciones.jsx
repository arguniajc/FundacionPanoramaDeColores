import { useState, useEffect } from 'react';
import { Alert, Box, FormControl, Grid, InputLabel, MenuItem, Select } from '@mui/material';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid, Cell,
  PieChart, Pie, Tooltip, XAxis, YAxis,
} from 'recharts';
import apiClient from '../../../../../infrastructure/http/apiClient';
import { COLORES, GraficaCard, KpiCard, SkeletonSection, TooltipCustom } from './helpers';

export function TabDonaciones() {
  const hoy   = new Date();
  const [anio,  setAnio]  = useState(hoy.getFullYear());
  const [data,  setData]  = useState(null);
  const [error, setError] = useState('');

  const anios = Array.from({ length: 5 }, (_, i) => hoy.getFullYear() - i);

  useEffect(() => {
    setData(null);
    apiClient.get('/api/reportes/donaciones', { params: { anio } })
      .then(r => setData(r.data))
      .catch(() => setError('Error al cargar reporte de donaciones'));
  }, [anio]);

  if (error) return <Alert severity="error">{error}</Alert>;

  const fmtCop = (v) => `$${Number(v).toLocaleString('es-CO')}`;
  const { resumen, porTipo, montosPorMes, topDonantes } = data ?? {};

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel>Año</InputLabel>
            <Select value={anio} label="Año" onChange={e => setAnio(Number(e.target.value))}>
              {anios.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      </Grid>

      {!data ? <Grid size={{ xs: 12 }}><SkeletonSection /></Grid> : <>
        <Grid size={{ xs: 6, sm: 4 }}>
          <KpiCard label="Total donaciones"      value={resumen.total}             icon={<VolunteerActivismIcon fontSize="inherit" />} color="#4E1B95" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <KpiCard label="Monto recaudado"       value={fmtCop(resumen.totalMonto)}    icon={<VolunteerActivismIcon fontSize="inherit" />} color="#10B981" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <KpiCard label="Promedio por donación" value={fmtCop(resumen.promedioMonto)} icon={<VolunteerActivismIcon fontSize="inherit" />} color="#F59E0B" />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <GraficaCard titulo={`Recaudación mensual — ${anio} (COP)`} height={230}>
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

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <GraficaCard titulo="Por tipo de donación">
            <PieChart>
              <Pie data={porTipo} dataKey="cantidad" nameKey="tipo" cx="50%" cy="50%" outerRadius={90}
                label={({ tipo, percent }) => `${tipo} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {porTipo.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
            </PieChart>
          </GraficaCard>
        </Grid>

        {topDonantes.length > 0 && (
          <Grid size={{ xs: 12, md: 8 }}>
            <GraficaCard titulo={`Top donantes por monto — ${anio} (COP)`}>
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
      </>}
    </Grid>
  );
}
