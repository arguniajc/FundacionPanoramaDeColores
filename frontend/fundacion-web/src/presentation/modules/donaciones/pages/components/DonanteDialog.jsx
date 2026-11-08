import { useState, useEffect, useRef } from 'react';
import {
  Alert, Button, DialogContent, DialogTitle, Grid, MenuItem, TextField,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import { donantesRepository } from '@/infrastructure/repositories/donantesRepository';
import {
  AccionesDialogo, CampoDocumento, CampoTelefono, ErrorServidor, SelectorUbicacion,
} from '@/shared/components/form/FormControles';
import { normalizarTipoDocumento } from '@/shared/constants/tiposDocumento';
import { COLOR_DONANTES } from './helpers';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import { useCerrarConCambios, hayCambiosEn } from '@/shared/hooks/useCerrarConCambios';
import { useAutoFocus } from '@/shared/hooks/useAutoFocus';
import ResumenErrores from '@/shared/components/ResumenErrores';

// Reglas del formulario: cada una dice qué está mal y cómo llenarlo
const ESQUEMA = {
  nombre:    { etiqueta: 'Nombre',          reglas: [r.obligatorio('Fundación Éxito o Ana Gómez'), r.texto({ min: 3, max: 200 })] },
  documento: { etiqueta: 'Documento / NIT', reglas: [r.documentoSegunTipo('tipoDocumento')] },
  email:     { etiqueta: 'Email',           reglas: [r.correo()] },
  telefono:  { etiqueta: 'Teléfono',        reglas: [r.telefono()] },
};

// Tipo de documento por defecto según el tipo de donante (persona → CC, empresa → NIT)
const DOC_POR_TIPO = { persona: 'CC', empresa: 'NIT' };

const VACIO = { nombre: '', tipo: 'persona', tipoDocumento: 'CC', documento: '', email: '', telefono: '', pais: 'Colombia', departamento: '', ciudad: '', notas: '' };

/**
 * Crear / editar donante.
 * - nombreInicial: nombre precargado al crear (creación rápida desde "Nueva donación").
 * - onVerExistente({ id, nombre }): si se pasa, el aviso de documento repetido ofrece
 *   "Ver donante existente" (el diálogo se cierra antes, preguntando si hay cambios).
 *   textoVerExistente cambia el texto del botón (p. ej. 'Usar donante existente').
 */
export function DonanteDialog({ open, donante, nombreInicial = '', onClose, onGuardado, onVerExistente, textoVerExistente = 'Ver donante existente' }) {
  const editando = !!donante;
  const [form,      setForm]      = useState(VACIO);
  const [inicial,   setInicial]   = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');
  // Donante que ya tiene el documento escrito: { numero, id, nombre } (null si nadie)
  const [repetido,  setRepetido]  = useState(null);
  const consulta = useRef(0);
  const autoFocus = useAutoFocus();
  const v = useValidacion(ESQUEMA, form);
  const { reiniciar } = v;

  useEffect(() => {
    if (open) {
      const datos = donante
        ? { nombre: donante.nombre, tipo: donante.tipo,
            tipoDocumento: donante.tipoDocumento ?? '', documento: donante.documento ?? '',
            email: donante.email ?? '', telefono: donante.telefono ?? '',
            pais: donante.pais ?? 'Colombia', departamento: donante.departamento ?? '',
            ciudad: donante.ciudad ?? '', notas: donante.notas ?? '' }
        : { ...VACIO, nombre: nombreInicial };
      setForm(datos);
      setInicial(datos);
      setError('');
      setRepetido(null);
      reiniciar();
    }
  }, [open, donante, nombreInicial, reiniciar]);

  const { confirmarCierre } = useCerrarConCambios({
    hayCambios: hayCambiosEn(form, inicial), bloqueado: guardando, onCerrar: onClose,
  });

  const set = (k, val) => setForm(p => ({ ...p, [k]: val }));

  // Al cambiar persona ↔ empresa se propone el tipo de documento habitual,
  // solo si el actual está vacío o era el de por defecto del otro tipo.
  const setTipo = tipo => setForm(p => {
    const actual = normalizarTipoDocumento(p.tipoDocumento);
    const esDefecto = !actual || Object.values(DOC_POR_TIPO).includes(actual);
    return { ...p, tipo, tipoDocumento: esDefecto ? DOC_POR_TIPO[tipo] : p.tipoDocumento };
  });

  // Al salir del número: ¿otro donante ya tiene ese documento?
  const verificarDocumento = async () => {
    v.tocar('documento');
    const numero = form.documento.trim();
    if (!numero || v.errores.documento) { setRepetido(null); return; }
    const n = ++consulta.current;
    try {
      const { data } = await donantesRepository.verificarDocumento({
        tipo: form.tipoDocumento || null, numero, excluirId: donante?.id ?? null,
      });
      if (n !== consulta.current) return;
      setRepetido(data?.existe ? { numero, id: data.id, nombre: data.nombre } : null);
    } catch { /* opcional: si no se puede verificar, el servidor avisa al guardar */ }
  };
  const avisoRepetido = repetido && repetido.numero === form.documento.trim() ? repetido : null;

  const verExistente = async () => {
    const existente = avisoRepetido;
    if (await confirmarCierre()) onVerExistente?.(existente);
  };

  const guardar = async () => {
    if (guardando || !v.validarTodo()) return;
    setGuardando(true); setError('');
    try {
      // Sin número no se guarda un tipo de documento suelto (el formulario propone CC/NIT por defecto)
      const datos = { ...form, nombre: form.nombre.trim(), tipoDocumento: form.documento.trim() ? form.tipoDocumento : '' };
      const { data } = editando
        ? await donantesRepository.editar(donante.id, datos)
        : await donantesRepository.crear(datos);
      onGuardado(data, editando);
    } catch (e) {
      setError(mensajeErrorApi(e, { accion: 'guardar el donante', conflicto: 'Ya existe un donante con ese documento.' }));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onClose={confirmarCierre} maxWidth="sm" fullWidth
      bloqueado={guardando} alEnviar={guardar}>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR_DONANTES }}>
        {editando ? 'Editar donante' : 'Nuevo donante'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField fullWidth size="small" label="Nombre *" value={form.nombre} autoFocus={autoFocus}
              onChange={e => set('nombre', e.target.value)} {...v.props('nombre')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth size="small" label="Tipo"
              value={form.tipo} onChange={e => setTipo(e.target.value)}>
              <MenuItem value="persona">Persona</MenuItem>
              <MenuItem value="empresa">Empresa</MenuItem>
            </TextField>
          </Grid>
          <Grid size={12}>
            <CampoDocumento
              tipoDocumento={form.tipoDocumento}
              documento={form.documento}
              onChangeTipo={t => set('tipoDocumento', t)}
              onChangeNumero={n => set('documento', n)}
              labelNumero="Documento / NIT"
              aplicaA={form.tipo === 'empresa' ? 'empresa' : 'persona'}
              validacionNumero={{ ...v.props('documento'), onBlur: verificarDocumento }}
            />
            {avisoRepetido && (
              <Alert severity="warning" sx={{ mt: 1 }}
                action={onVerExistente && (
                  <Button color="inherit" size="small" onClick={verExistente}>{textoVerExistente}</Button>
                )}>
                Ya existe un donante con este documento: <strong>{avisoRepetido.nombre}</strong>.
                Revisa que no lo estés registrando dos veces.
              </Alert>
            )}
          </Grid>
          <Grid size={12}>
            <SelectorUbicacion
              pais={form.pais} departamento={form.departamento} ciudad={form.ciudad}
              onChange={set}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Email" type="email" value={form.email}
              onChange={e => set('email', e.target.value)} {...v.props('email')}
              slotProps={{ htmlInput: { inputMode: 'email', autoComplete: 'off' } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CampoTelefono autoComplete="off" value={form.telefono}
              onChange={t => set('telefono', t)} {...v.props('telefono')} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Notas" multiline rows={2} value={form.notas}
              onChange={e => set('notas', e.target.value)} />
          </Grid>
        </Grid>
      </DialogContent>
      <ResumenErrores {...v.resumen} accion={editando ? 'guardar' : 'crear el donante'} />
      <ErrorServidor mensaje={error} onClose={() => setError('')} />
      <AccionesDialogo onCancelar={confirmarCierre} guardando={guardando} enviar
        textoGuardar={editando ? 'Guardar' : 'Crear donante'}
        sxGuardar={{ bgcolor: COLOR_DONANTES, '&:hover': { bgcolor: 'secondary.dark' } }} />
    </Dialog>
  );
}
