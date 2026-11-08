/**
 * FormControles — Controles de formulario reutilizables.
 *
 * Exports:
 *   CampoFecha        — input tipo fecha con etiqueta consistente
 *   CampoDocumento    — select tipo documento (catálogo único) + número con teclado según el tipo
 *   CampoTelefono     — teléfono con teclado de marcación en el celular
 *   CampoMoneda       — pesos con separador de miles mientras se escribe (ver CampoMoneda.jsx)
 *   CampoCiudad       — autocomplete de ciudades colombianas (freeSolo)
 *   SelectorUbicacion — cascada país / departamento / ciudad (Colombia: lista DANE cerrada)
 *   CampoUnidadMedida — unidad de medida (freeSolo)
 *   CampoMedidas      — peso (kg) + talla (cm)
 *   AccionesDialogo   — botonera [Anterior] … [Cancelar][Principal] (ver AccionesDialogo.jsx)
 *   ErrorServidor     — error del servidor cerrable, junto a ResumenErrores (ver ErrorServidor.jsx)
 *
 * Patrón recomendado de un diálogo con formulario (Enter guarda, confirma al cerrar con cambios):
 *
 *   const [inicial] = useState(form);
 *   const { confirmarCierre } = useCerrarConCambios({
 *     hayCambios: hayCambiosEn(form, inicial), bloqueado: guardando, onCerrar: onClose });
 *   const autoFocus = useAutoFocus();
 *
 *   <Dialog open onClose={confirmarCierre} alEnviar={guardar}>
 *     <DialogTitle>Nuevo voluntario</DialogTitle>
 *     <DialogContent>
 *       <TextField label="Nombre completo *" autoFocus={autoFocus} {...v.props('nombre')} … />
 *       <CampoTelefono value={form.telefono} onChange={t => set('telefono', t)} {...v.props('telefono')} />
 *     </DialogContent>
 *     <ResumenErrores {...v.resumen} accion="guardar" />
 *     <ErrorServidor mensaje={error} onClose={() => setError('')} />
 *     <AccionesDialogo onCancelar={confirmarCierre} guardando={guardando} enviar />
 *   </Dialog>
 */
import React, { useId } from 'react';
import {
  TextField, FormControl, InputLabel, Select, MenuItem,
  Grid, InputAdornment, Autocomplete, FormHelperText,
} from '@mui/material';
import {
  PAISES, CIUDADES_COLOMBIA, UNIDADES_MEDIDA,
} from '../../utils/geodata';
import {
  opcionesTipoDocumento, opcionConValorActual, tecladoDocumento, normalizarTipoDocumento,
} from '../../constants/tiposDocumento';
import { calcularDvNit } from '../../utils/validacion';
import { limpiarTelefono } from '../../utils/entradaCampos';
import { useGeografia } from '../../hooks/useGeografia';

export { default as CampoMoneda }     from './CampoMoneda';
export { default as AccionesDialogo } from './AccionesDialogo';
export { default as ErrorServidor }   from './ErrorServidor';

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
      slotProps={{ inputLabel: { shrink: true } }}
      disabled={disabled}
      {...rest}
    />
  );
}

// ── CampoDocumento ────────────────────────────────────────────────────────────
/**
 * Select de tipo (catálogo constants/tiposDocumento) + número.
 *   <CampoDocumento tipoDocumento={form.tipoDocumento} documento={form.documento}
 *     onChangeTipo={t => set('tipoDocumento', t)} onChangeNumero={n => set('documento', n)}
 *     aplicaA={['persona', 'empresa']} validacionNumero={v.props('documento')} />
 * - aplicaA: grupo(s) del catálogo ('menor'|'adulto'|'persona'|'empresa'); por defecto 'persona'
 *   (la misma lista de siempre: RC, TI, CC, CE, PA, PEP, PPT, NIT, Otro).
 * - El menú muestra "CC – Cédula de ciudadanía"; el campo cerrado muestra solo el código.
 * - El número usa teclado numérico para RC/TI/CC/NUIP y de marcación (dígitos y guion) para NIT.
 * - Con NIT sin dígito de verificación, sugiere el DV en el texto de ayuda (sugerirDv=false lo quita).
 * - Un valor guardado que no está en la lista (p. ej. 'Pasaporte') se sigue mostrando.
 */
