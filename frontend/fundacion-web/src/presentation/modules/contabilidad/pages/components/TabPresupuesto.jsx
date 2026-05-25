import {
  Alert, Box, Button, Chip, FormControl, IconButton, InputLabel,
  LinearProgress, MenuItem, Paper, Select, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import AddIcon    from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon   from '@mui/icons-material/Edit';
import { fmt, ANIOS } from './helpers';

export function TabPresupuesto({
  presupuesto, presAnio, setPresAnio,
  puedeCrear, puedeEditar,
  onCargar, onCrear, onEditar, onEliminar,
}) {
  const sobre  = presupuesto.filter(p => p.montoPresupuestado > 0 && p.ejecutado > p.montoPresupuestado);
  const alerta = presupuesto.filter(p =>
    p.montoPresupuestado > 0 &&
    p.ejecutado / p.montoPresupuestado >= 0.9 &&
    p.ejecutado <= p.montoPresupuestado
  );

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Año</InputLabel>
            <Select value={presAnio} label="Año" onChange={e => setPresAnio(e.target.value)}>
              {ANIOS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="outlined" size="small" onClick={onCargar}>Cargar</Button>
          {puedeCrear && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={onCrear}>
              Agregar línea
            </Button>
          )}
        </Box>
      </Paper>

      {(sobre.length > 0 || alerta.length > 0) && (
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {sobre.length > 0 && (
            <Alert severity="error" sx={{ flex: 1, minWidth: 240 }}>
              <strong>{sobre.length} línea{sobre.length > 1 ? 's' : ''} sobre-ejecutada{sobre.length > 1 ? 's' : ''}:</strong>{' '}
              {sobre.map(p => p.categoriaNombre).join(', ')}
            </Alert>
          )}
          {alerta.length > 0 && (
            <Alert severity="warning" sx={{ flex: 1, minWidth: 240 }}>
              <strong>{alerta.length} línea{alerta.length > 1 ? 's' : ''} al 90% o más:</strong>{' '}
              {alerta.map(p => p.categoriaNombre).join(', ')}
            </Alert>
          )}
        </Box>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell>PUC</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Programa</TableCell>
              <TableCell align="right">Presupuestado</TableCell>
              <TableCell align="right">Ejecutado</TableCell>
              <TableCell align="right">Disponible</TableCell>
              <TableCell>% Ejecución</TableCell>
              {puedeEditar && <TableCell />}
            </TableRow>
          </TableHead>
          <TableBody>
            {presupuesto.map(p => {
              const pct = p.montoPresupuestado > 0
                ? Math.round((p.ejecutado / p.montoPresupuestado) * 100) : 0;
              const sobreEjecutado = pct > 100;
              const alertaAlta    = pct >= 90 && pct <= 100;
              return (
                <TableRow key={p.id} hover
                  sx={{ bgcolor: sobreEjecutado ? 'rgba(220,38,38,0.06)' : alertaAlta ? 'rgba(245,158,11,0.06)' : undefined }}>
                  <TableCell><Typography variant="caption">{p.codigoPuc}</Typography></TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {p.categoriaNombre}
                      {sobreEjecutado && (
                        <Chip label="SOBRE-EJECUTADO" size="small" color="error"
                          sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                      )}
                      {alertaAlta && !sobreEjecutado && (
                        <Chip label="ALERTA" size="small" color="warning"
                          sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{p.programaNombre ?? '(General)'}</TableCell>
                  <TableCell align="right">{fmt(p.montoPresupuestado)}</TableCell>
                  <TableCell align="right"
                    sx={{ fontWeight: sobreEjecutado ? 700 : 'normal', color: sobreEjecutado ? 'error.main' : 'inherit' }}>
                    {fmt(p.ejecutado)}
                  </TableCell>
                  <TableCell align="right">
                    <Typography color={p.disponible < 0 ? 'error.main' : 'inherit'}
                      fontWeight={p.disponible < 0 ? 700 : 'normal'}>
                      {fmt(p.disponible)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 150 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(pct, 100)}
                        color={pct > 100 ? 'error' : pct > 90 ? 'error' : pct > 70 ? 'warning' : 'success'}
                        sx={{ flex: 1, height: 7, borderRadius: 3 }}
                      />
                      <Typography variant="caption"
                        fontWeight={sobreEjecutado ? 700 : 'normal'}
                        color={sobreEjecutado ? 'error.main' : alertaAlta ? 'warning.main' : 'text.secondary'}>
                        {pct}%
                      </Typography>
                    </Box>
                  </TableCell>
                  {puedeEditar && (
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <IconButton size="small" onClick={() => onEditar(p)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => onEliminar(p.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {presupuesto.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    Sin presupuesto definido para {presAnio}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
