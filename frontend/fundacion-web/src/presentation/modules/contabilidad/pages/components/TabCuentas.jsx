import {
  Box, Button, Card, CardContent, Chip, Divider, Grid,
  IconButton, Typography,
} from '@mui/material';
import AddIcon    from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon   from '@mui/icons-material/Edit';
import { fmt } from './helpers';

export function TabCuentas({ cuentas, puedeCrear, puedeEditar, onCrear, onEditar, onEliminar }) {
  return (
    <Box>
      {puedeCrear && (
        <Button variant="contained" startIcon={<AddIcon />} sx={{ mb: 3 }} onClick={onCrear}>
          Nueva Cuenta
        </Button>
      )}
      <Grid container spacing={3}>
        {cuentas.map(c => (
          <Grid item xs={12} sm={6} md={4} key={c.id}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">{c.nombre}</Typography>
                    <Chip
                      label={c.tipo === 'cuenta_bancaria' ? 'Banco' : c.tipo === 'caja_menor' ? 'Caja Menor' : 'Caja'}
                      color={c.tipo === 'caja_menor' ? 'warning' : 'default'}
                      size="small" sx={{ mt: .5 }} />
                    {c.banco && (
                      <Typography variant="caption" display="block" color="text.secondary">{c.banco}</Typography>
                    )}
                    {c.numeroCuenta && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        Cta: {c.numeroCuenta}
                      </Typography>
                    )}
                  </Box>
                  {puedeEditar && (
                    <Box>
                      <IconButton size="small" onClick={() => onEditar(c)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => onEliminar(c.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">Saldo inicial</Typography>
                  <Typography variant="caption">{fmt(c.saldoInicial)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: .5 }}>
                  <Typography variant="body2" fontWeight="bold">Saldo actual</Typography>
                  <Typography variant="body2" fontWeight="bold"
                    color={(c.saldoActual ?? 0) >= 0 ? 'success.main' : 'error.main'}>
                    {fmt(c.saldoActual)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {cuentas.length === 0 && (
          <Grid item xs={12}>
            <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
              No hay cuentas. Crea una cuenta de caja o bancaria para empezar a registrar movimientos.
            </Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
