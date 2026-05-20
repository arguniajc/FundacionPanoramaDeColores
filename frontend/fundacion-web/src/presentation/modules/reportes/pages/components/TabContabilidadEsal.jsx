import { useState, useEffect } from 'react';
import {
  Box, CircularProgress, Divider, FormControl, Grid, InputLabel,
  MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from '@mui/material';
import TrendingUpIcon   from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import BalanceIcon      from '@mui/icons-material/Balance';
import { contabilidadRepository } from '../../../../../infrastructure/repositories/contabilidadRepository';

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const fmtCOP = v => Number(v).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export function TabContabilidadEsal() {
  const hoy   = new Date();
  const [mes,       setMes]       = useState(hoy.getMonth() + 1);
  const [anio,      setAnio]      = useState(hoy.getFullYear());
  const [reporte,   setReporte]   = useState(null);
  const [cargando,  setCargando]  = useState(false);

  const anios = Array.from({ length: 5 }, (_, i) => hoy.getFullYear() - i);

  useEffect(() => {
    setCargando(true);
    contabilidadRepository.reporte(mes, anio)
      .then(({ data }) => setReporte(data))
      .catch(() => setReporte(null))
      .finally(() => setCargando(false));
  }, [mes, anio]);

  const ingresos = reporte?.porCuenta?.filter(c => c.tipo === 'ingreso') ?? [];
  const egresos  = reporte?.porCuenta?.filter(c => c.tipo === 'egreso')  ?? [];
  const retenciones = reporte?.movimientos?.filter(m => m.retencionPracticada > 0) ?? [];
  const totalRetenciones = retenciones.reduce((s, m) => s + (m.retencionPracticada ?? 0), 0);

  return (
    <Box>
      {/* Selectores de período */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Mes</InputLabel>
            <Select value={mes} label="Mes" onChange={e => setMes(Number(e.target.value))}>
              {MESES.map((m, i) => <MenuItem key={i+1} value={i+1}>{m}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Año</InputLabel>
            <Select value={anio} label="Año" onChange={e => setAnio(Number(e.target.value))}>
              {anios.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {cargando && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!cargando && reporte && <>
        {/* Tarjetas resumen */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total ingresos', value: reporte.totalIngresos, icon: <TrendingUpIcon />,   color: '#16a34a' },
            { label: 'Total egresos',  value: reporte.totalEgresos,  icon: <TrendingDownIcon />, color: '#dc2626' },
            { label: reporte.balance >= 0 ? 'Excedente' : 'Déficit',
              value: Math.abs(reporte.balance), icon: <BalanceIcon />,
              color: reporte.balance >= 0 ? '#7c3aed' : '#ea580c' },
          ].map(({ label, value, icon, color }) => (
            <Grid item xs={12} sm={4} key={label}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: color + '44' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{ color }}>{icon}</Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
                </Box>
                <Typography variant="h6" fontWeight={800} sx={{ color }}>
                  {fmtCOP(value)}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Estado de actividades */}
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Estado de Actividades — {MESES[mes - 1]} {anio}
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Código PUC</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Cuenta</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Valor</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ingresos.length > 0 && <>
                <TableRow sx={{ bgcolor: '#f0fdf4' }}>
                  <TableCell colSpan={3} sx={{ fontWeight: 700, color: '#16a34a', py: 0.5 }}>
                    INGRESOS OPERACIONALES
                  </TableCell>
                </TableRow>
                {ingresos.map(c => (
                  <TableRow key={c.codigoPuc} hover>
                    <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.8rem' }}>{c.codigoPuc}</TableCell>
                    <TableCell>{c.cuenta}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#16a34a' }}>{fmtCOP(c.total)}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: '#dcfce7' }}>
                  <TableCell colSpan={2} sx={{ fontWeight: 700 }}>Total ingresos</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#16a34a' }}>{fmtCOP(reporte.totalIngresos)}</TableCell>
                </TableRow>
              </>}

              {egresos.length > 0 && <>
                <TableRow sx={{ bgcolor: '#fef2f2' }}>
                  <TableCell colSpan={3} sx={{ fontWeight: 700, color: '#dc2626', py: 0.5 }}>
                    GASTOS Y COSTOS
                  </TableCell>
                </TableRow>
                {egresos.map(c => (
                  <TableRow key={c.codigoPuc} hover>
                    <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.8rem' }}>{c.codigoPuc}</TableCell>
                    <TableCell>{c.cuenta}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#dc2626' }}>{fmtCOP(c.total)}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: '#fee2e2' }}>
                  <TableCell colSpan={2} sx={{ fontWeight: 700 }}>Total egresos</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#dc2626' }}>{fmtCOP(reporte.totalEgresos)}</TableCell>
                </TableRow>
              </>}

              <TableRow sx={{ bgcolor: reporte.balance >= 0 ? '#ede9fe' : '#fff7ed' }}>
                <TableCell colSpan={2} sx={{ fontWeight: 800, fontSize: '0.95rem' }}>
                  {reporte.balance >= 0 ? 'EXCEDENTE DEL PERÍODO' : 'DÉFICIT DEL PERÍODO'}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 900, fontSize: '1rem', color: reporte.balance >= 0 ? '#7c3aed' : '#ea580c' }}>
                  {fmtCOP(Math.abs(reporte.balance))}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Centro de costos por programa */}
        {reporte.porPrograma?.length > 0 && <>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Centro de costos por programa
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Programa</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#16a34a' }}>Ingresos</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#dc2626' }}>Egresos</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reporte.porPrograma.map(p => (
                  <TableRow key={p.programa} hover>
                    <TableCell>{p.programa}</TableCell>
                    <TableCell align="right" sx={{ color: '#16a34a' }}>{fmtCOP(p.ingresos)}</TableCell>
                    <TableCell align="right" sx={{ color: '#dc2626' }}>{fmtCOP(p.egresos)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: p.balance >= 0 ? '#7c3aed' : '#ea580c' }}>
                      {fmtCOP(p.balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>}

        {/* Retenciones practicadas */}
        {retenciones.length > 0 && <>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Retenciones en la fuente practicadas
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#fef9c3' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Tercero</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>NIT</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Concepto RTE</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Tarifa</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Valor retenido</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {retenciones.map(m => (
                  <TableRow key={m.id} hover>
                    <TableCell>{m.fecha}</TableCell>
                    <TableCell>{m.terceroNombre ?? '—'}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{m.terceroDocumento ?? '—'}</TableCell>
                    <TableCell>{m.conceptoRetencion ?? '—'}</TableCell>
                    <TableCell align="right">{m.tarifaRetencion != null ? `${m.tarifaRetencion}%` : '—'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#b45309' }}>{fmtCOP(m.retencionPracticada)}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: '#fef9c3' }}>
                  <TableCell colSpan={5} sx={{ fontWeight: 700 }}>Total retenciones practicadas</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#b45309' }}>{fmtCOP(totalRetenciones)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary">
            Estos valores deben declararse en el formulario 350 — Retención en la fuente (DIAN).
          </Typography>
        </>}

        {ingresos.length === 0 && egresos.length === 0 && (
          <Typography color="text.secondary" textAlign="center" py={4}>
            No hay movimientos registrados para {MESES[mes - 1]} {anio}.
          </Typography>
        )}
      </>}
    </Box>
  );
}