export function CampoDocumento({
  tipoDocumento = '', documento = '',
  onChangeTipo, onChangeNumero,
  size = 'small',
  labelTipo = 'Tipo documento',
  labelNumero = 'Número documento',
  required = false,
  aplicaA = 'persona',
  sugerirDv = true,
  // Validación opcional (useValidacion): props({ error, helperText, onBlur }) por campo
  validacionTipo, validacionNumero,
}) {
  // Id único por instancia: enlaza la etiqueta con el select (nombre accesible del combobox)
  const uid = useId();
  const opciones = opcionConValorActual(opcionesTipoDocumento(aplicaA), tipoDocumento);

  const numero = String(documento ?? '').trim();
  const dv = sugerirDv && normalizarTipoDocumento(tipoDocumento) === 'NIT' && /^\d{6,10}$/.test(numero)
    ? calcularDvNit(numero) : null;
  const ayudaDv = dv !== null ? `Dígito de verificación: ${dv} (${numero}-${dv})` : undefined;
  const helperNumero = validacionNumero?.helperText || ayudaDv;

  return (
    <Grid container spacing={2}>
      {/* En celular cada campo ocupa todo el ancho (juntos quedaban apretados) */}
      <Grid size={{ xs: 12, sm: 5 }}>
        <FormControl fullWidth size={size} error={!!validacionTipo?.error} required={required}>
          <InputLabel id={`${uid}-tipo-documento-label`}>{labelTipo}</InputLabel>
          <Select labelId={`${uid}-tipo-documento-label`} value={tipoDocumento} label={labelTipo} onBlur={validacionTipo?.onBlur}
            renderValue={v => v}
            onChange={e => onChangeTipo(e.target.value)}>
            <MenuItem value=""><em>—</em></MenuItem>
            {opciones.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
          {validacionTipo?.helperText && <FormHelperText>{validacionTipo.helperText}</FormHelperText>}
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12, sm: 7 }}>
        <TextField fullWidth size={size} required={required}
          label={labelNumero}
          value={documento}
          onChange={e => onChangeNumero(e.target.value)}
          {...validacionNumero}
          helperText={helperNumero}
          slotProps={{ htmlInput: { inputMode: tecladoDocumento(tipoDocumento), autoComplete: 'off' } }}
        />
      </Grid>
    </Grid>
  );
}

// ── CampoTelefono ─────────────────────────────────────────────────────────────
/**
 * Teléfono con teclado de marcación (inputMode="tel") y autocompletado del navegador.
 * Descarta letras y símbolos al escribir (deja dígitos, espacios, guiones, paréntesis y '+' inicial).
 *   <CampoTelefono value={form.telefono} onChange={t => set('telefono', t)} {...v.props('telefono')} />
 *   <CampoTelefono label="Celular del acudiente *" autoComplete="off" … />   // teléfono de OTRA persona
 * Props: value, onChange(texto), label = 'Teléfono', autoComplete = 'tel', size = 'small',
 *        fullWidth = true y cualquier prop de TextField.
 */
