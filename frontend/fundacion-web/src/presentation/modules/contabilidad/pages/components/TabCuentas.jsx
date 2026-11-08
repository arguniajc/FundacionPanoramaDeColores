import {
  Box, Button, Card, CardContent, Chip, Divider, Grid,
  IconButton, Typography,
} from '@mui/material';
import AddIcon    from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon   from '@mui/icons-material/Edit';
import { fmt } from './formato';

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
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={c.id}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 'bold' }} variant="subtitle1">{c.nombre}</Typography>
                    <Chip
                      label={c.tipo === 'cuenta_bancaria' ? 'Banco' : c.tipo === 'caja_menor' ? 'Caja Menor' : 'Caja'}
                      color={c.tipo === 'caja_menor' ? 'warning' : 'default'}
                      size="small" sx={{ mt: .5 }} />
                    {c.banco && (
                      <Typography sx={{ display: 'block', color: 'text.secondary' }} variant="caption">{c.banco}</Typography>
                    )}
                    {c.numeroCuenta && (
                      <Typography sx={{ display: 'block', color: 'text.secondary' }} variant="caption">
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
                  <Typography sx={{ color: 'text.secondary' }} variant="caption">Saldo inicial</Typography>
                  <Typography variant="caption">{fmt(c.saldoInicial)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: .5 }}>
                  <Typography sx={{ fontWeight: 'bold' }} variant="body2">Saldo actual</Typography>
                  <Typography sx={{ fontWeight: 'bold', color: (c.saldoActual ?? 0) >= 0 ? 'success.main' : 'error.main' }} variant="body2">
                    {fmt(c.saldoActual)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {cuentas.length === 0 && (
          <Grid size={12}>
            <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
              No hay cuentas. Crea una cuenta de caja o bancaria para empezar a registrar movimientos.
            </Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
