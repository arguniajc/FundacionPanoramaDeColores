import { useState, useEffect } from 'react';
import { useAsyncData } from '@/shared/hooks/useAsyncData';
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse,
  Tooltip, Typography,
} from '@mui/material';
import { useTheme }    from '@mui/material/styles';
import ExpandMoreIcon  from '@mui/icons-material/ExpandMore';
import ExpandLessIcon  from '@mui/icons-material/ExpandLess';
import HistoryIcon     from '@mui/icons-material/History';
import { beneficiariosRepository } from '@/infrastructure/repositories/beneficiariosRepository';
import { colorEstado } from '@/shared/theme/paleta';

const COLOR = 'var(--color-primario)';

const ACCION_META = {
  creado:      { label: 'Inscrito',      tono: 'exito' },
  editado:     { label: 'Editado',       tono: 'info'  },
  baja:        { label: 'Dado de baja',  tono: 'error' },
  reactivado:  { label: 'Reactivado',    tono: 'exito' },
  eliminado:   { label: 'Eliminado',     tono: 'marca' },
};

function fmtFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function HistorialBeneficiario({ beneficiarioId }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const { data: items, cargando, error, ejecutar: cargar } = useAsyncData(
    async () => {
      const { data } = await beneficiariosRepository.historial(beneficiarioId);
      return data;
    },
    // null = "aún no cargado"; evita re-fetch cada vez que se abre (si falla, se reintenta al reabrir)
    { inicial: null, errorMsg: 'No se pudo cargar el historial de cambios.' }
  );

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
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={22} sx={{ color: COLOR }} />
            </Box>
          )}

          {!cargando && error && (
            <Alert severity="error" sx={{ py: 0 }}>{error}</Alert>
          )}

          {!cargando && items?.length === 0 && (
            <Typography sx={{ color: 'text.secondary' }} variant="caption">
              Sin registros de cambios aún.
            </Typography>
          )}

          {!cargando && items?.map((item, idx) => {
            const meta = ACCION_META[item.accion] ?? { label: item.accion, tono: 'neutro' };
            const tono = colorEstado(meta.tono, theme.palette.mode);
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
                    bgcolor: tono.fondo, color: tono.texto, fontWeight: 700,
                    border: '1px solid', borderColor: 'divider', fontSize: '0.72rem',
                    height: 22, flexShrink: 0, mt: 0.2,
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 600, color: 'text.secondary' }} variant="caption">
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
                    <Typography sx={{ color: 'text.secondary', display: 'block' }} variant="caption">
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
