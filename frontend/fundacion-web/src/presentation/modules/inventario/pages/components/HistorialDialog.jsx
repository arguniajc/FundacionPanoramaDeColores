import { useState, useEffect } from 'react';
import {
  Box, CircularProgress, Dialog, DialogContent, DialogTitle,
  IconButton, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { inventarioRepository } from '../../../../../infrastructure/repositories/inventarioRepository';
import { COLOR, fmtNum, fmtFecha } from './helpers';

export function HistorialDialog({ open, item, onClose }) {
  const [movs,     setMovs]     = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (open && item) {
      setCargando(true);
      inventarioRepository.listarMovimientos({ itemId: item.id })
        .then(r => setMovs(r.data))
        .catch(() => {})
        .finally(() => setCargando(false));
    }
  }, [open, item]);

  if (!item) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography fontWeight={800} color={COLOR}>Historial de movimientos</Typography>
          <Typography variant="caption" color="text.secondary">{item.nombre} · {item.nombreSede}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {cargando ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : movs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Sin movimientos registrados.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'rgba(78,27,149,0.06)' } }}>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell align="right">Stock result.</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Donante / Sede destino</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Motivo</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Usuario</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movs.map(m => (
                  <TableRow key={m.id} hover>
                    <TableCell sx={{ fontSize: '0.76rem', whiteSpace: 'nowrap' }}>{fmtFecha(m.fechaMovimiento)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: m.afectaStock === '+' ? '#16a34a' : '#dc2626' }} />
                        <Typography sx={{ fontSize: '0.76rem' }}>{m.nombreTipo}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: m.afectaStock === '+' ? '#16a34a' : '#dc2626' }}>
                        {m.afectaStock === '+' ? '+' : '-'}{fmtNum(m.cantidad)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      {fmtNum(m.stockResultante)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.76rem', display: { xs: 'none', sm: 'table-cell' } }}>
                      {m.nombreDonante || (m.nombreSedeDestino && `→ ${m.nombreSedeDestino}`) || (m.donante) || '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.76rem', maxWidth: 140, display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography noWrap sx={{ fontSize: '0.76rem' }} title={m.motivo}>{m.motivo || '—'}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>
                      {m.usuarioEmail ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  );
}
