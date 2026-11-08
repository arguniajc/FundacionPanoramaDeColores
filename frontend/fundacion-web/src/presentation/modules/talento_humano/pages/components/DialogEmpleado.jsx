import { useState, useEffect, useRef } from 'react';
import {
  Typography, Button, TextField, MenuItem, Grid,
  DialogTitle, DialogContent, Alert, Autocomplete,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import apiClient from '@/infrastructure/http/apiClient';
import { talentoHumanoRepository } from '@/infrastructure/repositories/talentoHumanoRepository';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import { useCerrarConCambios, hayCambiosEn } from '@/shared/hooks/useCerrarConCambios';
import { useAutoFocus } from '@/shared/hooks/useAutoFocus';
import ResumenErrores from '@/shared/components/ResumenErrores';
import {
  CampoDocumento, CampoTelefono, CampoMoneda, AccionesDialogo, ErrorServidor,
} from '@/shared/components/form/FormControles';
import { normalizarTipoDocumento } from '@/shared/constants/tiposDocumento';
import { EPS_LIST } from '@/shared/constants/beneficiarios';
import { CARGOS_COMUNES } from './cargos';
import { FONDOS_PENSION, TIPOS_CONTRATO, tieneFechaFin } from './contratos';

const AREAS = ['Administración','Coordinación','Educación','Trabajo Social','Salud','Comunicaciones','Sistemas','Contabilidad','Otro'];

// Reglas del formulario: cada una dice qué está mal y cómo llenarlo
const ESQUEMA = {
  nombres:          { etiqueta: 'Nombres',            reglas: [r.obligatorio('María José'), r.texto({ min: 2, max: 100, soloLetras: true, ejemplo: 'María José' })] },
  apellidos:        { etiqueta: 'Apellidos',          reglas: [r.obligatorio('Rodríguez Pérez'), r.texto({ min: 2, max: 100, soloLetras: true, ejemplo: 'Rodríguez Pérez' })] },
  numeroDocumento:  { etiqueta: 'Número documento',   reglas: [r.documentoSegunTipo('tipoDocumento')] },
  email:            { etiqueta: 'Email',              reglas: [r.correo('maria.rodriguez@correo.com'), r.texto({ max: 150 })] },
  telefono:         { etiqueta: 'Teléfono',           reglas: [r.telefono()] },
  celular:          { etiqueta: 'Celular',            reglas: [r.celular()] },
  cargo:            { etiqueta: 'Cargo',              reglas: [r.texto({ max: 100 })] },
  area:             { etiqueta: 'Área',               reglas: [r.texto({ max: 100 })] },
  fechaIngreso:     { etiqueta: 'Fecha ingreso',      reglas: [r.fecha({ ejemplo: '2025-02-01' })] },
  // Solo la piden los contratos con terminación (fijo, aprendizaje, prestación de servicios)
  fechaFinContrato: { etiqueta: 'Fecha fin contrato', reglas: [
    r.si(f => tieneFechaFin(f.tipoContrato), r.fecha({ ejemplo: '2025-12-31' })),
    r.si(f => tieneFechaFin(f.tipoContrato), r.fechaDesde('fechaIngreso', 'la fecha de ingreso')),
  ] },
  salario:          { etiqueta: 'Salario (COP)',      reglas: [r.monto('1423500')] },
  eps:              { etiqueta: 'EPS',                reglas: [r.texto({ max: 100 })] },
  pension:          { etiqueta: 'Fondo de pensión',   reglas: [r.texto({ max: 100 })] },
};

const EMPLEADO_VACIO = {
  nombres:'', apellidos:'', tipoDocumento:'CC', numeroDocumento:'',
  email:'', telefono:'', celular:'', cargo:'', area:'',
  sedeId:'', tipoContrato:'indefinido',
  fechaIngreso:'', fechaFinContrato:'', salario:'',
  eps:'', pension:'', activo: true, notas:'',
};

const desdeEmpleado = empleado => (empleado ? {
  nombres:          empleado.nombres ?? '',
  apellidos:        empleado.apellidos ?? '',
  tipoDocumento:    empleado.tipoDocumento ?? 'CC',
  numeroDocumento:  empleado.numeroDocumento ?? '',
  email:            empleado.email ?? '',
  telefono:         empleado.telefono ?? '',
  celular:          empleado.celular ?? '',
  cargo:            empleado.cargo ?? '',
  area:             empleado.area ?? '',
  sedeId:           empleado.sedeId ?? '',
  tipoContrato:     empleado.tipoContrato ?? 'indefinido',
  fechaIngreso:     empleado.fechaIngreso ?? '',
  fechaFinContrato: empleado.fechaFinContrato ?? '',
  // Texto: CampoMoneda entrega el valor limpio como string y así form y snapshot se comparan igual
  salario:          empleado.salario === null || empleado.salario === undefined ? '' : String(empleado.salario),
  eps:              empleado.eps ?? '',
  pension:          empleado.pension ?? '',
  activo:           empleado.activo ?? true,
  notas:            empleado.notas ?? '',
} : EMPLEADO_VACIO);

/**
 * Crear / editar empleado. `onSaved(editando)` tras guardar; `onVerExistente({ id, nombre })`
 * abre el empleado que ya tiene el documento escrito (se llama después de cerrar este diálogo).
 */
export function DialogEmpleado({ open, onClose, empleado, sedes, onSaved, onVerExistente }) {
  const [form, setForm]         = useState(EMPLEADO_VACIO);
  const [inicial, setInicial]   = useState(EMPLEADO_VACIO);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [repetido, setRepetido] = useState(null);   // { numero, id, nombre }
  const consulta = useRef(0);
  const v = useValidacion(ESQUEMA, form);
  const { reiniciar } = v;
  const autoFocus = useAutoFocus();

  const hayCambios = open && hayCambiosEn(form, inicial);
  const { confirmarCierre } = useCerrarConCambios({ hayCambios, bloqueado: saving, onCerrar: onClose });

  useEffect(() => {
    if (!open) return;
    const datos = desdeEmpleado(empleado);
    setForm(datos);
    setInicial(datos);
    setError('');
    setRepetido(null);
    reiniciar();
  }, [empleado, open, reiniciar]);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const setValor = (k, valor) => setForm(p => ({ ...p, [k]: valor }));
  const conFin = tieneFechaFin(form.tipoContrato);

  // Al salir del número: ¿otro empleado ya tiene ese documento?
  const verificarDocumento = async () => {
    v.tocar('numeroDocumento');
    const numero = form.numeroDocumento.trim();
    if (!numero || v.errores.numeroDocumento) { setRepetido(null); return; }
    const n = ++consulta.current;
    try {
      const { data } = await talentoHumanoRepository.verificarDocumento({ numero, excluirId: empleado?.id ?? null });
      if (n !== consulta.current) return;
      setRepetido(data?.existe ? { numero, id: data.id, nombre: data.nombre } : null);
    } catch { /* opcional: si no se puede verificar, se guarda igual */ }
  };
  const avisoRepetido = repetido && repetido.numero === form.numeroDocumento.trim() ? repetido : null;

  const verExistente = async () => {
    const existente = avisoRepetido;
    if (await confirmarCierre()) onVerExistente?.(existente);
  };

  const guardar = async () => {
    if (saving || !v.validarTodo()) return;
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        sedeId:          form.sedeId    || null,
        salario:         form.salario   ? Number(form.salario) : null,
        fechaIngreso:    form.fechaIngreso    || null,
        fechaFinContrato:conFin ? (form.fechaFinContrato || null) : null,
        tipoDocumento:   normalizarTipoDocumento(form.tipoDocumento) || null,
        numeroDocumento: form.numeroDocumento || null,
        email:           form.email    || null,
        telefono:        form.telefono || null,
        celular:         form.celular  || null,
        cargo:           form.cargo    || null,
        area:            form.area     || null,
        tipoContrato:    form.tipoContrato || null,
        eps:             form.eps.trim()     || null,
        pension:         form.pension.trim() || null,
        notas:           form.notas    || null,
      };
      if (empleado) {
        await apiClient.put(`/api/talento-humano/${empleado.id}`, payload);
      } else {
        await apiClient.post('/api/talento-humano', payload);
      }
      onSaved(!!empleado);
    } catch (e) {
      setError(mensajeErrorApi(e, { accion: empleado ? 'actualizar el empleado' : 'registrar el empleado' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={confirmarCierre} alEnviar={guardar} maxWidth="md" fullWidth>
      <DialogTitle fontWeight={700}>{empleado ? 'Editar empleado' : 'Nuevo empleado'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* Datos personales */}
          <Grid size={12}><Typography sx={{ fontWeight: 700, color: 'text.secondary' }} variant="subtitle2">Datos personales</Typography></Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Nombres *" value={form.nombres} onChange={set('nombres')} size="small" autoFocus={autoFocus}
              slotProps={{ htmlInput: { autoComplete: 'given-name' } }} {...v.props('nombres')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Apellidos *" value={form.apellidos} onChange={set('apellidos')} size="small"
              slotProps={{ htmlInput: { autoComplete: 'family-name' } }} {...v.props('apellidos')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <CampoDocumento
              tipoDocumento={form.tipoDocumento} documento={form.numeroDocumento}
              onChangeTipo={t => setValor('tipoDocumento', t)}
              onChangeNumero={n => setValor('numeroDocumento', n)}
              validacionNumero={{ ...v.props('numeroDocumento'), onBlur: verificarDocumento }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Email" value={form.email} onChange={set('email')} size="small" type="email"
              slotProps={{ htmlInput: { autoComplete: 'email', inputMode: 'email' } }} {...v.props('email')} />
          </Grid>
          {avisoRepetido && (
            <Grid size={12}>
              <Alert severity="warning"
                action={onVerExistente && (
                  <Button color="inherit" size="small" onClick={verExistente} sx={{ fontWeight: 700 }}>Abrir</Button>
                )}>
                Ya hay un empleado con el documento {avisoRepetido.numero}: <strong>{avisoRepetido.nombre}</strong>.
                Revisa que no lo estés registrando dos veces.
              </Alert>
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 6 }}>
            <CampoTelefono label="Teléfono" value={form.telefono} onChange={t => setValor('telefono', t)} {...v.props('telefono')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CampoTelefono label="Celular" value={form.celular} onChange={t => setValor('celular', t)}
              autoComplete="tel-national" {...v.props('celular')} />
          </Grid>

          {/* Cargo y sede */}
          <Grid size={12}><Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', mt: 1 }}>Cargo y ubicación</Typography></Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Autocomplete
              freeSolo
              options={CARGOS_COMUNES}
              value={form.cargo}
              onChange={(_, valor) => setValor('cargo', valor || '')}
              onInputChange={(_, valor) => setValor('cargo', valor)}
              renderInput={(params) => (
                <TextField {...params} fullWidth label="Cargo" size="small"
                  placeholder="Ej: Director, Coordinador, Voluntario..." {...v.props('cargo')} />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Área" value={form.area} onChange={set('area')} size="small">
              <MenuItem value="">— Sin área —</MenuItem>
              {AREAS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Sede" value={form.sedeId} onChange={set('sedeId')} size="small">
              <MenuItem value="">— Sin sede —</MenuItem>
              {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
            </TextField>
          </Grid>

          {/* Contrato */}
          <Grid size={12}><Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', mt: 1 }}>Contrato</Typography></Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth label="Tipo contrato" value={form.tipoContrato} onChange={set('tipoContrato')} size="small">
              {TIPOS_CONTRATO.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g,' ')}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Fecha ingreso" value={form.fechaIngreso} onChange={set('fechaIngreso')} size="small" type="date" slotProps={{ inputLabel: { shrink: true } }} {...v.props('fechaIngreso')} />
          </Grid>
          {conFin && (
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Fecha fin contrato" value={form.fechaFinContrato} onChange={set('fechaFinContrato')} size="small" type="date" slotProps={{ inputLabel: { shrink: true } }} {...v.props('fechaFinContrato')} />
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 4 }}>
            <CampoMoneda label="Salario (COP)" value={form.salario} onChange={m => setValor('salario', m)}
              {...v.props('salario', 'Ejemplo: 1.423.500')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Autocomplete
              freeSolo
              options={EPS_LIST}
              value={form.eps || null}
              onChange={(_, valor) => setValor('eps', valor ?? '')}
              onInputChange={(_, valor, reason) => { if (reason === 'input' || reason === 'clear') setValor('eps', valor); }}
              renderInput={(params) => (
                <TextField {...params} fullWidth label="EPS" size="small" placeholder="Ej: Nueva EPS" {...v.props('eps')} />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Autocomplete
              freeSolo
              options={FONDOS_PENSION}
              value={form.pension || null}
              onChange={(_, valor) => setValor('pension', valor ?? '')}
              onInputChange={(_, valor, reason) => { if (reason === 'input' || reason === 'clear') setValor('pension', valor); }}
              renderInput={(params) => (
                <TextField {...params} fullWidth label="Fondo de pensión" size="small" placeholder="Ej: Colpensiones" {...v.props('pension')} />
              )}
            />
          </Grid>

          {/* Estado y notas */}
          {empleado && (
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField select fullWidth label="Estado" value={form.activo} onChange={e => setForm(p => ({ ...p, activo: e.target.value === 'true' }))} size="small">
                <MenuItem value="true">Activo</MenuItem>
                <MenuItem value="false">Inactivo</MenuItem>
              </TextField>
            </Grid>
          )}
          <Grid size={12}>
            <TextField fullWidth label="Notas" value={form.notas} onChange={set('notas')} size="small" multiline rows={2} />
          </Grid>
        </Grid>
      </DialogContent>
      <ResumenErrores {...v.resumen} accion={empleado ? 'actualizar el empleado' : 'registrar el empleado'} />
      <ErrorServidor mensaje={error} onClose={() => setError('')} />
      <AccionesDialogo onCancelar={confirmarCierre} guardando={saving} enviar
        textoGuardar={empleado ? 'Guardar' : 'Crear empleado'} />
    </Dialog>
  );
}
