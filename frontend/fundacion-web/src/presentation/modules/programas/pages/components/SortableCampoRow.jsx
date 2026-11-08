import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import DeleteIcon        from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon          from '@mui/icons-material/Edit';
import { useSortable }   from '@dnd-kit/sortable';
import { CSS }           from '@dnd-kit/utilities';
import { COLOR, TIPOS_CAMPO } from './helpers';

export function SortableCampoRow({ campo, ci, grupoLength, onEditar, onEliminar, onAncho, reordenando }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: campo.id });

  const tipoLabel = TIPOS_CAMPO.find(t => !t._h && t.value === campo.tipo)?.label ?? campo.tipo;
  const esFull    = (campo.columnas ?? 6) === 12;

  return (
    <Box ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 'auto' }}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1.2,
        bgcolor: (t) => (isDragging ? alpha(t.palette.primary.main, 0.12) : ci % 2 === 0 ? t.palette.background.paper : t.palette.superficie2),
        borderBottom: ci < grupoLength - 1 ? '1px solid' : 'none', borderBottomColor: 'divider',
        boxShadow: isDragging ? '0 4px 14px rgba(78,27,149,.18)' : 'none',
        borderRadius: isDragging ? 1 : 0,
      }}>
      <Box {...attributes} {...listeners}
        sx={{ cursor: isDragging ? 'grabbing' : 'grab', color: 'text.disabled',
              display: 'flex', alignItems: 'center', touchAction: 'none', flexShrink: 0 }}>
        <DragIndicatorIcon fontSize="small" />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700 }} variant="body2" noWrap>{campo.etiqueta}</Typography>
        <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mt: 0.6 }}>
          <Chip label={tipoLabel} size="small"
            sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.12), color: COLOR, fontWeight: 600 }} />
          {campo.obligatorio && (
            <Chip label="Req." size="small" color="warning" />
          )}
          <Chip label={esFull ? '← fila completa →' : '⬛ media fila'}
            size="small" variant="outlined"
            sx={{ color: 'text.secondary', borderColor: 'divider' }} />
        </Box>
      </Box>

      <Tooltip title={esFull ? 'Cambiar a media fila (½)' : 'Cambiar a fila completa'}>
        <IconButton size="small" disabled={reordenando} onClick={() => onAncho(campo)}
          sx={{ fontSize: 13, fontWeight: 800, color: esFull ? COLOR : 'text.disabled',
                border: '1px solid', borderColor: esFull ? COLOR : 'divider',
                borderRadius: 1, px: 0.7, py: 0.2, minWidth: 0 }}>
          {esFull ? '□' : '½'}
        </IconButton>
      </Tooltip>

      <Tooltip title="Editar">
        <IconButton size="small" onClick={() => onEditar(campo)}>
          <EditIcon fontSize="small" sx={{ color: COLOR }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Eliminar">
        <IconButton size="small" onClick={() => onEliminar(campo.id)}>
          <DeleteIcon fontSize="small" color="error" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
