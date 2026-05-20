/**
 * FormControles — Controles de formulario reutilizables.
 *
 * Exports:
 *   CampoFecha        — input tipo fecha con etiqueta consistente
 *   CampoDocumento    — select tipo documento + campo número (Grid interno)
 *   CampoCiudad       — autocomplete de ciudades colombianas (freeSolo)
 *   SelectorUbicacion — cascada país / departamento / ciudad
 *   CampoMedidas      — peso (kg) + talla (cm)
 */
import React, { useMemo } from 'react';
import {
  TextField, FormControl, InputLabel, Select, MenuItem,
  Grid, InputAdornment, Autocomplete,
} from '@mui/material';
import {
  TIPOS_DOCUMENTO, PAISES, CIUDADES_COLOMBIA,
  getEstadosDePais, getCiudadesDeUbicacion, UNIDADES_MEDIDA,
} from '../../utils/geodata';

// ── CampoFecha ────────────────────────────────────────────────────────────────
export function CampoFecha({
  label, value, onChange,
  size = 'small', required = false, fullWidth = true, disabled = false, ...rest
}) {
  return (
    <TextField
      fullWidth={fullWidth}
      size={size}
      label={required ? `${label} *` : label}
      type="date"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      InputLabelProps={{ shrink: true }}
      disabled={disabled}
      {...rest}
    />
  );
}

// ── CampoDocumento ────────────────────────────────────────────────────────────
export function CampoDocumento({
  tipoDocumento = '', documento = '',
  onChangeTipo, onChangeNumero,
  size = 'small',
  labelTipo = 'Tipo documento',
  labelNumero = 'Número documento',
  required = false,
}) {
  return (
    <Grid container spacing={2}>
      <Grid size={5}>
        <FormControl fullWidth size={size}>
          <InputLabel>{labelTipo}</InputLabel>
          <Select value={tipoDocumento} label={labelTipo}
            onChange={e => onChangeTipo(e.target.value)}>
            <MenuItem value=""><em>—</em></MenuItem>
            {TIPOS_DOCUMENTO.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid size={7}>
        <TextField fullWidth size={size}
          label={required ? `${labelNumero} *` : labelNumero}
          value={documento}
          onChange={e => onChangeNumero(e.target.value)}
        />
      </Grid>
    </Grid>
  );
}

// ── CampoCiudad ───────────────────────────────────────────────────────────────
export function CampoCiudad({
  value = '', onChange,
  label = 'Ciudad', size = 'small', fullWidth = true,
}) {
  return (
    <Autocomplete
      options={CIUDADES_COLOMBIA}
      freeSolo
      value={value || null}
      onChange={(_, v) => onChange(v ?? '')}
      onInputChange={(_, v, reason) => { if (reason === 'input') onChange(v); }}
      renderInput={p => (
        <TextField {...p} size={size} label={label} fullWidth={fullWidth} />
      )}
    />
  );
}

// ── SelectorUbicacion ─────────────────────────────────────────────────────────
// onChange(campo, valor) donde campo es 'pais' | 'departamento' | 'ciudad'
// Al cambiar país se limpian departamento y ciudad automáticamente.
// Al cambiar departamento se limpia ciudad.
// Carga estados y ciudades dinámicamente según el país seleccionado.
export function SelectorUbicacion({
  pais = '', departamento = '', ciudad = '',
  onChange,
  size = 'small',
  mostrarPais = true,
  mostrarDepartamento = true,
}) {
  const estados  = useMemo(() => getEstadosDePais(pais || 'Colombia'), [pais]);
  const ciudades = useMemo(() => getCiudadesDeUbicacion(pais), [pais]);
  const tieneEstados = estados.length > 0;

  const handlePais = v => {
    onChange('pais', v ?? '');
    onChange('departamento', '');
    onChange('ciudad', '');
  };
  const handleDep = v => {
    onChange('departamento', v ?? '');
    onChange('ciudad', '');
  };

  const colPais   = mostrarPais ? 4 : 0;
  const colDep    = mostrarDepartamento && tieneEstados ? 4 : 0;
  const colCiudad = Math.max(12 - colPais - colDep, 4);

  return (
    <Grid container spacing={2}>
      {mostrarPais && (
        <Grid size={{ xs: 12, sm: 4 }}>
          <Autocomplete
            options={PAISES}
            freeSolo
            value={pais || null}
            onChange={(_, v) => handlePais(v)}
            onInputChange={(_, v, reason) => { if (reason === 'input') handlePais(v); }}
            renderInput={p => <TextField {...p} size={size} label="País" />}
          />
        </Grid>
      )}
      {mostrarDepartamento && tieneEstados && (
        <Grid size={{ xs: 12, sm: mostrarPais ? 4 : 6 }}>
          <Autocomplete
            options={estados}
            freeSolo
            value={departamento || null}
            onChange={(_, v) => handleDep(v)}
            onInputChange={(_, v, reason) => { if (reason === 'input') handleDep(v); }}
            renderInput={p => <TextField {...p} size={size} label="Departamento / Estado" />}
          />
        </Grid>
      )}
      <Grid size={{ xs: 12, sm: colCiudad }}>
        <Autocomplete
          options={ciudades}
          freeSolo
          value={ciudad || null}
          onChange={(_, v) => onChange('ciudad', v ?? '')}
          onInputChange={(_, v, reason) => { if (reason === 'input') onChange('ciudad', v); }}
          renderInput={p => <TextField {...p} size={size} label="Ciudad" />}
        />
      </Grid>
    </Grid>
  );
}

// ── CampoUnidadMedida ─────────────────────────────────────────────────────────
export function CampoUnidadMedida({
  value = '', onChange,
  label = 'Unidad de medida', size = 'small', fullWidth = true, required = false,
}) {
  return (
    <Autocomplete
      options={UNIDADES_MEDIDA}
      freeSolo
      value={value || null}
      onChange={(_, v) => onChange(v ?? '')}
      onInputChange={(_, v, reason) => { if (reason === 'input') onChange(v); }}
      renderInput={p => (
        <TextField {...p} size={size} fullWidth={fullWidth}
          label={required ? `${label} *` : label}
          placeholder="unidad, kg, lt, caja…"
        />
      )}
    />
  );
}

// ── CampoMedidas ──────────────────────────────────────────────────────────────
export function CampoMedidas({
  peso = '', talla = '',
  onChangePeso, onChangeTalla,
  size = 'small',
  labelPeso = 'Peso', labelTalla = 'Talla',
}) {
  return (
    <Grid container spacing={2}>
      <Grid size={6}>
        <TextField fullWidth size={size} label={labelPeso} type="number"
          value={peso}
          onChange={e => onChangePeso(e.target.value)}
          InputProps={{ endAdornment: <InputAdornment position="end">kg</InputAdornment> }}
          inputProps={{ min: 0, max: 500, step: 0.1 }}
        />
      </Grid>
      <Grid size={6}>
        <TextField fullWidth size={size} label={labelTalla} type="number"
          value={talla}
          onChange={e => onChangeTalla(e.target.value)}
          InputProps={{ endAdornment: <InputAdornment position="end">cm</InputAdornment> }}
          inputProps={{ min: 0, max: 300 }}
        />
      </Grid>
    </Grid>
  );
}
