import {
  Box, Button, Chip, FormControl, IconButton, InputAdornment,
  InputLabel, MenuItem, Pagination, Paper, Select, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import BlockIcon        from '@mui/icons-material/Block';
import ContentCopyIcon  from '@mui/icons-material/ContentCopy';
import DeleteIcon       from '@mui/icons-material/Delete';
import DownloadIcon     from '@mui/icons-material/Download';
import EditIcon         from '@mui/icons-material/Edit';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SearchIcon       from '@mui/icons-material/Search';
import VisibilityIcon   from '@mui/icons-material/Visibility';
import { fmt, fmtFecha, MESES, ANIOS } from './formato';

/**
 * Listado paginado en el servidor: `movimientos` es la página visible; `total` y `totales`
 * (sumas sin anulados) corresponden a TODOS los movimientos del filtro. La búsqueda también
 * se resuelve en el servidor.
 */
export function TabMovimientos({
  movimientos, cuentas,
  total = 0, totales, pagina = 1, totalPaginas = 0, onCambiarPagina,
  filtroTipo, setFiltroTipo,
  filtroMes, setFiltroMes,
  filtroAnio, setFiltroAnio,
  filtroCuenta, setFiltroCuenta,
  busqueda, onBusqueda,
  puedeCrear, puedeEditar,
  onFiltrar, onExportarCSV,
  onVerComprobante, onDescargarComprobante,
  onDuplicar, onEditar, onAnular, onEliminar,
}) {
  const totIng = totales?.totalIngresos ?? 0;
  const totEgr = totales?.totalEgresos ?? 0;
  const bal = totIng - totEgr;

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'superficie2', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Tipo</InputLabel>
            <Select value={filtroTipo} label="Tipo" onChange={e => setFiltroTipo(e.target.value)}>
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="ingreso">Ingreso</MenuItem>
              <MenuItem value="egreso">Egreso</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Mes</InputLabel>
            <Select value={filtroMes} label="Mes" onChange={e => setFiltroMes(e.target.value)}>
              <MenuItem value="">Todos</MenuItem>
              {MESES.map((m, i) => <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Año</InputLabel>
            <Select value={filtroAnio} label="Año" onChange={e => setFiltroAnio(e.target.value)}>
              {ANIOS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Cuenta</InputLabel>
            <Select value={filtroCuenta} label="Cuenta" onChange={e => setFiltroCuenta(e.target.value)}>
              <MenuItem value="">Todas</MenuItem>
              {cuentas.map(c => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="outlined" size="small" onClick={onFiltrar}>Filtrar</Button>
          <TextField slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
            size="small" placeholder="Buscar concepto / tercero..." value={busqueda}
            onChange={e => onBusqueda(e.target.value)} sx={{ minWidth: 220 }} />
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={onExportarCSV}>
            CSV
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'superficie2' }}>
              <TableCell>Fecha</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Concepto</TableCell>
              <TableCell>Categoría PUC</TableCell>
              <TableCell>Cuenta</TableCell>
              <TableCell>Programa</TableCell>
              <TableCell>Soporte / Tipo</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell>N° Comp.</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {movimientos.map(m => (
              <TableRow key={m.id} hover sx={{ opacity: m.anulado ? 0.6 : 1 }}>
                <TableCell>{fmtFecha(m.fecha)}</TableCell>
                <TableCell>
                  <Chip label={m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                    color={m.tipo === 'ingreso' ? 'success' : 'error'} size="small" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{m.concepto}</Typography>
                  {m.terceroNombre && (
                    <Typography sx={{ color: 'text.secondary' }} variant="caption">{m.terceroNombre}</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Tooltip title={m.categoriaNombre}>
                    <Typography variant="caption">{m.codigoPuc}</Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>{m.cuentaNombre}</TableCell>
                <TableCell>{m.programaNombre ?? '—'}</TableCell>
                <TableCell>
                  <Typography variant="body2">{m.numeroSoporte ?? '-'}</Typography>
                  {m.tipoSoporte && <Typography sx={{ color: 'text.secondary' }} variant="caption">{m.tipoSoporte}</Typography>}
                </TableCell>
                <TableCell align="right">
                  <Typography sx={{ fontWeight: 'bold', color: m.tipo === 'ingreso' ? 'success.main' : 'error.main' }}>
                    {m.tipo === 'ingreso' ? '+' : '-'}{fmt(m.monto)}
                  </Typography>
                  {m.retencionPracticada > 0 && (
                    <Typography sx={{ color: 'warning.dark', display: 'block' }} variant="caption">
                      RTE: -{fmt(m.retencionPracticada)}
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>
                  {m.consecutivo ? '#' + m.consecutivo + '-' + new Date(m.fecha).getFullYear() : '-'}
                </TableCell>
                <TableCell>
                  {m.anulado
                    ? <Chip label="Anulado" color="error" size="small" variant="outlined" />
                    : <Chip label="Vigente" color="success" size="small" variant="outlined" />
                  }
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Tooltip title="Ver comprobante">
                    <IconButton size="small" onClick={() => onVerComprobante(m)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Descargar comprobante PDF">
                    <IconButton size="small" color="error" onClick={() => onDescargarComprobante(m)}>
                      <PictureAsPdfIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {puedeCrear && (
                    <Tooltip title="Duplicar movimiento">
                      <IconButton size="small" color="primary" onClick={() => onDuplicar(m)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {puedeEditar && <>
                    {!m.anulado && (
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => onEditar(m)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {!m.anulado && (
                      <Tooltip title="Anular movimiento">
                        <IconButton size="small" color="warning" onClick={() => onAnular(m.id)}>
                          <BlockIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => onEliminar(m.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>}
                </TableCell>
              </TableRow>
            ))}
            {movimientos.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                  <Typography sx={{ color: 'text.secondary' }}>No hay movimientos con los filtros actuales</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {total > 0 && (
        <Box sx={{ display: 'flex', gap: 3, mt: 1.5, px: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography sx={{ color: 'text.secondary' }} variant="caption">
            {total} movimientos · totales sin anulados:
          </Typography>
          <Typography sx={{ color: 'success.main', fontWeight: 700 }} variant="caption">
            Ingresos: {fmt(totIng)} ({totales?.cantidadIngresos ?? 0})
          </Typography>
          <Typography sx={{ color: 'error.main', fontWeight: 700 }} variant="caption">
            Egresos: {fmt(totEgr)} ({totales?.cantidadEgresos ?? 0})
          </Typography>
          <Typography sx={{ fontWeight: 700, color: bal >= 0 ? 'primary.main' : 'warning.main' }} variant="caption">
            Balance: {fmt(bal)}
          </Typography>
        </Box>
      )}

      {totalPaginas > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={totalPaginas} page={pagina} onChange={(_, v) => onCambiarPagina?.(v)} size="small" />
        </Box>
      )}
    </Box>
  );
}