export function CampoTelefono({
  value = '', onChange, label = 'Teléfono', autoComplete = 'tel',
  size = 'small', fullWidth = true, slotProps, ...rest
}) {
  return (
    <TextField
      {...rest}
      label={label}
      size={size}
      fullWidth={fullWidth}
      type="tel"
      value={value ?? ''}
      onChange={e => onChange?.(limpiarTelefono(e.target.value))}
      slotProps={{
        ...slotProps,
        htmlInput: { inputMode: 'tel', autoComplete, maxLength: 20, ...slotProps?.htmlInput },
      }}
    />
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
// Lista con el valor actual incluido (datos viejos que no están en el catálogo se siguen viendo).
const conValorActual = (lista, valor) => (valor && !lista.includes(valor) ? [valor, ...lista] : lista);

/**
 * Cascada país / departamento / ciudad sobre useGeografia (lista DANE).
 *   <SelectorUbicacion pais={form.pais} departamento={form.departamento} ciudad={form.ciudad}
 *     onChange={set} />                       // set(campo, valor), campo: 'pais'|'departamento'|'ciudad'
 * - País: lista cerrada. Al ELEGIR otro país se limpian departamento y ciudad.
 * - Colombia (o país vacío): departamento y municipio en lista cerrada; al ELEGIR otro
 *   departamento se limpia la ciudad. La ciudad se habilita al elegir el departamento.
 * - Otro país: departamento/estado y ciudad son texto libre (con sugerencias de estados).
 * - Escribir NO borra nada: los dependientes solo se limpian al elegir.
 * Props opcionales: mostrarPais = true, mostrarDepartamento = true, size = 'small', disabled,
 *   validacion = { pais, departamento, ciudad } con v.props(campo) de useValidacion.
 */
export function SelectorUbicacion({
  pais = '', departamento = '', ciudad = '',
  onChange,
  size = 'small',
  mostrarPais = true,
  mostrarDepartamento = true,
  disabled = false,
  validacion = {},
}) {
  const { esColombia, departamentos, ciudades } = useGeografia(pais || 'Colombia', departamento);

  const elegirPais = v => {
    const nuevo = v ?? '';
    if (nuevo === pais) return;
    onChange('pais', nuevo);
    onChange('departamento', '');
    onChange('ciudad', '');
  };
  const elegirDepartamento = v => {
    const nuevo = v ?? '';
    if (nuevo === departamento) return;
    onChange('departamento', nuevo);
    onChange('ciudad', '');
  };

  const verDepartamento = mostrarDepartamento;
  const colCiudad = 12 - (mostrarPais ? 4 : 0) - (verDepartamento ? 4 : 0);
  const anchoCiudad = mostrarPais || verDepartamento ? Math.max(colCiudad, 4) : 12;

  const ciudadesColombia = conValorActual(verDepartamento ? ciudades : CIUDADES_COLOMBIA, ciudad);
  const esperaDepartamento = esColombia && verDepartamento && !departamento;

  return (
    <Grid container spacing={2}>
      {mostrarPais && (
        <Grid size={{ xs: 12, sm: 4 }}>
          <Autocomplete
            options={conValorActual(PAISES, pais)}
            value={pais || null}
            disabled={disabled}
            onChange={(_, v) => elegirPais(v)}
            noOptionsText="No hay un país con ese nombre"
            renderInput={p => <TextField {...p} size={size} label="País" {...validacion.pais} />}
          />
        </Grid>
      )}
      {verDepartamento && (
        <Grid size={{ xs: 12, sm: mostrarPais ? 4 : 6 }}>
          {esColombia ? (
            <Autocomplete
              key="departamento-colombia"
              options={conValorActual(departamentos, departamento)}
              value={departamento || null}
              disabled={disabled}
              onChange={(_, v) => elegirDepartamento(v)}
              noOptionsText="No hay un departamento con ese nombre"
              renderInput={p => <TextField {...p} size={size} label="Departamento" {...validacion.departamento} />}
            />
          ) : (
            <Autocomplete
              key="departamento-libre"
              freeSolo
              options={departamentos}
              value={departamento || null}
              inputValue={departamento}
              disabled={disabled}
              onChange={(_, v) => elegirDepartamento(v)}
              onInputChange={(_, v, reason) => { if (reason === 'input') onChange('departamento', v); }}
              renderInput={p => <TextField {...p} size={size} label="Departamento / Estado" {...validacion.departamento} />}
            />
          )}
        </Grid>
      )}
      <Grid size={{ xs: 12, sm: anchoCiudad }}>
        {esColombia ? (
          <Autocomplete
            options={ciudadesColombia}
            value={ciudad || null}
            disabled={disabled || (esperaDepartamento && !ciudad)}
            onChange={(_, v) => onChange('ciudad', v ?? '')}
            noOptionsText="No hay un municipio con ese nombre en este departamento"
            renderInput={p => (
              <TextField {...p} size={size} label="Ciudad / Municipio"
                {...validacion.ciudad}
                helperText={validacion.ciudad?.helperText || (esperaDepartamento ? 'Elige primero el departamento' : undefined)} />
            )}
          />
        ) : (
          <TextField fullWidth size={size} label="Ciudad" value={ciudad} disabled={disabled}
            onChange={e => onChange('ciudad', e.target.value)} {...validacion.ciudad} />
        )}
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
        <TextField slotProps={{ input: { endAdornment: <InputAdornment position="end">kg</InputAdornment> }, htmlInput: { min: 0, max: 500, step: 0.1 } }} fullWidth size={size} label={labelPeso} type="number"
          value={peso}
          onChange={e => onChangePeso(e.target.value)}
        />
      </Grid>
      <Grid size={6}>
        <TextField slotProps={{ input: { endAdornment: <InputAdornment position="end">cm</InputAdornment> }, htmlInput: { min: 0, max: 300 } }} fullWidth size={size} label={labelTalla} type="number"
          value={talla}
          onChange={e => onChangeTalla(e.target.value)}
        />
      </Grid>
    </Grid>
  );
}
