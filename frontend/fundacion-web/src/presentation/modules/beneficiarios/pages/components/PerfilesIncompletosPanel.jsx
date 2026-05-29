// Panel colapsable que lista beneficiarios activos con campos de calidad vacíos.
import { useState, useEffect } from 'react';
import {
  Box, Typography, Collapse, Chip, Button, Paper,
  IconButton, Avatar, Tooltip, CircularProgress,
} from '@mui/material';
import WarningAmberIcon  from '@mui/icons-material/WarningAmber';
import ExpandMoreIcon    from '@mui/icons-material/ExpandMore';
import ExpandLessIcon    from '@mui/icons-material/ExpandLess';
import EditIcon          from '@mui/icons-material/Edit';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import apiClient from '@/infrastructure/http/apiClient';

const CAMPO_COLOR = {
  'Foto del menor':  { bg: '#fce4ec', txt: '#c62828' },
  'Foto documento':  { bg: '#fce4ec', txt: '#c62828' },
  'WhatsApp':        { bg: '#fff3e0', txt: '#e65100' },
  'Dirección':       { bg: '#fff3e0', txt: '#e65100' },
  'Talla camisa':    { bg: '#e8f5e9', txt: '#2e7d32' },
  'Talla zapatos':   { bg: '#e8f5e9', txt: '#2e7d32' },
  'Peso':            { bg: '#e8f5e9', txt: '#2e7d32' },
  'Talla altura':    { bg: '#e8f5e9', txt: '#2e7d32' },
  'Colegio':         { bg: '#e3f2fd', txt: '#1565c0' },
  'Grado escolar':   { bg: '#e3f2fd', txt: '#1565c0' },
};

function AvatarBeneficiario({ nombre, fotoUrl }) {
  const inicial = (nombre || '?').charAt(0).toUpperCase();
  return (
    <Avatar src={fotoUrl || undefined}
      sx={{ width: 36, height: 36, fontSize: '0.9rem', fontWeight: 700,
            bgcolor: fotoUrl ? 'transparent' : '#7c3aed', flexShrink: 0 }}>
      {inicial}
    </Avatar>
  );
}

export function PerfilesIncompletosPanel({ onEditar, refreshKey }) {
  const [datos,     setDatos]     = useState([]);
  const [cargando,  setCargando]  = useState(true);
  const [expandido, setExpandido] = useState(false);
  const [error,     setError]     = useState(false);

  useEffect(() => {
    let activo = true;
    setCargando(true); setError(false);
    apiClient.get('/api/beneficiarios/incompletos')
      .then(({ data }) => { if (activo) { setDatos(data); if (data.length > 0) setExpandido(true); } })
      .catch(() => { if (activo) setError(true); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [refreshKey]);

  if (cargando) return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5, px: 1, opacity: 0.5 }}>
      <CircularProgress size={14} />
      <Typography variant="caption" color="text.secondary">Verificando completitud de perfiles…</Typography>
    </Box>
  );

  if (error || datos.length === 0) return null;

  const totalCamposFaltantes = datos.reduce((s, b) => s + b.faltantes.length, 0);

  return (
    <Paper variant="outlined" sx={{ mb: 2.5, borderRadius: 2, borderColor: '#f59e0b', overflow: 'hidden' }}>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <Box
        onClick={() => setExpandido(v => !v)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          px: 2.5, py: 1.5, bgcolor: '#fffbeb', cursor: 'pointer',
          userSelect: 'none',
          '&:hover': { bgcolor: '#fef3c7' },
          transition: 'background 0.15s',
        }}
      >
        <WarningAmberIcon sx={{ color: '#d97706', fontSize: '1.15rem', flexShrink: 0 }} />
        <Box flex={1}>
          <Typography fontWeight={800} fontSize="0.87rem" color="#92400e">
            {datos.length} perfil{datos.length > 1 ? 'es' : ''} incompleto{datos.length > 1 ? 's' : ''}
          </Typography>
          <Typography fontSize="0.72rem" color="#b45309" sx={{ mt: 0.1 }}>
            {totalCamposFaltantes} campo{totalCamposFaltantes > 1 ? 's' : ''} sin completar en total
          </Typography>
        </Box>
        <Tooltip title={expandido ? 'Ocultar' : 'Ver beneficiarios'}>
          <IconButton size="small" sx={{ color: '#92400e' }}>
            {expandido ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Lista colapsable ──────────────────────────────────────────────────── */}
      <Collapse in={expandido}>
        <Box sx={{ maxHeight: 440, overflowY: 'auto', px: 2, py: 1 }}>
          {datos.map((ben, idx) => (
            <Box key={ben.id} sx={{
              display: 'flex', alignItems: 'flex-start', gap: 1.5,
              py: 1.2, flexWrap: 'wrap',
              borderBottom: idx < datos.length - 1 ? '1px solid #fef3c7' : 'none',
            }}>
              <AvatarBeneficiario nombre={ben.nombre} fotoUrl={ben.fotoUrl} />

              <Box flex={1} minWidth={200}>
                {/* nombre + % completitud */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                  <Typography fontWeight={700} fontSize="0.87rem" color="text.primary">
                    {ben.nombre}
                  </Typography>
                  <Chip
                    label={`${ben.completitud}% completo`}
                    size="small"
                    sx={{
                      fontSize: '0.68rem', fontWeight: 700, height: 18,
                      bgcolor: ben.completitud >= 60 ? '#fff3e0' : '#fce4ec',
                      color:   ben.completitud >= 60 ? '#c2410c'  : '#b91c1c',
                    }}
                  />
                </Box>

                {/* chips de campos faltantes */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                  {ben.faltantes.map(f => {
                    const c = CAMPO_COLOR[f] ?? { bg: '#f3f4f6', txt: '#374151' };
                    return (
                      <Chip key={f} label={f} size="small"
                        sx={{
                          fontSize: '0.63rem', height: 18, fontWeight: 600,
                          bgcolor: c.bg, color: c.txt,
                          '& .MuiChip-label': { px: 0.8 },
                        }}
                      />
                    );
                  })}
                </Box>
              </Box>

              <Tooltip title="Editar y completar datos">
                <Button size="small" variant="outlined" startIcon={<EditIcon sx={{ fontSize: '0.8rem !important' }} />}
                  onClick={() => onEditar(ben.id)}
                  sx={{
                    borderColor: '#7c3aed', color: '#7c3aed',
                    fontSize: '0.72rem', py: 0.3, px: 1.2, minWidth: 0,
                    flexShrink: 0, alignSelf: 'center',
                    '&:hover': { bgcolor: '#f5f0ff', borderColor: '#6d28d9' },
                  }}>
                  Editar
                </Button>
              </Tooltip>
            </Box>
          ))}
        </Box>

        {/* Footer */}
        <Box sx={{ px: 2.5, py: 1, bgcolor: '#fffbeb', borderTop: '1px solid #fef3c7',
                   display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon sx={{ fontSize: '0.85rem', color: '#2e7d32' }} />
          <Typography fontSize="0.72rem" color="text.secondary">
            Los campos marcados se completan en el formulario de edición.
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
}
