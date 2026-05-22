import {
  Avatar, Box, Chip, Divider, Grid, IconButton, LinearProgress, Tooltip, Typography, Button,
} from '@mui/material';
import EditIcon       from '@mui/icons-material/Edit';
import DeleteIcon     from '@mui/icons-material/Delete';
import SwapHorizIcon  from '@mui/icons-material/SwapHoriz';
import HistoryIcon    from '@mui/icons-material/History';
import MoveDownIcon   from '@mui/icons-material/MoveDown';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import HandshakeIcon  from '@mui/icons-material/Handshake';
import WarningIcon    from '@mui/icons-material/Warning';
import { COLOR, CAT_COLOR, fmtNum, estadoStock } from './helpers';

const TENENCIA_LABEL = {
  comodato:      { label: 'Comodato',       color: '#b45309', bg: '#fef3c7' },
  donacion_uso:  { label: 'Donación en uso', color: '#0369a1', bg: '#e0f2fe' },
  arrendamiento: { label: 'Arrendamiento',  color: '#6d28d9', bg: '#ede9fe' },
};

function diasParaVencer(fechaStr) {
  if (!fechaStr) return null;
  const hoy  = new Date(); hoy.setHours(0,0,0,0);
  const fin  = new Date(fechaStr + 'T00:00:00');
  return Math.ceil((fin - hoy) / 86400000);
}

export function ItemCard({ item, onMovimiento, onEditar, onEliminar, onHistorial, onTransferir }) {
  const est      = estadoStock(item);
  const catColor = CAT_COLOR[item.categoria] ?? '#6b7280';
  const tenencia = TENENCIA_LABEL[item.tipoTenencia];
  const diasVenc = item.tipoTenencia === 'comodato' ? diasParaVencer(item.comodatoFechaFin) : null;
  const proxVencer = diasVenc !== null && diasVenc <= 30;

  return (
    <Box sx={{ border: '1.5px solid #e2d9f3', borderRadius: 2, overflow: 'hidden', bgcolor: '#fdfbff', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ px: 2, pt: 2, pb: 1.5, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <Avatar sx={{ bgcolor: catColor, width: 40, height: 40, fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>
          {item.nombre.slice(0, 2).toUpperCase()}
        </Avatar>
        <Box minWidth={0} flex={1}>
          <Typography fontWeight={800} sx={{ lineHeight: 1.3, fontSize: '0.92rem' }} noWrap title={item.nombre}>
            {item.nombre}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3, flexWrap: 'wrap' }}>
            {item.codigo && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>#{item.codigo}</Typography>
            )}
          </Box>
        </Box>
      </Box>

      <Divider />

      {/* Body */}
      <Box sx={{ px: 2, py: 1.8, flex: 1, display: 'flex', flexDirection: 'column', gap: 1.4 }}>
        <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap' }}>
          <Chip label={item.categoria} size="small"
            sx={{ bgcolor: `${catColor}15`, color: catColor, fontWeight: 700, fontSize: '0.68rem', height: 20 }} />
          {tenencia && (
            <Chip
              icon={<HandshakeIcon sx={{ fontSize: '11px !important', color: `${tenencia.color} !important` }} />}
              label={tenencia.label} size="small"
              sx={{ bgcolor: tenencia.bg, color: tenencia.color, fontWeight: 700, fontSize: '0.68rem', height: 20, border: `1px solid ${tenencia.color}40` }} />
          )}
          {item.nombreSede && (
            <Chip icon={<LocationOnIcon sx={{ fontSize: '12px !important' }} />}
              label={item.nombreSede} size="small" variant="outlined"
              sx={{ fontSize: '0.68rem', height: 20, borderColor: '#d9c9f5', color: 'text.secondary' }} />
          )}
        </Box>

        {/* Info comodato */}
        {item.tipoTenencia === 'comodato' && item.comodante && (
          <Box sx={{ bgcolor: proxVencer ? '#fef3c7' : '#fafafa', border: `1px solid ${proxVencer ? '#f59e0b' : '#e5e7eb'}`, borderRadius: 1.5, px: 1.2, py: 0.8 }}>
            <Box display="flex" alignItems="center" gap={0.5} mb={0.3}>
              {proxVencer && <WarningIcon sx={{ fontSize: 13, color: '#d97706' }} />}
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: proxVencer ? '#b45309' : 'text.secondary' }}>
                {item.comodante}
              </Typography>
              {item.comodatoContrato && (
                <Typography sx={{ fontSize: '0.63rem', color: 'text.secondary' }}>· {item.comodatoContrato}</Typography>
              )}
            </Box>
            {item.comodatoFechaFin && (
              <Typography sx={{ fontSize: '0.63rem', color: proxVencer ? '#b45309' : 'text.secondary' }}>
                Devolver:{' '}
                {new Date(item.comodatoFechaFin + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                {diasVenc !== null && (
                  diasVenc < 0
                    ? ' · VENCIDO'
                    : diasVenc === 0
                    ? ' · Hoy'
                    : ` · ${diasVenc} días`
                )}
              </Typography>
            )}
          </Box>
        )}

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 }}>Stock actual</Typography>
            <Chip label={est.label} color={est.color} size="small"
              sx={{ fontWeight: 700, fontSize: '0.68rem', height: 20 }} />
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: 'text.primary', lineHeight: 1 }}>
            {fmtNum(item.stockActual)}
            <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 400, color: 'text.secondary', ml: 0.5 }}>
              {item.unidadMedida}
            </Typography>
          </Typography>
          {item.stockMinimo > 0 && (
            <LinearProgress variant="determinate" value={est.pct} color={est.color}
              sx={{ mt: 0.7, height: 4, borderRadius: 3 }} />
          )}
        </Box>

        <Grid container spacing={1}>
          <Grid size={6}>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Mínimo</Typography>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>
              {fmtNum(item.stockMinimo)} {item.unidadMedida}
            </Typography>
          </Grid>
          <Grid size={6}>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Unidad</Typography>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'capitalize' }}>
              {item.unidadMedida}
            </Typography>
          </Grid>
        </Grid>

        {item.descripcion && (
          <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary', fontStyle: 'italic' }} noWrap title={item.descripcion}>
            {item.descripcion}
          </Typography>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ px: 1.5, py: 1, bgcolor: 'rgba(78,27,149,0.04)', borderTop: '1.5px solid #e2d9f3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button size="small" variant="contained" startIcon={<SwapHorizIcon />} onClick={() => onMovimiento(item)}
          sx={{ bgcolor: COLOR, fontWeight: 700, fontSize: '0.7rem', px: 1, '&:hover': { bgcolor: '#3b1270' } }}>
          Movimiento
        </Button>
        <Box display="flex" gap={0.3}>
          <Tooltip title="Transferir a otra sede">
            <IconButton size="small" onClick={() => onTransferir(item)} sx={{ color: '#0ea5e9' }}>
              <MoveDownIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Historial">
            <IconButton size="small" onClick={() => onHistorial(item)}>
              <HistoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => onEditar(item)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => onEliminar(item)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}
