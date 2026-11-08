import { useState, useEffect } from 'react';
import { Alert, Box, Button, FormControl, Grid, InputLabel, MenuItem, Select } from '@mui/material';
import EventIcon  from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportarExcel } from '@/shared/utils/exportarExcel';
import usePermisos from '@/shared/hooks/usePermisos';
import {
  BarChart, Bar, CartesianGrid, Cell, Legend,
  PieChart, Pie, Tooltip, XAxis, YAxis,
} from 'recharts';
import apiClient from '@/infrastructure/http/apiClient';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { GraficaCard, KpiCard, SkeletonSection, TooltipCustom } from './helpers';
import { COLORES } from './colores';
import { useTheme } from '@mui/material/styles';

export function TabActividades() {
  const { puedo } = usePermisos();
  const theme = useTheme();
  const hoy   = new Date();
  const [anio,  setAnio]  = useState(hoy.getFullYear());
  const [data,  setData]  = useState(null);
  const [error, setError] = useState('');

  const anios = Array.from({ length: 5 }, (_, i) => hoy.getFullYear() - i);

  useEffect(() => {
    // Se reinicia y carga dentro de una función async (no setState síncrono en el efecto)
    (async () => {
      setData(null);
      apiClient.get('/api/reportes/actividades', { params: { anio } })
        .then(r => setData(r.data))
        .catch(err => setError(mensajeErrorApi(err, { accion: 'cargar el reporte de actividades' })));
    })();
  }, [anio]);

  if (error) return <Alert severity="error">{error}</Alert>;

  const { resumen, porEstado, asistenciaPorActividad, porMes } = data ?? {};

  const exportar = () => {
    if (!data) return;
    exportarExcel(`Reporte_Actividades_${anio}`, [
      { nombre: 'Resumen', datos: [
        { Indicador: 'Total actividades',  Valor: resumen.total },
        { Indicador: 'Completadas',        Valor: resumen.completadas },
        { Indicador: 'En curso',           Valor: resumen.enCurso },
        { Indicador: 'Planificadas',       Valor: resumen.planificadas },
        { Indicador: 'Total asistencias',  Valor: resumen.totalAsistencia },
        { Indicador: 'Prom. asistencia',   Valor: resumen.promedioAsistencia },
      ]},
      { nombre: 'Por Mes',    datos: porMes.map(r   => ({ Mes: r.mes, Actividades: r.cantidad })) },
      { nombre: 'Por Estado', datos: porEstado.map(r => ({ Estado: r.etiqueta, Cantidad: r.cantidad })) },
      { nombre: 'Asistencia', datos: asistenciaPorActividad.map(r => ({
        Actividad: r.titulo, Inscritos: r.inscritos, Asistieron: r.asistieron,
      }))},
    ]);
  };

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel id="tab-actividades-ano-label">Año</InputLabel>
            <Select labelId="tab-actividades-ano-label" value={anio} label="Año" onChange={e => setAnio(Number(e.target.value))}>
              {anios.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
          {puedo('reportes', 'exportar') && (
            <Button size="small" variant="outlined" startIcon={<FileDownloadIcon />}
              onClick={exportar} disabled={!data}>
              Exportar Excel
            </Button>
          )}
        </Box>
      </Grid>

      {!data ? <Grid size={{ xs: 12 }}><SkeletonSection /></Grid> : <>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard label="Total actividades"  value={resumen.total}              icon={<EventIcon fontSize="inherit" />}  color="primary.main" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard label="Completadas"        value={resumen.completadas}        icon={<EventIcon fontSize="inherit" />}  color="success.main" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard label="En curso"           value={resumen.enCurso}            icon={<EventIcon fontSize="inherit" />}  color="warning.main" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard label="Planificadas"       value={resumen.planificadas}       icon={<EventIcon fontSize="inherit" />}  color="info.main" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard label="Total asistencias"  value={resumen.totalAsistencia}    icon={<PeopleIcon fontSize="inherit" />} color="primary.main" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard label="Prom. asistencia"   value={resumen.promedioAsistencia} icon={<PeopleIcon fontSize="inherit" />} color="info.main" />
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <GraficaCard titulo={`Actividades por mes — ${anio}`} height={240}>
            <BarChart data={porMes}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<TooltipCustom />} />
              <Bar dataKey="cantidad" name="Actividades" fill={theme.palette.primary.main} radius={[4,4,0,0]}>
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
            <GraficaCard titulo={`Asistencia en actividades completadas — ${anio} (últimas 10)`} height={280}>
              <BarChart data={asistenciaPorActividad}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
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
      </>}
    </Grid>
  );
}
