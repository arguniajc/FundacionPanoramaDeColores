import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
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
        bgcolor: isDragging ? '#ede7f6' : ci % 2 === 0 ? '#fdfbff' : '#f8f5ff',
        borderBottom: ci < grupoLength - 1 ? '1px solid #ede7f6' : 'none',
        boxShadow: isDragging ? '0 4px 14px rgba(78,27,149,.18)' : 'none',
        borderRadius: isDragging ? 1 : 0,
      }}>
      <Box {...attributes} {...listeners}
        sx={{ cursor: isDragging ? 'grabbing' : 'grab', color: '#ccc',
              display: 'flex', alignItems: 'center', touchAction: 'none', flexShrink: 0 }}>
        <DragIndicatorIcon fontSize="small" />
      </Box>

      <Box flex={1} minWidth={0}>
        <Typography variant="body2" fontWeight={700} noWrap>{campo.etiqueta}</Typography>
        <Box display="flex" gap={0.8} flexWrap="wrap" mt={0.6}>
          <Chip label={tipoLabel} size="small"
            sx={{ bgcolor: '#ede7f6', color: COLOR, fontWeight: 600 }} />
          {campo.obligatorio && (
            <Chip label="Req." size="small" color="warning" />
          )}
          <Chip label={esFull ? '← fila completa →' : '⬛ media fila'}
            size="small" variant="outlined"
            sx={{ color: '#888', borderColor: '#ddd' }} />
        </Box>
      </Box>

      <Tooltip title={esFull ? 'Cambiar a media fila (½)' : 'Cambiar a fila completa'}>
        <IconButton size="small" disabled={reordenando} onClick={() => onAncho(campo)}
          sx={{ fontSize: 13, fontWeight: 800, color: esFull ? COLOR : '#bbb',
                border: '1px solid', borderColor: esFull ? COLOR : '#e0d9f3',
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
