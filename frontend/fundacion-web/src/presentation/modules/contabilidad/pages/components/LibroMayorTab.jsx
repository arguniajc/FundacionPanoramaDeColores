import { useState, useEffect } from 'react';
import { useAsyncData } from '../../../../../shared/hooks/useAsyncData';
import {
  Box, Button, Chip, FormControl, InputLabel, MenuItem, Select,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TextField, Typography, Alert, CircularProgress,
} from '@mui/material';
import SearchIcon    from '@mui/icons-material/Search';
import MenuBookIcon  from '@mui/icons-material/MenuBook';
import apiClient     from '../../../../../infrastructure/http/apiClient';
import { fmt, fmtFecha, MESES, ANIOS } from './helpers';

const COLS_HEAD = ['Fecha', 'Tipo', 'Concepto', 'Soporte', 'Tercero', 'Ingreso', 'Egreso', 'Saldo'];

export function LibroMayorTab() {
  const anioActual = new Date().getFullYear();
  const [anio,       setAnio]       = useState(anioActual);
  const [mes,        setMes]        = useState('');
  const [codigoPuc,  setCodigoPuc]  = useState('');
  const { data: rows, cargando, error, ejecutar: cargar } = useAsyncData(
    async () => {
      const params = { anio };
      if (mes)       params.mes       = mes;
      if (codigoPuc) params.codigoPuc = codigoPuc;
      const { data } = await apiClient.get('/api/contabilidad/libro-mayor', { params });
      return data;
    },
    { inicial: null, errorMsg: 'No se pudo cargar el Libro Mayor.' } // null = pre-búsqueda; [] = consultado sin resultados
  );

  useEffect(() => { cargar(); }, [cargar]);

  // Group rows by codigoPuc / categoriaNombre
  const grupos = (rows ?? []).reduce((acc, r) => {
    const key = r.codigoPuc;
    if (!acc[key]) acc[key] = { nombre: r.categoriaNombre, codigo: r.codigoPuc, items: [] };
    acc[key].items.push(r);
    return acc;
  }, {});

  return (
    <Box>
      {/* Filtros */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel>Año</InputLabel>
          <Select value={anio} label="Año" onChange={e => setAnio(e.target.value)}>
            {ANIOS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Mes</InputLabel>
          <Select value={mes} label="Mes" onChange={e => setMes(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            {MESES.map((m, i) => <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Código PUC"
          placeholder="ej. 1105"
          value={codigoPuc}
          onChange={e => setCodigoPuc(e.target.value)}
          sx={{ width: 150 }}
        />
        <Button variant="contained" startIcon={<SearchIcon />} onClick={cargar} disabled={cargando}>
          Consultar
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {cargando && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!cargando && rows !== null && rows.length === 0 && (
        <Box sx={{ py: 8, textAlign: 'center', border: '1.5px dashed', borderColor: 'divider', borderRadius: 2 }}>
          <MenuBookIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">No hay movimientos para los filtros seleccionados</Typography>
        </Box>
      )}

      {!cargando && Object.values(grupos).map(grupo => {
        const totalIngreso = grupo.items.reduce((s, r) => s + Number(r.ingreso), 0);
        const totalEgreso  = grupo.items.reduce((s, r) => s + Number(r.egreso), 0);
        const saldoFinal   = grupo.items.at(-1)?.saldoAcumulado ?? 0;

        return (
          <Box key={grupo.codigo} sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Chip label={grupo.codigo} size="small" sx={{ fontWeight: 700, fontFamily: 'monospace' }} />
              <Typography fontWeight={700} variant="subtitle2">{grupo.nombre}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                Saldo: <strong style={{ color: saldoFinal >= 0 ? '#10B981' : '#EF4444' }}>{fmt(saldoFinal)}</strong>
              </Typography>
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    {COLS_HEAD.map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                        align={['Ingreso','Egreso','Saldo'].includes(h) ? 'right' : 'left'}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {grupo.items.map(r => (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtFecha(r.fecha)}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem' }}>
                        <Chip
                          label={r.tipo === 'ingreso' ? 'Ing' : 'Eg'}
                          size="small"
                          sx={{
                            fontSize: '0.65rem', fontWeight: 700,
                            bgcolor: r.tipo === 'ingreso' ? '#d1fae5' : '#fee2e2',
                            color:   r.tipo === 'ingreso' ? '#065f46' : '#991b1b',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', maxWidth: 200 }}>
                        <Typography fontSize="inherit" noWrap>{r.concepto}</Typography>
                        {r.programaNombre && (
                          <Typography fontSize="0.7rem" color="text.secondary" noWrap>{r.programaNombre}</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                        {r.numeroSoporte ?? '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary', maxWidth: 120 }}>
                        <Typography fontSize="inherit" noWrap>{r.terceroNombre ?? '—'}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.78rem', color: '#10B981', fontFamily: 'monospace' }}>
                        {r.ingreso > 0 ? fmt(r.ingreso) : ''}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.78rem', color: '#EF4444', fontFamily: 'monospace' }}>
                        {r.egreso > 0 ? fmt(r.egreso) : ''}
                      </TableCell>
                      <TableCell align="right" sx={{
                        fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 600,
                        color: r.saldoAcumulado >= 0 ? '#10B981' : '#EF4444',
                      }}>
                        {fmt(r.saldoAcumulado)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell colSpan={5} sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Totales</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#10B981', fontFamily: 'monospace' }}>
                      {fmt(totalIngreso)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#EF4444', fontFamily: 'monospace' }}>
                      {fmt(totalEgreso)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem', fontFamily: 'monospace',
                      color: saldoFinal >= 0 ? '#10B981' : '#EF4444' }}>
                      {fmt(saldoFinal)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );
      })}
    </Box>
  );
}
