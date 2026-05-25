import {
  Alert, Box, Button, CircularProgress, Chip, Divider, FormControl, Grid,
  IconButton, InputLabel, MenuItem, Paper, Select, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AddIcon          from '@mui/icons-material/Add';
import BalanceIcon      from '@mui/icons-material/Balance';
import DeleteIcon       from '@mui/icons-material/Delete';
import FactCheckIcon    from '@mui/icons-material/FactCheck';
import SyncAltIcon      from '@mui/icons-material/SyncAlt';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon   from '@mui/icons-material/TrendingUp';
import { BRAND_COLOR } from '../../../../../shared/constants/brand';
import { fmt, fmtFecha, MESES, ANIOS, KpiCard, SectionHeader } from './helpers';

export function TabCajaMenor({
  cuentas,
  cajaCuentaId, setCajaCuentaId,
  cajaMes, setCajaMes,
  cajaAnio, setCajaAnio,
  libroAuxiliar, arqueos, cargandoCaja,
  puedeCrear, puedeEditar,
  onFiltrar,
  onRegistrarIngreso, onRegistrarGasto,
  onReponer, onArquear,
  onEliminarArqueo,
}) {
  const cuenta       = cuentas.find(c => c.id === cajaCuentaId);
  const totalIng     = libroAuxiliar.reduce((s, r) => s + r.ingreso, 0);
  const totalEgr     = libroAuxiliar.reduce((s, r) => s + r.egreso,  0);
  const ultimoArqueo = arqueos[0];

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Cuenta de caja</InputLabel>
            <Select value={cajaCuentaId} label="Cuenta de caja"
              onChange={e => setCajaCuentaId(e.target.value)}>
              {cuentas.filter(c => c.tipo !== 'cuenta_bancaria').map(c =>
                <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
              )}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Mes</InputLabel>
            <Select value={cajaMes} label="Mes" onChange={e => setCajaMes(e.target.value)}>
              <MenuItem value="">Todo el año</MenuItem>
              {MESES.map((m, i) => <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Año</InputLabel>
            <Select value={cajaAnio} label="Año" onChange={e => setCajaAnio(e.target.value)}>
              {ANIOS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="outlined" size="small" onClick={onFiltrar}>Filtrar</Button>
        </Box>
      </Paper>

      {!cajaCuentaId
        ? <Alert severity="info">
            Crea una cuenta de tipo <strong>Caja Menor</strong> en la pestaña "Cuentas" para usar este módulo.
          </Alert>
        : (
          <>
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} sm={6} md={3}>
                <KpiCard label="Saldo actual" value={fmt(cuenta?.saldoActual)}
                  icon={<AccountBalanceWalletIcon fontSize="inherit" />} color={BRAND_COLOR} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KpiCard label={`Ingresos${cajaMes ? ` ${MESES[cajaMes - 1]}` : ''}`}
                  value={fmt(totalIng)} icon={<TrendingUpIcon fontSize="inherit" />} color="#16a34a" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KpiCard label={`Egresos${cajaMes ? ` ${MESES[cajaMes - 1]}` : ''}`}
                  value={fmt(totalEgr)} icon={<TrendingDownIcon fontSize="inherit" />} color="#dc2626" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KpiCard
                  label="Último arqueo"
                  value={ultimoArqueo ? fmtFecha(ultimoArqueo.fecha) : 'Sin arqueos'}
                  icon={<BalanceIcon fontSize="inherit" />}
                  color={ultimoArqueo
                    ? (ultimoArqueo.diferencia === 0 ? '#16a34a' : '#dc2626')
                    : '#64748b'}
                />
              </Grid>
            </Grid>

            {puedeCrear && (
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Button variant="contained" color="success" size="small" startIcon={<AddIcon />}
                  onClick={onRegistrarIngreso}>
                  Registrar Ingreso
                </Button>
                <Button variant="contained" color="error" size="small" startIcon={<AddIcon />}
                  onClick={onRegistrarGasto}>
                  Registrar Gasto
                </Button>
                <Button variant="outlined" color="primary" size="small" startIcon={<SyncAltIcon />}
                  onClick={onReponer}>
                  Reponer Caja
                </Button>
                <Button variant="outlined" size="small" startIcon={<FactCheckIcon />}
                  onClick={onArquear}>
                  Arquear Caja
                </Button>
              </Box>
            )}

            <Divider sx={{ mb: 2 }} />
            <SectionHeader title={`Libro Auxiliar — ${cuenta?.nombre}`} />
            {cargandoCaja
              ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
              : (
                <TableContainer component={Paper} sx={{ mb: 4 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Concepto</TableCell>
                        <TableCell>Categoría PUC</TableCell>
                        <TableCell>Programa</TableCell>
                        <TableCell>Tercero / Soporte</TableCell>
                        <TableCell align="right" sx={{ color: 'success.main' }}>Ingreso</TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>Egreso</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Saldo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {libroAuxiliar.map(row => (
                        <TableRow key={row.id} hover>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtFecha(row.fecha)}</TableCell>
                          <TableCell>
                            <Chip label={row.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}
                              color={row.tipo === 'ingreso' ? 'success' : 'error'} size="small" />
                          </TableCell>
                          <TableCell>{row.concepto}</TableCell>
                          <TableCell>
                            <Tooltip title={row.categoriaNombre}>
                              <Typography variant="caption">{row.codigoPuc}</Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>{row.programaNombre ?? '—'}</TableCell>
                          <TableCell>
                            {row.terceroNombre && (
                              <Typography variant="body2">{row.terceroNombre}</Typography>
                            )}
                            {row.numeroSoporte && (
                              <Typography variant="caption" color="text.secondary">
                                {row.numeroSoporte}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography sx={{ color: 'success.main', fontWeight: row.ingreso > 0 ? 'bold' : 'normal' }}>
                              {row.ingreso > 0 ? fmt(row.ingreso) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography sx={{ color: 'error.main', fontWeight: row.egreso > 0 ? 'bold' : 'normal' }}>
                              {row.egreso > 0 ? fmt(row.egreso) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight="bold"
                              color={row.saldoAcumulado >= 0 ? 'success.main' : 'error.main'}>
                              {fmt(row.saldoAcumulado)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                      {libroAuxiliar.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                            <Typography color="text.secondary">No hay movimientos en este período</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )
            }

            <Divider sx={{ mb: 2 }} />
            <SectionHeader title="Arqueos de Caja" />
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell>Fecha</TableCell>
                    <TableCell align="right">Saldo Sistema</TableCell>
                    <TableCell align="right">Conteo Físico</TableCell>
                    <TableCell align="right">Diferencia</TableCell>
                    <TableCell>Responsable</TableCell>
                    <TableCell>Observación</TableCell>
                    {puedeEditar && <TableCell />}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {arqueos.map(a => (
                    <TableRow key={a.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtFecha(a.fecha)}</TableCell>
                      <TableCell align="right">{fmt(a.saldoSistema)}</TableCell>
                      <TableCell align="right">{fmt(a.saldoFisico)}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="bold"
                          color={a.diferencia === 0 ? 'success.main' : a.diferencia > 0 ? 'primary.main' : 'error.main'}>
                          {a.diferencia > 0 ? '+' : ''}{fmt(a.diferencia)}
                          {a.diferencia === 0 && ' ✓'}
                          {a.diferencia > 0 && ' (Sobrante)'}
                          {a.diferencia < 0 && ' (Faltante)'}
                        </Typography>
                      </TableCell>
                      <TableCell>{a.responsable ?? '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" noWrap>{a.observacion ?? '—'}</Typography>
                      </TableCell>
                      {puedeEditar && (
                        <TableCell>
                          <IconButton size="small" color="error" onClick={() => onEliminarArqueo(a.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {arqueos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={puedeEditar ? 7 : 6} align="center" sx={{ py: 3 }}>
                        <Typography color="text.secondary">
                          No hay arqueos registrados para esta cuenta
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )
      }
    </Box>
  );
}
