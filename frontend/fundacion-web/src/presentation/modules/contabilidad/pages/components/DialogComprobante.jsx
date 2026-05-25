import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, Typography,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { fmt, fmtFecha } from './helpers';
import { generarComprobantePDF } from './generarComprobantePDF';

export function DialogComprobante({ mov, onClose, config }) {
  if (!mov) return null;
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography fontWeight={700}>
            {mov.consecutivo
              ? 'Comprobante #' + mov.consecutivo + '-' + new Date(mov.fecha).getFullYear()
              : 'Detalle del movimiento'}
          </Typography>
          <Chip
            label={mov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
            color={mov.tipo === 'ingreso' ? 'success' : 'error'}
            size="small" sx={{ mt: 0.5 }} />
        </Box>
        <Button size="small" onClick={() => generarComprobantePDF(mov, config)}
          startIcon={<PictureAsPdfIcon />} variant="outlined" color="error">PDF</Button>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={1.5}>
          {[
            ['Fecha',        fmtFecha(mov.fecha)],
            ['Concepto',     mov.concepto],
            ['Monto',        fmt(mov.monto)],
            ['Cuenta',       mov.cuentaNombre],
            ['Categoria PUC', mov.codigoPuc + ' - ' + (mov.categoriaNombre ?? '')],
            ['Programa',     mov.programaNombre ?? '-'],
            ['Tercero',      mov.terceroNombre ?? '-'],
            ['NIT / Doc.',   mov.terceroDocumento ?? '-'],
            ['N Soporte',    mov.numeroSoporte ?? '-'],
            ['Tipo soporte', mov.tipoSoporte ?? '-'],
            ...(mov.retencionPracticada > 0 ? [
              ['Tarifa RTE',   (mov.tarifaRetencion ?? '') + '%'],
              ['Valor RTE',    fmt(mov.retencionPracticada)],
              ['Concepto RTE', mov.conceptoRetencion ?? '-'],
            ] : []),
          ].map(([k, v]) => (
            <Grid item xs={6} key={k}>
              <Typography variant="caption" color="text.secondary" display="block">{k}</Typography>
              <Typography variant="body2" fontWeight={500}>{v}</Typography>
            </Grid>
          ))}
        </Grid>
        {mov.descripcion && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">Descripcion</Typography>
            <Typography variant="body2">{mov.descripcion}</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
