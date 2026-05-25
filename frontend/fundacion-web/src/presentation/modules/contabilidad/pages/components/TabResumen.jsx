import {
  Box, Card, CardContent, Chip, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { fmt, fmtFecha, MESES } from './helpers';

export function TabResumen({ stats, cuentas, movimientos }) {
  const now = new Date();
  return (
    <Grid container spacing={3} sx={{ pt: 1 }}>
      {(stats?.ultimosDosMeses ?? []).length > 0 && (
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" mb={2}>Últimos 2 meses</Typography>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={stats.ultimosDosMeses} margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} />
                  <RTooltip formatter={v => fmt(v)} />
                  <Legend />
                  <Bar dataKey="ingresos" fill="#16a34a" name="Ingresos" />
                  <Bar dataKey="egresos"  fill="#dc2626" name="Egresos"  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      )}

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" fontWeight="bold" mb={1.5}>Saldos por cuenta</Typography>
            {cuentas.length === 0
              ? <Typography variant="body2" color="text.secondary">
                  No hay cuentas. Agrégalas en la pestaña "Cuentas".
                </Typography>
              : cuentas.map(c => (
                <Box key={c.id} sx={{ display: 'flex', justifyContent: 'space-between', py: .75,
                    borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box>
                    <Typography variant="body2">{c.nombre}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.tipo === 'cuenta_bancaria'
                        ? `${c.banco ?? ''} · ${c.numeroCuenta ?? ''}`
                        : c.tipo === 'caja_menor' ? 'Caja menor' : 'Caja efectivo'}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="bold"
                    color={(c.saldoActual ?? 0) >= 0 ? 'success.main' : 'error.main'}>
                    {fmt(c.saldoActual)}
                  </Typography>
                </Box>
              ))
            }
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" fontWeight="bold" mb={1.5}>
              Últimos movimientos — {MESES[now.getMonth()]} {now.getFullYear()}
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Concepto</TableCell>
                    <TableCell>Categoría PUC</TableCell>
                    <TableCell>Cuenta</TableCell>
                    <TableCell align="right">Monto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movimientos.slice(0, 10).map(m => (
                    <TableRow key={m.id}>
                      <TableCell>{fmtFecha(m.fecha)}</TableCell>
                      <TableCell>
                        <Chip label={m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                          color={m.tipo === 'ingreso' ? 'success' : 'error'} size="small" />
                      </TableCell>
                      <TableCell>{m.concepto}</TableCell>
                      <TableCell>
                        <Tooltip title={m.categoriaNombre}>
                          <Typography variant="caption">{m.codigoPuc}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{m.cuentaNombre}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="bold"
                          color={m.tipo === 'ingreso' ? 'success.main' : 'error.main'}>
                          {m.tipo === 'ingreso' ? '+' : '−'}{fmt(m.monto)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {movimientos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                        <Typography color="text.secondary">Sin movimientos este mes</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
