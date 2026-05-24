import { useState } from 'react';
import {
  Box, Button, Chip, Collapse, IconButton, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import AddIcon        from '@mui/icons-material/Add';
import DeleteIcon     from '@mui/icons-material/Delete';
import EditIcon       from '@mui/icons-material/Edit';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SchoolIcon     from '@mui/icons-material/School';
import ToggleOffIcon  from '@mui/icons-material/ToggleOff';
import ToggleOnIcon   from '@mui/icons-material/ToggleOn';

export function TarjetaSede({ sede, onEditar, onEliminar, onToggle, onEditarPrograma, onEliminarPrograma, onTogglePrograma, onNuevoPrograma }) {
  const [expandida, setExpandida] = useState(false);

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 2,
        px: 2.5, py: 2, bgcolor: '#fdfbff',
        borderBottom: expandida ? '1px solid' : 'none', borderColor: 'divider',
      }}>
        <LocationOnIcon sx={{ color: 'var(--color-primario)', flexShrink: 0 }} />
        <Box flex={1} minWidth={0}>
          <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
            <Typography fontWeight={700} noWrap>{sede.nombre}</Typography>
            <Chip label={sede.activo ? 'Activa' : 'Inactiva'} size="small"
              color={sede.activo ? 'success' : 'default'} />
          </Box>
          {(sede.ciudad || sede.direccion) && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {[sede.ciudad, sede.direccion].filter(Boolean).join(' · ')}
            </Typography>
          )}
        </Box>
        <Box display="flex" gap={1} flexShrink={0}>
          <Tooltip title={sede.activo ? 'Desactivar' : 'Activar'}>
            <IconButton size="small" onClick={() => onToggle(sede)}>
              {sede.activo ? <ToggleOnIcon sx={{ color: 'var(--color-secundario)' }} /> : <ToggleOffIcon sx={{ color: '#aaa' }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar sede">
            <IconButton size="small" onClick={() => onEditar(sede)}>
              <EditIcon fontSize="small" sx={{ color: '#1565C0' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar sede">
            <IconButton size="small" onClick={() => onEliminar(sede)}>
              <DeleteIcon fontSize="small" sx={{ color: '#c62828' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={expandida ? 'Ocultar programas' : 'Ver programas'}>
            <IconButton size="small" onClick={() => setExpandida(p => !p)}>
              {expandida ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Collapse in={expandida}>
        <Box sx={{ px: 2.5, py: 2, overflowX: 'auto' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={1.5}>
            <Typography variant="body2" fontWeight={700} color="#2D984F" display="flex" alignItems="center" gap={0.5}>
              <SchoolIcon fontSize="small" /> Programas ({sede.programas?.length ?? 0})
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={() => onNuevoPrograma(sede)}
              sx={{ color: 'var(--color-secundario)', textTransform: 'none' }}>
              Agregar
            </Button>
          </Box>

          {(!sede.programas || sede.programas.length === 0) ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 1 }}>
              No hay programas. Haz clic en Agregar para crear uno.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--color-primario)' }}>Programa</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--color-primario)' }}>Cupo</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--color-primario)' }}>Estado</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sede.programas.map(prog => (
                    <TableRow key={prog.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{prog.nombre}</Typography>
                        {prog.descripcion && <Typography variant="caption" color="text.secondary">{prog.descripcion}</Typography>}
                      </TableCell>
                      <TableCell><Typography variant="body2">{prog.cupoMaximo ?? '—'}</Typography></TableCell>
                      <TableCell>
                        <Chip label={prog.activo ? 'Activo' : 'Inactivo'} size="small"
                          color={prog.activo ? 'success' : 'default'} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={prog.activo ? 'Desactivar' : 'Activar'}>
                          <IconButton size="small" onClick={() => onTogglePrograma(prog)}>
                            {prog.activo ? <ToggleOnIcon fontSize="small" sx={{ color: 'var(--color-secundario)' }} /> : <ToggleOffIcon fontSize="small" sx={{ color: '#aaa' }} />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => onEditarPrograma(sede, prog)}>
                            <EditIcon fontSize="small" sx={{ color: '#1565C0' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton size="small" onClick={() => onEliminarPrograma(prog)}>
                            <DeleteIcon fontSize="small" sx={{ color: '#c62828' }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}
