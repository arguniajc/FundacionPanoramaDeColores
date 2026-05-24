import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Chip, CircularProgress, Collapse,
  Tooltip, Typography,
} from '@mui/material';
import ExpandMoreIcon  from '@mui/icons-material/ExpandMore';
import ExpandLessIcon  from '@mui/icons-material/ExpandLess';
import HistoryIcon     from '@mui/icons-material/History';
import { beneficiariosRepository } from '../../../../infrastructure/repositories/beneficiariosRepository';

const COLOR = 'var(--color-primario)';

const ACCION_META = {
  creado:      { label: 'Inscrito',      color: '#166534', bg: '#dcfce7', border: '#86efac' },
  editado:     { label: 'Editado',       color: '#1e40af', bg: '#dbeafe', border: '#93c5fd' },
  baja:        { label: 'Dado de baja',  color: '#7c2d12', bg: '#fee2e2', border: '#fca5a5' },
  reactivado:  { label: 'Reactivado',    color: '#065f46', bg: '#d1fae5', border: '#6ee7b7' },
  eliminado:   { label: 'Eliminado',     color: '#6b21a8', bg: '#f3e8ff', border: '#d8b4fe' },
};

function fmtFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function HistorialBeneficiario({ beneficiarioId }) {
  const [open,     setOpen]     = useState(false);
  const [cargando, setCargando] = useState(false);
  const [items,    setItems]    = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await beneficiariosRepository.historial(beneficiarioId);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setCargando(false);
    }
  }, [beneficiarioId]);

  useEffect(() => {
    if (open && items === null) cargar();
  }, [open, items, cargar]);

  return (
    <Box>
      <Button
        size="small"
        variant={open ? 'contained' : 'outlined'}
        startIcon={<HistoryIcon sx={{ fontSize: 16 }} />}
        endIcon={open ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
        onClick={() => setOpen(v => !v)}
        sx={{
          borderColor: COLOR, color: open ? '#fff' : COLOR,
          bgcolor: open ? COLOR : 'transparent',
          '&:hover': { bgcolor: open ? 'var(--color-gradiente)' : 'rgba(78,27,149,0.06)', borderColor: COLOR },
          fontWeight: 700, textTransform: 'none', mb: 1,
        }}
      >
        Ver historial de cambios
      </Button>

      <Collapse in={open}>
        <Box sx={{
          bgcolor: 'rgba(78,27,149,0.04)', border: '1px solid rgba(78,27,149,0.15)',
          borderRadius: 2, p: 1.5, maxHeight: 260, overflowY: 'auto',
        }}>
          {cargando && (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={22} sx={{ color: COLOR }} />
            </Box>
          )}

          {!cargando && items?.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              Sin registros de cambios aún.
            </Typography>
          )}

          {!cargando && items?.map((item, idx) => {
            const meta = ACCION_META[item.accion] ?? { label: item.accion, color: '#374151', bg: '#f3f4f6', border: '#d1d5db' };
            return (
              <Box
                key={item.id}
                sx={{
                  display: 'flex', alignItems: 'flex-start', gap: 1.5,
                  py: 1,
                  borderBottom: idx < items.length - 1 ? '1px solid rgba(78,27,149,0.1)' : 'none',
                }}
              >
                <Chip
                  label={meta.label}
                  size="small"
                  sx={{
                    bgcolor: meta.bg, color: meta.color, fontWeight: 700,
                    border: `1px solid ${meta.border}`, fontSize: '0.72rem',
                    height: 22, flexShrink: 0, mt: 0.2,
                  }}
                />
                <Box flex={1} minWidth={0}>
                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                      {fmtFecha(item.fecha)}
                    </Typography>
                    {item.usuarioEmail && (
                      <Tooltip title={item.usuarioEmail}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: COLOR, fontWeight: 600,
                            maxWidth: 160, overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                        >
                          · {item.usuarioEmail.split('@')[0]}
                        </Typography>
                      </Tooltip>
                    )}
                  </Box>
                  {item.detalle && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {item.detalle}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Collapse>
    </Box>
  );
}
