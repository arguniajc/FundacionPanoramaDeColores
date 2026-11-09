// Ocupación del cupo de un programa: "12 de 40 cupos" con barra de color
// (verde, ámbar desde el 80 %, rojo lleno) o "Sin límite de cupos".
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { colorEstado } from '@/shared/theme/paleta';
import { estadoCupo } from '@/shared/utils/cupos';

export default function IndicadorCupo({ programa, avisarLleno = true, sx }) {
  const theme = useTheme();
  const c = estadoCupo(programa);
  const { fondo, texto } = colorEstado(c.tono, theme.palette.mode);
  const conBarra = c.limitado && c.conocido;

  return (
    <Box sx={{ minWidth: 110, ...sx }}>
      <Typography variant="caption"
        sx={{ display: 'block', color: c.lleno ? texto : 'text.secondary', fontWeight: c.lleno ? 700 : 400 }}>
        {c.texto}
        {avisarLleno && c.lleno && ' · Cupo lleno'}
        {conBarra && !c.lleno && c.tono === 'aviso' && ` · quedan ${c.disponibles}`}
      </Typography>
      {conBarra && (
        // Solo visual: el texto de arriba ya dice la ocupación
        <Box aria-hidden sx={{ mt: 0.5, height: 6, borderRadius: 3, bgcolor: fondo, overflow: 'hidden' }}>
          <Box sx={{ height: '100%', width: `${Math.round(c.porcentaje * 100)}%`, bgcolor: texto, borderRadius: 3 }} />
        </Box>
      )}
    </Box>
  );
}
