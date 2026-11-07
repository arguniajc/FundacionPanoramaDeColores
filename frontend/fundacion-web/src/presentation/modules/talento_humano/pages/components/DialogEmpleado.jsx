import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Autocomplete,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import apiClient from '@/infrastructure/http/apiClient';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import ResumenErrores from '@/shared/components/ResumenErrores';

const TIPOS_DOCUMENTO = ['CC','TI','CE','Pasaporte','NIT','Otro'];
const TIPOS_CONTRATO  = ['indefinido','fijo','prestacion_servicios','aprendizaje','voluntario','otro'];
const AREAS           = ['Administración','Coordinación','Educación','Trabajo Social','Salud','Comunicaciones','Sistemas','Contabilidad','Otro'];

export const CARGOS_COMUNES = [
  // Junta directiva
  'Presidente de Junta Directiva', 'Vicepresidente de Junta Directiva',
  'Secretario(a) de Junta Directiva', 'Tesorero(a) de Junta Directiva',
  'Fiscal', 'Revisor(a) Fiscal', 'Vocal de Junta Directiva',
  // Alta dirección
  'Presidente', 'Vicepresidente', 'Representante Legal', 'Secretario(a) General', 'Tesorero(a)',
  'Director Ejecutivo', 'Director General', 'Director Administrativo', 'Director Financiero',
  'Director de Operaciones', 'Director Comercial', 'Director de Talento Humano',
  'Director de Comunicaciones', 'Director de Sistemas', 'Director de Proyectos',
  'Gerente General', 'Subgerente', 'Gerente Administrativo', 'Gerente Financiero',
  // Coordinación
  'Coordinador General', 'Coordinador Administrativo', 'Coordinador Financiero',
  'Coordinador de Proyectos', 'Coordinador Pedagógico', 'Coordinador de Comunicaciones',
  'Coordinador de Voluntariado', 'Coordinador de Bienestar',
  // Jefaturas y profesionales
  'Jefe de Recursos Humanos', 'Jefe de Contabilidad', 'Jefe de Sistemas',
  'Contador', 'Auxiliar Contable', 'Asistente Administrativo', 'Asistente de Gerencia',
  'Profesional de Talento Humano', 'Trabajador Social', 'Psicólogo(a)',
  // Docencia y formación
  'Docente', 'Instructor(a)', 'Tallerista', 'Tutor(a)', 'Monitor(a)', 'Facilitador(a)',
  // Operativos
  'Auxiliar Administrativo', 'Recepcionista', 'Secretaria', 'Técnico de Sistemas',
  'Almacenista', 'Mensajero', 'Conductor', 'Vigilante', 'Servicios Generales',
  // Social y comunitario
  'Gestor(a) Social', 'Promotor(a) Comunitario', 'Líder Comunitario',
  // Voluntariado
  'Voluntario(a)', 'Líder Voluntario(a)', 'Practicante', 'Pasante',
];

// Reglas del formulario: cada una dice qué está mal y cómo llenarlo
const ESQUEMA = {
  nombres:          { etiqueta: 'Nombres',            reglas: [r.obligatorio('María José'), r.texto({ min: 2, max: 100, soloLetras: true, ejemplo: 'María José' })] },
  apellidos:        { etiqueta: 'Apellidos',          reglas: [r.obligatorio('Rodríguez Pérez'), r.texto({ min: 2, max: 100, soloLetras: true, ejemplo: 'Rodríguez Pérez' })] },
  numeroDocumento:  { etiqueta: 'Número documento',   reglas: [r.documentoSegunTipo('tipoDocumento')] },
  email:            { etiqueta: 'Email',              reglas: [r.correo('maria.rodriguez@correo.com')] },
  telefono:         { etiqueta: 'Teléfono',           reglas: [r.telefono()] },
  celular:          { etiqueta: 'Celular',            reglas: [r.celular()] },
  fechaIngreso:     { etiqueta: 'Fecha ingreso',      reglas: [r.fecha({ ejemplo: '2025-02-01' })] },
  fechaFinContrato: { etiqueta: 'Fecha fin contrato', reglas: [r.fecha({ ejemplo: '2025-12-31' }), r.fechaDesde('fechaIngreso', 'la fecha de ingreso')] },
  salario:          { etiqueta: 'Salario (COP)',      reglas: [r.monto('1423500')] },
};

export const EMPLEADO_VACIO = {
  nombres:'', apellidos:'', tipoDocumento:'CC', numeroDocumento:'',
  email:'', telefono:'', celular:'', cargo:'', area:'',
  sedeId:'', tipoContrato:'indefinido',
  fechaIngreso:'', fechaFinContrato:'', salario:'',
  eps:'', pension:'', activo: true, notas:'',
};

