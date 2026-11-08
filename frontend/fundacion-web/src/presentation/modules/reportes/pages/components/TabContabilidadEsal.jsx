import { useState, useEffect } from 'react';
import {
  Box, Button, CircularProgress, Divider, FormControl, Grid, InputLabel,
  MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Alert,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportarExcel } from '@/shared/utils/exportarExcel';
import usePermisos from '@/shared/hooks/usePermisos';
import TrendingUpIcon   from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import BalanceIcon      from '@mui/icons-material/Balance';
import { contabilidadRepository } from '@/infrastructure/repositories/contabilidadRepository';
import { useAsyncData } from '@/shared/hooks/useAsyncData';
import { useTheme, alpha } from '@mui/material/styles';
import { colorEstado } from '@/shared/theme/paleta';

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const fmtCOP = v => Number(v).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export function TabContabilidadEsal() {
  const { puedo } = usePermisos();
  const theme = useTheme();
  const hoy   = new Date();
  const [mes,       setMes]       = useState(hoy.getMonth() + 1);
  const [anio,      setAnio]      = useState(hoy.getFullYear());
  const anios = Array.from({ length: 5 }, (_, i) => hoy.getFullYear() - i);

  const { data: reporte, cargando, error, ejecutar: cargar } = useAsyncData(
    async (m, a) => (await contabilidadRepository.reporte(m, a)).data,
    { errorMsg: 'No se pudo cargar el reporte.' }
  );

  useEffect(() => { cargar(mes, anio); }, [cargar, mes, anio]);

  const ingresos = reporte?.porCuenta?.filter(c => c.tipo === 'ingreso') ?? [];
  const egresos  = reporte?.porCuenta?.filter(c => c.tipo === 'egreso')  ?? [];
  const retenciones = reporte?.movimientos?.filter(m => m.retencionPracticada > 0) ?? [];
  const totalRetenciones = retenciones.reduce((s, m) => s + (m.retencionPracticada ?? 0), 0);

  const exportar = () => {
    if (!reporte) return;
    const hojas = [
      { nombre: 'Estado Actividades', datos: [
        ...ingresos.map(c => ({ 'Código PUC': c.codigoPuc, Cuenta: c.cuenta, Tipo: 'Ingreso', 'Valor (COP)': c.total })),
        ...egresos.map(c  => ({ 'Código PUC': c.codigoPuc, Cuenta: c.cuenta, Tipo: 'Egreso',  'Valor (COP)': c.total })),
        { 'Código PUC': '', Cuenta: reporte.balance >= 0 ? 'EXCEDENTE DEL PERÍODO' : 'DÉFICIT DEL PERÍODO',
          Tipo: '', 'Valor (COP)': reporte.balance },
      ]},
    ];
    if (reporte.porPrograma?.length > 0) {
      hojas.push({ nombre: 'Por Programa', datos: reporte.porPrograma.map(p => ({
        Programa: p.programa, 'Ingresos (COP)': p.ingresos, 'Egresos (COP)': p.egresos, 'Balance (COP)': p.balance,
      }))});
    }
    if (retenciones.length > 0) {
      hojas.push({ nombre: 'Retenciones', datos: retenciones.map(m => ({
        Fecha: m.fecha, Tercero: m.terceroNombre ?? '', NIT: m.terceroDocumento ?? '',
        'Concepto RTE': m.conceptoRetencion ?? '', 'Tarifa (%)': m.tarifaRetencion ?? '',
        'Valor retenido (COP)': m.retencionPracticada,
      }))});
    }
    exportarExcel(`Reporte_Contabilidad_${MESES[mes - 1]}_${anio}`, hojas);
  };

  return (
    <Box>
      {/* Selectores de período */}
      <Grid container spacing={2} sx={{ alignItems: 'center', mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="tab-contabilidad-esal-mes-label">Mes</InputLabel>
            <Select labelId="tab-contabilidad-esal-mes-label" value={mes} label="Mes" onChange={e => setMes(Number(e.target.value))}>
              {MESES.map((m, i) => <MenuItem key={i+1} value={i+1}>{m}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="tab-contabilidad-esal-ano-label">Año</InputLabel>
            <Select labelId="tab-contabilidad-esal-ano-label" value={anio} label="Año" onChange={e => setAnio(Number(e.target.value))}>
              {anios.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid>
          {puedo('reportes', 'exportar') && (
            <Button size="small" variant="outlined" startIcon={<FileDownloadIcon />}
              onClick={exportar} disabled={!reporte}>
              Exportar Excel
            </Button>
          )}
        </Grid>
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {cargando && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!cargando && reporte && <>
        {/* Tarjetas resumen */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total ingresos', value: reporte.totalIngresos, icon: <TrendingUpIcon />,   color: theme.palette.success.main },
            { label: 'Total egresos',  value: reporte.totalEgresos,  icon: <TrendingDownIcon />, color: theme.palette.error.main },
            { label: reporte.balance >= 0 ? 'Excedente' : 'Déficit',
              value: Math.abs(reporte.balance), icon: <BalanceIcon />,
              color: reporte.balance >= 0 ? theme.palette.primary.main : theme.palette.warning.main },
          ].map(({ label, value, icon, color }) => (
            <Grid size={{ xs: 12, sm: 4 }} key={label}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: color + '44' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{ color }}>{icon}</Box>
                  <Typography sx={{ color: 'text.secondary', fontWeight: 600 }} variant="caption">{label}</Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color }}>
                  {fmtCOP(value)}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Estado de actividades */}
        <Typography sx={{ fontWeight: 700 }} variant="subtitle1" gutterBottom>
          Estado de Actividades — {MESES[mes - 1]} {anio}
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'superficie2' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Código PUC</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Cuenta</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Valor</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ingresos.length > 0 && <>
                <TableRow sx={{ bgcolor: alpha(theme.palette.success.main, 0.06) }}>
                  <TableCell colSpan={3} sx={{ fontWeight: 700, color: 'success.main', py: 0.5 }}>
                    INGRESOS OPERACIONALES
                  </TableCell>
                </TableRow>
                {ingresos.map(c => (
                  <TableRow key={c.codigoPuc} hover>
                    <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.8rem' }}>{c.codigoPuc}</TableCell>
                    <TableCell>{c.cuenta}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'success.main' }}>{fmtCOP(c.total)}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: colorEstado('exito', theme.palette.mode).fondo }}>
                  <TableCell colSpan={2} sx={{ fontWeight: 700 }}>Total ingresos</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: 'success.main' }}>{fmtCOP(reporte.totalIngresos)}</TableCell>
                </TableRow>
              </>}

              {egresos.length > 0 && <>
                <TableRow sx={{ bgcolor: alpha(theme.palette.error.main, 0.06) }}>
                  <TableCell colSpan={3} sx={{ fontWeight: 700, color: 'error.main', py: 0.5 }}>
                    GASTOS Y COSTOS
                  </TableCell>
                </TableRow>
                {egresos.map(c => (
                  <TableRow key={c.codigoPuc} hover>
                    <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.8rem' }}>{c.codigoPuc}</TableCell>
                    <TableCell>{c.cuenta}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'error.main' }}>{fmtCOP(c.total)}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: colorEstado('error', theme.palette.mode).fondo }}>
                  <TableCell colSpan={2} sx={{ fontWeight: 700 }}>Total egresos</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: 'error.main' }}>{fmtCOP(reporte.totalEgresos)}</TableCell>
                </TableRow>
              </>}

              <TableRow sx={{ bgcolor: colorEstado(reporte.balance >= 0 ? 'marca' : 'aviso', theme.palette.mode).fondo }}>
                <TableCell colSpan={2} sx={{ fontWeight: 800, fontSize: '0.95rem' }}>
                  {reporte.balance >= 0 ? 'EXCEDENTE DEL PERÍODO' : 'DÉFICIT DEL PERÍODO'}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 900, fontSize: '1rem', color: reporte.balance >= 0 ? 'primary.main' : 'warning.main' }}>
                  {fmtCOP(Math.abs(reporte.balance))}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Centro de costos por programa */}
        {reporte.porPrograma?.length > 0 && <>
          <Typography sx={{ fontWeight: 700 }} variant="subtitle1" gutterBottom>
            Centro de costos por programa
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'superficie2' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Programa</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>Ingresos</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'error.main' }}>Egresos</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reporte.porPrograma.map(p => (
                  <TableRow key={p.programa} hover>
                    <TableCell>{p.programa}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>{fmtCOP(p.ingresos)}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>{fmtCOP(p.egresos)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: p.balance >= 0 ? 'primary.main' : 'warning.main' }}>
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
          <Typography sx={{ fontWeight: 700 }} variant="subtitle1" gutterBottom>
            Retenciones en la fuente practicadas
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: colorEstado('aviso', theme.palette.mode).fondo }}>
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
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'warning.dark' }}>{fmtCOP(m.retencionPracticada)}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: colorEstado('aviso', theme.palette.mode).fondo }}>
                  <TableCell colSpan={5} sx={{ fontWeight: 700 }}>Total retenciones practicadas</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: 'warning.dark' }}>{fmtCOP(totalRetenciones)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Typography sx={{ color: 'text.secondary' }} variant="caption">
            Estos valores deben declararse en el formulario 350 — Retención en la fuente (DIAN).
          </Typography>
        </>}

        {ingresos.length === 0 && egresos.length === 0 && (
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
            No hay movimientos registrados para {MESES[mes - 1]} {anio}.
          </Typography>
        )}
      </>}
    </Box>
  );
}
