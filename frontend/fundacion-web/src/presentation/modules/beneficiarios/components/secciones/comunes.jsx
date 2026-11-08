// Piezas visuales comunes de las secciones del formulario de beneficiario.
// Regla de obligatorios: SOLO la prop `required` (MUI pinta el "*" y pone aria-required);
// las etiquetas no llevan "*" escrito a mano. El error de cada campo va en su propio helper text.
import {
  Box, Grid, Typography, Link, FormControl, InputLabel, Select, MenuItem, FormHelperText, Chip,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import { alpha, lighten } from '@mui/material/styles';
import { NO_REGISTRA } from './beneficiarioForm';

export function SeccionTitulo({ children }) {
  return (
    <Grid size={12}>
      <Box sx={{
        bgcolor: 'secondary.main', borderRadius: 1.5, px: 2, py: 1, mt: 1,
        display: 'flex', alignItems: 'center', borderLeft: '5px solid rgba(0,0,0,0.15)',
      }}>
        <Typography component="h3"
          sx={{ fontWeight: 800, color: 'secondary.contrastText', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          {children}
        </Typography>
      </Box>
    </Grid>
  );
}

/** Leyenda única de obligatorios, arriba del formulario. */
export function LeyendaObligatorios() {
  return (
    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
      <Box component="span" aria-hidden="true" sx={{ color: 'error.main', fontWeight: 700 }}>*</Box> Campo obligatorio
    </Typography>
  );
}

/**
 * Botón "→ No registra" (o "Quitar «No registra»") para los campos que aceptan ese valor.
 * Es un botón real: se alcanza con Tab y se activa con Enter o espacio.
 */
export function NoRegistra({ c, campo, etiqueta }) {
  const valor = c.form[campo];
  if (valor && valor !== NO_REGISTRA) return null;
  const marcado = valor === NO_REGISTRA;
  return (
    <Link component="button" type="button" variant="caption" underline="hover"
      onClick={() => { c.setV(campo, marcado ? '' : NO_REGISTRA); c.marcarTocado(campo); }}
      aria-label={marcado ? `Quitar "No registra" de ${etiqueta}` : `Marcar ${etiqueta} como "No registra"`}
      sx={{
        display: 'block', mt: 0.25, fontSize: '0.7rem', color: marcado ? 'warning.dark' : 'text.secondary', textAlign: 'left',
        // En celular: zona táctil de 40px sin cambiar el tamaño del texto
        '@media (max-width: 599.95px)': { display: 'flex', alignItems: 'center', minHeight: 40, pr: 1.5 },
      }}>
      {marcado ? '✕ Quitar "No registra"' : '→ No registra'}
    </Link>
  );
}

/**
 * Select con etiqueta, `required` y su mensaje de error en un FormHelperText dentro del
 * FormControl, asociado al combo con aria-describedby.
 */
export function CampoSelect({ c, campo, label, required, opciones, vacio = 'Selecciona', onChange, onBlur, value, disabled }) {
  const id = `${c.idPrefix}-${campo}`;
  const msg = c.err(campo);
  return (
    <FormControl fullWidth size="small" required={required} error={!!msg} disabled={disabled}>
      <InputLabel id={`${id}-label`}>{label}</InputLabel>
      <Select labelId={`${id}-label`} label={label} value={value ?? c.form[campo] ?? ''}
        onChange={onChange ?? c.set(campo)} onBlur={onBlur ?? c.touch(campo)}
        SelectDisplayProps={msg ? { 'aria-describedby': `${id}-ayuda` } : undefined}>
        {vacio !== null && <MenuItem value=""><em>{vacio}</em></MenuItem>}
        {opciones.map(o => {
          const op = typeof o === 'string' ? { value: o, label: o } : o;
          return <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>;
        })}
      </Select>
      {msg && <FormHelperText id={`${id}-ayuda`}>{msg}</FormHelperText>}
    </FormControl>
  );
}

/** Chip con la categoría de edad detectada a partir de la fecha. */
export function ChipCategoria({ categoria }) {
  if (!categoria) return null;
  return (
    <Grid size={12}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip label={`${categoria.label} · ${categoria.rango}`} size="small"
          sx={{
            // Modo oscuro: tinte translúcido del tono de la categoría + texto aclarado
            bgcolor: t => (t.palette.mode === 'dark' ? alpha(categoria.tc, 0.3) : categoria.color),
            color:   t => (t.palette.mode === 'dark' ? lighten(categoria.tc, 0.6) : categoria.tc),
            fontWeight: 700, fontSize: '0.78rem', border: '1px solid',
            borderColor: t => alpha(t.palette.mode === 'dark' ? lighten(categoria.tc, 0.4) : categoria.tc, 0.33),
          }} />
        <Typography sx={{ color: 'text.secondary' }} variant="caption">Categoría detectada automáticamente</Typography>
      </Box>
    </Grid>
  );
}

/** Selector Niño / Adulto: grupo de botones exclusivo y accesible. */
export function SelectorTipo({ tipo, onChange }) {
  return (
    <Grid size={12}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography id="selector-tipo-beneficiario" sx={{ color: 'text.secondary', fontWeight: 600 }} variant="body2">Tipo:</Typography>
        <ToggleButtonGroup exclusive size="small" color="primary" value={tipo}
          onChange={(_, v) => onChange(v)} aria-labelledby="selector-tipo-beneficiario"
          sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.8rem', px: 2, minHeight: { xs: 40, sm: 'auto' } } }}>
          <ToggleButton value="niño" aria-label="Niño / Adolescente (menor de 18)">
            <Box component="span" aria-hidden="true" sx={{ mr: 0.75 }}>👦</Box>Niño / Adolescente (menor de 18)
          </ToggleButton>
          <ToggleButton value="adulto" aria-label="Adulto (18 años en adelante)">
            <Box component="span" aria-hidden="true" sx={{ mr: 0.75 }}>🧑</Box>Adulto (18 años en adelante)
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Grid>
  );
}
