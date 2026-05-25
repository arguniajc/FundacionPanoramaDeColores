import {
  Autocomplete, Box, Button, Chip, FormControl, FormControlLabel,
  InputAdornment, InputLabel, MenuItem, Select, Switch, TextField, Typography,
} from '@mui/material';
import {
  PAISES, DEPARTAMENTOS_COLOMBIA, CIUDADES_COLOMBIA,
  TIPOS_DOCUMENTO, GENEROS, TIPOS_SANGRE, ESTRATOS, NIVELES_EDUCATIVOS,
  TALLAS_ROPA, TALLAS_PANTALON, TALLAS_ZAPATOS, VALORACIONES,
  GRADOS_COLOMBIA, JORNADAS_ESCOLARES, AUTOIDENTIFICACION,
} from '@/shared/utils/geodata';
import { TIPOS_CAMPO } from './helpers';

export function CampoPreview({ campo }) {
  const label = campo.etiqueta + (campo.obligatorio ? ' *' : '');
  const tipoLabel = TIPOS_CAMPO.find(t => !t._h && t.value === campo.tipo)?.label ?? campo.tipo;

  if (campo.tipo === 'boolean') return (
    <FormControlLabel
      control={<Switch disabled size="small" />}
      label={<Typography variant="body2">{label}</Typography>}
    />
  );

  if (campo.tipo === 'select') return (
    <FormControl fullWidth size="small">
      <InputLabel shrink>{label}</InputLabel>
      <Select label={label} value="" disabled displayEmpty>
        <MenuItem value=""><em>Seleccionar…</em></MenuItem>
        {(campo.opciones ?? []).map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
      </Select>
    </FormControl>
  );

  if (campo.tipo === 'document') return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
        {label}
      </Typography>
      <Box display="flex" alignItems="center" gap={1}>
        <Chip label="Pendiente" color="warning" size="small" variant="outlined" />
        <Button variant="outlined" size="small" disabled sx={{ borderColor: '#ddd', color: '#aaa' }}>
          Seleccionar PDF
        </Button>
      </Box>
    </Box>
  );

  if (campo.tipo === 'daterange') return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
        {label}
      </Typography>
      <Box display="flex" gap={1} alignItems="center">
        <TextField size="small" label="Desde" type="date" disabled value=""
          slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
        <Typography variant="body2" color="text.secondary">—</Typography>
        <TextField size="small" label="Hasta" type="date" disabled value=""
          slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
      </Box>
    </Box>
  );

  if (campo.tipo === 'talla' || campo.tipo === 'altura') return (
    <TextField fullWidth size="small" label={label} type="number" disabled value=""
      slotProps={{ input: { endAdornment: <InputAdornment position="end">cm</InputAdornment> } }}
    />
  );
  if (campo.tipo === 'edad') return (
    <TextField fullWidth size="small" label={label} type="number" disabled value=""
      helperText={`Tipo: ${tipoLabel}`}
      slotProps={{ input: { endAdornment: <InputAdornment position="end">años</InputAdornment> } }}
    />
  );
  if (campo.tipo === 'fecha_nac') return (
    <TextField fullWidth size="small" label={label} type="date" disabled value=""
      helperText={`Tipo: ${tipoLabel}`}
      slotProps={{ inputLabel: { shrink: true } }}
    />
  );

  if (campo.tipo === 'pais' || campo.tipo === 'departamento' || campo.tipo === 'ciudad') {
    const opciones = campo.tipo === 'pais' ? PAISES
      : campo.tipo === 'departamento' ? DEPARTAMENTOS_COLOMBIA
      : CIUDADES_COLOMBIA;
    return (
      <Autocomplete freeSolo disabled options={opciones} value={null}
        renderInput={(params) => (
          <TextField {...params} fullWidth size="small" label={label}
            helperText={`Lista de ${opciones.length} opciones precargadas`} />
        )}
      />
    );
  }

  if (campo.tipo === 'documento_id') return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
        {label}
      </Typography>
      <Box display="flex" gap={1}>
        <FormControl size="small" disabled sx={{ width: 130 }}>
          <InputLabel shrink>Tipo</InputLabel>
          <Select label="Tipo" value="" displayEmpty>
            {TIPOS_DOCUMENTO.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField size="small" label="Número" disabled value="" sx={{ flex: 1 }} />
      </Box>
    </Box>
  );

  if (campo.tipo === 'grado_escolar') return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
        {label}
      </Typography>
      <Box display="flex" gap={1.5}>
        <FormControl size="small" disabled sx={{ flex: 2 }}>
          <InputLabel shrink>Grado</InputLabel>
          <Select label="Grado" value="" displayEmpty>
            {GRADOS_COLOMBIA.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" disabled sx={{ flex: 1 }}>
          <InputLabel shrink>Jornada</InputLabel>
          <Select label="Jornada" value="" displayEmpty>
            {JORNADAS_ESCOLARES.map(j => <MenuItem key={j} value={j}>{j}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );

  if (campo.tipo === 'datos_padre' || campo.tipo === 'datos_madre' || campo.tipo === 'datos_tutor') {
    const SC = '#7B3FC4';
    const subcampos = campo.tipo === 'datos_tutor' ? '17 sub-campos' : '16 sub-campos';
    return (
      <Box sx={{
        border: `1.5px solid ${SC}40`, borderRadius: 2.5, overflow: 'hidden',
        boxShadow: '0 3px 14px rgba(78,27,149,0.10)',
      }}>
        <Box sx={{
          bgcolor: `${SC}18`, borderBottom: `1.5px solid ${SC}30`,
          borderLeft: `5px solid ${SC}`, px: 2, py: 1,
          display: 'flex', alignItems: 'center', gap: 1.5,
        }}>
          <Typography sx={{ fontSize: '0.88rem', fontWeight: 800, color: SC, flex: 1 }}>
            {label}
          </Typography>
          <Chip label={subcampos} size="small"
            sx={{ bgcolor: `${SC}18`, color: SC, fontWeight: 700, fontSize: '0.68rem',
                  border: `1px solid ${SC}40`, height: 22 }} />
        </Box>
        <Box sx={{ bgcolor: '#f9f6ff', px: 2, py: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            {campo.tipo === 'datos_tutor' && 'Relación / Parentesco · '}
            Nombres · Apellidos · Fecha nac. · País · Dpto. · Ciudad · Tipo doc. · N° doc. · Dirección · Barrio · EPS · Celular · Escolaridad · Empresa · Ocupación · Autoidentificación
          </Typography>
        </Box>
      </Box>
    );
  }

  if (campo.tipo === 'telefono') return (
    <TextField fullWidth size="small" label={label} type="tel" disabled value=""
      slotProps={{ input: { startAdornment: <InputAdornment position="start">📞</InputAdornment> } }} />
  );

  if (campo.tipo === 'email') return (
    <TextField fullWidth size="small" label={label} type="email" disabled value=""
      placeholder="ejemplo@correo.com" />
  );

  if (campo.tipo === 'peso') return (
    <TextField fullWidth size="small" label={label} type="number" disabled value=""
      slotProps={{ input: { endAdornment: <InputAdornment position="end">kg</InputAdornment> } }} />
  );

  if (campo.tipo === 'tipo_documento'  || campo.tipo === 'genero'        ||
      campo.tipo === 'tipo_sangre'     || campo.tipo === 'estrato'       ||
      campo.tipo === 'nivel_educativo' || campo.tipo === 'talla_ropa'    ||
      campo.tipo === 'talla_pantalon'  || campo.tipo === 'talla_zapatos' ||
      campo.tipo === 'valoracion'      || campo.tipo === 'autoidentificacion') {
    const listas = {
      tipo_documento: TIPOS_DOCUMENTO, genero: GENEROS,
      tipo_sangre: TIPOS_SANGRE, estrato: ESTRATOS, nivel_educativo: NIVELES_EDUCATIVOS,
      talla_ropa: TALLAS_ROPA, talla_pantalon: TALLAS_PANTALON,
      talla_zapatos: TALLAS_ZAPATOS, valoracion: VALORACIONES,
      autoidentificacion: AUTOIDENTIFICACION,
    };
    const ops = listas[campo.tipo];
    return (
      <FormControl fullWidth size="small">
        <InputLabel shrink>{label}</InputLabel>
        <Select label={label} value="" disabled displayEmpty>
          <MenuItem value=""><em>Seleccionar…</em></MenuItem>
          {ops.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </Select>
      </FormControl>
    );
  }

  return (
    <TextField fullWidth size="small" label={label} disabled value=""
      type={campo.tipo === 'number' ? 'number' : campo.tipo === 'date' ? 'date' : 'text'}
      slotProps={campo.tipo === 'date' ? { inputLabel: { shrink: true } } : undefined}
    />
  );
}
