import {
  Avatar, Box, Chip, Divider, Grid, IconButton, LinearProgress, Tooltip, Typography, Button,
} from '@mui/material';
import EditIcon     from '@mui/icons-material/Edit';
import DeleteIcon   from '@mui/icons-material/Delete';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import HistoryIcon  from '@mui/icons-material/History';
import MoveDownIcon from '@mui/icons-material/MoveDown';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { COLOR, CAT_COLOR, fmtNum, estadoStock } from './helpers';

export function ItemCard({ item, onMovimiento, onEditar, onEliminar, onHistorial, onTransferir }) {
  const est = estadoStock(item);
  const catColor = CAT_COLOR[item.categoria] ?? '#6b7280';

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
          {item.nombreSede && (
            <Chip icon={<LocationOnIcon sx={{ fontSize: '12px !important' }} />}
              label={item.nombreSede} size="small" variant="outlined"
              sx={{ fontSize: '0.68rem', height: 20, borderColor: '#d9c9f5', color: 'text.secondary' }} />
          )}
        </Box>

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
