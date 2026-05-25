import {
  Box, Button, Card, CardContent, Chip, FormControl, Grid, InputLabel,
  MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon        from '@mui/icons-material/Print';
import { fmt, fmtFecha, MESES, ANIOS } from './helpers';
import { generarReportePDF } from './generarReportePDF';

export function TabReporteContador({
  reporte, resumenAnual,
  repMes, setRepMes, repAnio, setRepAnio,
  onGenerar, onCargarResumenAnual,
  config,
}) {
  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Mes</InputLabel>
            <Select value={repMes} label="Mes" onChange={e => setRepMes(e.target.value)}>
              {MESES.map((m, i) => <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Año</InputLabel>
            <Select value={repAnio} label="Año" onChange={e => { setRepAnio(e.target.value); onCargarResumenAnual(e.target.value); }}>
              {ANIOS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={onGenerar}>Generar Reporte</Button>
          {reporte && (
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>
              Imprimir
            </Button>
          )}
          {reporte && (
            <Button variant="contained" color="error" startIcon={<PictureAsPdfIcon />}
              onClick={() => generarReportePDF(reporte, config)}>
              Descargar PDF
            </Button>
          )}
        </Box>
      </Paper>

      {resumenAnual && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Resumen anual {resumenAnual.anio}
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'grey.50' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Mes</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>Ingresos</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'error.main' }}>Egresos</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resumenAnual.meses.map(m => (
                  <TableRow key={m.mes} hover sx={{ opacity: m.ingresos === 0 && m.egresos === 0 ? 0.4 : 1 }}>
                    <TableCell>{m.label}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>{fmt(m.ingresos)}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>{fmt(m.egresos)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: m.balance >= 0 ? 'primary.main' : 'warning.main' }}>
                      {fmt(m.balance)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell sx={{ fontWeight: 700 }}>TOTAL</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>{fmt(resumenAnual.totalIngresos)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'error.main' }}>{fmt(resumenAnual.totalEgresos)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: resumenAnual.balance >= 0 ? 'primary.main' : 'warning.main' }}>
                    {fmt(resumenAnual.balance)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {!reporte && (
        <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>
          Selecciona el mes y año, luego haz clic en "Generar Reporte"
        </Typography>
      )}

      {reporte && (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Reporte Contable — {reporte.periodo}
              </Typography>
              <Grid container spacing={2}>
                {[
                  { label: 'Total Ingresos', value: reporte.totalIngresos, color: 'success' },
                  { label: 'Total Egresos',  value: reporte.totalEgresos,  color: 'error'   },
                  { label: 'Balance',        value: reporte.balance,       color: reporte.balance >= 0 ? 'primary' : 'error' },
                ].map(({ label, value, color }) => (
                  <Grid item xs={12} sm={4} key={label}>
                    <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: `${color}.50`, borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="h6" fontWeight="bold" color={`${color}.main`}>
                        {fmt(value)}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          <Grid container spacing={2} mb={2}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Por Cuenta PUC</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>PUC</TableCell>
                        <TableCell>Cuenta</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reporte.porCuenta.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell><Typography variant="caption">{r.codigoPuc}</Typography></TableCell>
                          <TableCell>{r.cuenta}</TableCell>
                          <TableCell>
                            <Chip label={r.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                              color={r.tipo === 'ingreso' ? 'success' : 'error'} size="small" />
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmt(r.total)}</TableCell>
                        </TableRow>
                      ))}
                      {reporte.porCuenta.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <Typography variant="caption" color="text.secondary">Sin movimientos</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Por Programa</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Programa</TableCell>
                        <TableCell align="right">Ingresos</TableCell>
                        <TableCell align="right">Egresos</TableCell>
                        <TableCell align="right">Balance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reporte.porPrograma.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.programa}</TableCell>
                          <TableCell align="right" sx={{ color: 'success.main' }}>{fmt(r.ingresos)}</TableCell>
                          <TableCell align="right" sx={{ color: 'error.main'   }}>{fmt(r.egresos)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold',
                            color: r.balance >= 0 ? 'primary.main' : 'error.main' }}>
                            {fmt(r.balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Detalle de Movimientos</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>N°</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Concepto</TableCell>
                      <TableCell>PUC</TableCell>
                      <TableCell>Tercero / NIT</TableCell>
                      <TableCell>Soporte / Tipo</TableCell>
                      <TableCell align="right">Monto</TableCell>
                      <TableCell>RTE</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reporte.movimientos.map(m => (
                      <TableRow key={m.id}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>
                          {m.consecutivo ? '#' + m.consecutivo + '-' + new Date(m.fecha).getFullYear() : '-'}
                        </TableCell>
                        <TableCell>{fmtFecha(m.fecha)}</TableCell>
                        <TableCell>
                          <Chip label={m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                            color={m.tipo === 'ingreso' ? 'success' : 'error'} size="small" />
                        </TableCell>
                        <TableCell>{m.concepto}</TableCell>
                        <TableCell><Typography variant="caption">{m.codigoPuc}</Typography></TableCell>
                        <TableCell>
                          <Typography variant="body2">{m.terceroNombre ?? '-'}</Typography>
                          {m.terceroDocumento && <Typography variant="caption" color="text.secondary">{m.terceroDocumento}</Typography>}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{m.numeroSoporte ?? '-'}</Typography>
                          {m.tipoSoporte && <Typography variant="caption" color="text.secondary">{m.tipoSoporte}</Typography>}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold',
                          color: m.tipo === 'ingreso' ? 'success.main' : 'error.main' }}>
                          {m.tipo === 'ingreso' ? '+' : '-'}{fmt(m.monto)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'warning.dark', fontSize: '0.75rem' }}>
                          {m.retencionPracticada > 0 ? '-' + fmt(m.retencionPracticada) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {reporte.movimientos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          <Typography variant="caption" color="text.secondary">
                            Sin movimientos en este periodo
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}