export function DialogEmpleado({ open, onClose, empleado, sedes, onSaved }) {
  const [form, setForm]     = useState(EMPLEADO_VACIO);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const v = useValidacion(ESQUEMA, form);
  const { reiniciar } = v;

  useEffect(() => {
    if (empleado) {
      setForm({
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
        salario:          empleado.salario ?? '',
        eps:              empleado.eps ?? '',
        pension:          empleado.pension ?? '',
        activo:           empleado.activo ?? true,
        notas:            empleado.notas ?? '',
      });
    } else {
      setForm(EMPLEADO_VACIO);
    }
    setError('');
    reiniciar();
  }, [empleado, open, reiniciar]);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const guardar = async () => {
    if (!v.validarTodo()) return;
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        sedeId:          form.sedeId    || null,
        salario:         form.salario   ? Number(form.salario) : null,
        fechaIngreso:    form.fechaIngreso    || null,
        fechaFinContrato:form.fechaFinContrato || null,
        tipoDocumento:   form.tipoDocumento || null,
        numeroDocumento: form.numeroDocumento || null,
        email:           form.email    || null,
        telefono:        form.telefono || null,
        celular:         form.celular  || null,
        cargo:           form.cargo    || null,
        area:            form.area     || null,
        tipoContrato:    form.tipoContrato || null,
        eps:             form.eps      || null,
        pension:         form.pension  || null,
        notas:           form.notas    || null,
      };
      if (empleado) {
        await apiClient.put(`/api/talento-humano/${empleado.id}`, payload);
      } else {
        await apiClient.post('/api/talento-humano', payload);
      }
      onSaved();
    } catch (e) {
      setError(mensajeErrorApi(e, { accion: empleado ? 'actualizar el empleado' : 'registrar el empleado' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle fontWeight={700}>{empleado ? 'Editar empleado' : 'Nuevo empleado'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* Datos personales */}
          <Grid size={12}><Typography variant="subtitle2" fontWeight={700} color="text.secondary">Datos personales</Typography></Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Nombres *" value={form.nombres} onChange={set('nombres')} size="small" {...v.props('nombres')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Apellidos *" value={form.apellidos} onChange={set('apellidos')} size="small" {...v.props('apellidos')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth label="Tipo documento" value={form.tipoDocumento} onChange={set('tipoDocumento')} size="small">
              {TIPOS_DOCUMENTO.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Número documento" value={form.numeroDocumento} onChange={set('numeroDocumento')} size="small" {...v.props('numeroDocumento')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Email" value={form.email} onChange={set('email')} size="small" type="email" {...v.props('email')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Teléfono" value={form.telefono} onChange={set('telefono')} size="small" {...v.props('telefono')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Celular" value={form.celular} onChange={set('celular')} size="small" {...v.props('celular')} />
          </Grid>

          {/* Cargo y sede */}
          <Grid size={12}><Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mt: 1 }}>Cargo y ubicación</Typography></Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Autocomplete
              freeSolo
              options={CARGOS_COMUNES}
              value={form.cargo}
              onChange={(_, v) => setForm(p => ({ ...p, cargo: v || '' }))}
              onInputChange={(_, v) => setForm(p => ({ ...p, cargo: v }))}
              renderInput={(params) => (
                <TextField {...params} fullWidth label="Cargo" size="small"
                  placeholder="Ej: Director, Coordinador, Voluntario..." />
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
          <Grid size={12}><Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mt: 1 }}>Contrato</Typography></Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth label="Tipo contrato" value={form.tipoContrato} onChange={set('tipoContrato')} size="small">
              {TIPOS_CONTRATO.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g,' ')}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Fecha ingreso" value={form.fechaIngreso} onChange={set('fechaIngreso')} size="small" type="date" InputLabelProps={{ shrink: true }} {...v.props('fechaIngreso')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Fecha fin contrato" value={form.fechaFinContrato} onChange={set('fechaFinContrato')} size="small" type="date" InputLabelProps={{ shrink: true }} {...v.props('fechaFinContrato')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Salario (COP)" value={form.salario} onChange={set('salario')} size="small" type="number" {...v.props('salario')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="EPS" value={form.eps} onChange={set('eps')} size="small" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Pensión" value={form.pension} onChange={set('pension')} size="small" />
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
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mx: 3, mt: 1.5, mb: 0 }}>
          {error}
        </Alert>
      )}
      <ResumenErrores {...v.resumen} accion={empleado ? 'actualizar el empleado' : 'registrar el empleado'} />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={guardar} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
