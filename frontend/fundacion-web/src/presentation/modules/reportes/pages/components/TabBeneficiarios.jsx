import { useState, useEffect } from 'react';
import { Alert, Box, Button, FormControl, Grid, InputLabel, MenuItem, Select } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportarExcel } from '@/shared/utils/exportarExcel';
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid, Cell,
  Legend, PieChart, Pie, Tooltip, XAxis, YAxis,
} from 'recharts';
import apiClient from '@/infrastructure/http/apiClient';
import { COLORES, GraficaCard, KpiCard, SkeletonSection, TooltipCustom } from './helpers';
import { BRAND_COLOR } from '@/shared/constants/brand';

export function TabBeneficiarios() {
  const hoy   = new Date();
  const [anio,  setAnio]  = useState(hoy.getFullYear());
  const [data,  setData]  = useState(null);
  const [error, setError] = useState('');

  const anios = Array.from({ length: 5 }, (_, i) => hoy.getFullYear() - i);

  useEffect(() => {
    setData(null);
    apiClient.get('/api/reportes/beneficiarios', { params: { anio } })
      .then(r => setData(r.data))
      .catch(() => setError('Error al cargar reporte de beneficiarios'));
  }, [anio]);

  if (error) return <Alert severity="error">{error}</Alert>;

  const { resumen, porEdad, porGenero, porPrograma, porGrado, nuevosPorMes } = data ?? {};

  const exportar = () => {
    if (!data) return;
    exportarExcel(`Reporte_Beneficiarios_${anio}`, [
      { nombre: 'Resumen', datos: [
        { Indicador: 'Total registrados',  Valor: resumen.total },
        { Indicador: 'Activos',            Valor: resumen.activos },
        { Indicador: 'Inactivos / baja',   Valor: resumen.inactivos },
        { Indicador: 'Con discapacidad',   Valor: resumen.conDiscapacidad },
        { Indicador: 'Con autorización',   Valor: resumen.conAutorizacion },
      ]},
      { nombre: 'Por Edad',       datos: porEdad.map(r      => ({ 'Rango de Edad': r.etiqueta, Cantidad: r.cantidad })) },
      { nombre: 'Por Género',     datos: porGenero.map(r    => ({ Género: r.etiqueta, Cantidad: r.cantidad })) },
      { nombre: 'Por Programa',   datos: porPrograma.map(r  => ({ Programa: r.etiqueta, Inscritos: r.cantidad })) },
      { nombre: 'Por Grado',      datos: porGrado.map(r     => ({ 'Grado Escolar': r.etiqueta, Cantidad: r.cantidad })) },
      { nombre: 'Nuevos por Mes', datos: nuevosPorMes.map(r => ({ Mes: r.mes, 'Nuevos beneficiarios': r.cantidad })) },
    ]);
  };

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel>Año</InputLabel>
            <Select value={anio} label="Año" onChange={e => setAnio(Number(e.target.value))}>
              {anios.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
          <Button size="small" variant="outlined" startIcon={<FileDownloadIcon />}
            onClick={exportar} disabled={!data}>
            Exportar Excel
          </Button>
        </Box>
      </Grid>

      {!data ? <Grid size={{ xs: 12 }}><SkeletonSection /></Grid> : <>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <KpiCard label="Total registrados" value={resumen.total} icon={<PeopleIcon fontSize="inherit" />} color={BRAND_COLOR} />
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
          <GraficaCard titulo={`Nuevos beneficiarios por mes — ${anio}`} height={220}>
            <AreaChart data={nuevosPorMes}>
              <defs>
                <linearGradient id="gradBen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={BRAND_COLOR} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={BRAND_COLOR} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<TooltipCustom />} />
              <Area type="monotone" dataKey="cantidad" name="Nuevos" stroke={BRAND_COLOR} fill="url(#gradBen)" strokeWidth={2} />
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
              <Bar dataKey="cantidad" name="Beneficiarios" fill={BRAND_COLOR} radius={[0,4,4,0]}>
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
      </>}
    </Grid>
  );
}
