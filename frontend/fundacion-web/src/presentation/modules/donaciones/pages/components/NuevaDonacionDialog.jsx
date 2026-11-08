import { useState, useEffect, useCallback } from 'react';
import {
  Autocomplete, Box, Checkbox, CircularProgress, createFilterOptions, DialogContent,
  DialogTitle, FormControl, FormControlLabel, FormHelperText, Grid, InputLabel, MenuItem,
  Select, TextField, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import Dialog from '@/shared/components/DialogResponsive';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import Inventory2Icon  from '@mui/icons-material/Inventory2';
import { donantesRepository }      from '@/infrastructure/repositories/donantesRepository';
import { donacionesRepository }    from '@/infrastructure/repositories/donacionesRepository';
import { sedesRepository }         from '@/infrastructure/repositories/sedesRepository';
import { inventarioRepository }    from '@/infrastructure/repositories/inventarioRepository';
import { contabilidadRepository }  from '@/infrastructure/repositories/contabilidadRepository';
import { COLOR_DONACIONES, COLOR_ESPECIE, hoy, limpiarCantidad } from './helpers';
import { DonanteDialog } from './DonanteDialog';
import {
  AccionesDialogo, CampoMoneda, CampoUnidadMedida, ErrorServidor,
} from '@/shared/components/form/FormControles';
import { useCerrarConCambios, hayCambiosEn } from '@/shared/hooks/useCerrarConCambios';
import { useAutoFocus } from '@/shared/hooks/useAutoFocus';
import { useAuth } from '@/application/auth/useAuth';
import { notificar } from '@/shared/utils/notificar';
import { CATEGORIAS_INVENTARIO } from '@/shared/utils/geodata';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import ResumenErrores from '@/shared/components/ResumenErrores';

const enDinero  = form => form.tipo === 'dinero';
const enEspecie = form => form.tipo === 'especie';

// Reglas del formulario: cada una dice qué está mal y cómo llenarlo.
// `donante` e `itemSel` viven en estados aparte y se agregan al validar.
const ESQUEMA = {
  donante:        { etiqueta: 'Donante',        reglas: [r.seleccion('escribe "Fundación Éxito" y elige de la lista')] },
  monto:          { etiqueta: 'Monto',          reglas: [r.si(enDinero, r.obligatorio('150000')), r.si(enDinero, r.monto('150000'))] },
  cuentaContabId: { etiqueta: 'Cuenta destino', reglas: [r.si(f => enDinero(f) && f.registrarContabilidad, r.seleccion('Caja general o la cuenta bancaria'))] },
  nombreItem:     { etiqueta: 'Nombre del artículo', reglas: [
    r.si(f => enEspecie(f) && !f.itemSel, r.obligatorio('Cuadernos o Arroz en bolsa de 1 kg')),
    r.si(f => enEspecie(f) && !f.itemSel, r.texto({ min: 3, max: 150, ejemplo: 'Cuadernos' })),
  ] },
  cantidad:       { etiqueta: 'Cantidad', reglas: [
    r.si(enEspecie, r.obligatorio('20')),
    r.si(enEspecie, r.numero({ ejemplo: '20' })),
    r.si(enEspecie, r.propia(v => (v !== '' && Number(v) <= 0 ? 'La cantidad debe ser mayor que 0. Ejemplo: 20' : ''))),
  ] },
  stockMinimoInv: { etiqueta: 'Stock mínimo', reglas: [
    r.si(f => enEspecie(f) && f.ingresarInventario && !f.itemSel, r.numero({ min: 0, entero: true, ejemplo: '5' })),
  ] },
  fechaDonacion:  { etiqueta: 'Fecha', reglas: [
    r.fecha({ ejemplo: '2026-03-15' }),
    // No futura, comparada con hoy() (el mismo valor que se pone por defecto)
    r.propia(v => (v && v > hoy() ? 'La fecha no puede ser futura. Revisa el día y el año.' : '')),
  ] },
};

// Filtro normal del Autocomplete de donantes (nombre o documento) + opción "+ Crear donante «texto»"
const filtrarDonantes = createFilterOptions({ stringify: o => `${o.nombre ?? ''} ${o.documento ?? ''}` });
const aOpcionDonante = d => ({ id: d.id, nombre: d.nombre, documento: d.documento ?? null });

const VACIO = {
  tipo: 'dinero', monto: '', nombreItem: '',
  cantidad: '', unidadMedida: '', sedeId: '', programaId: '',
  descripcion: '', fechaDonacion: hoy(),
  ingresarInventario: false, categoriaInv: 'Otros', stockMinimoInv: '',
  registrarContabilidad: false, cuentaContabId: '',
};

export function NuevaDonacionDialog({ open, donanteInicial, onClose, onGuardada, sedes }) {
  const [donante,    setDonante]    = useState(null);
  const [form,       setForm]       = useState(VACIO);
  const [guardando,  setGuardando]  = useState(false);
  const [error,      setError]      = useState('');
  const [programas,  setProgramas]  = useState([]);
  const [opsDonante, setOpsDonante] = useState([]);
  const [buscandoD,  setBuscandoD]  = useState(false);
  const [opsItem,    setOpsItem]    = useState([]);
  const [buscandoI,  setBuscandoI]  = useState(false);
  const [itemSel,    setItemSel]    = useState(null);
  const [cuentas,    setCuentas]    = useState([]);
  const [catDonId,   setCatDonId]   = useState(null);
  const [inicial,    setInicial]    = useState({ form: VACIO, donante: null });
  // Creación rápida de donante: { open, nombre }
  const [nuevoDon,   setNuevoDon]   = useState({ open: false, nombre: '' });
  const { puedo } = useAuth();
  const puedeCrearDonante = puedo('donantes', 'crear');
  const autoFocus = useAutoFocus();
  const v = useValidacion(ESQUEMA, { ...form, donante, itemSel });
  const { reiniciar } = v;

  useEffect(() => {
    if (!open) return;
    const formInicial = { ...VACIO, fechaDonacion: hoy() };
    setForm(formInicial);
    setInicial({ form: formInicial, donante: donanteInicial?.id ?? null });
    setNuevoDon({ open: false, nombre: '' });
    setError('');
    reiniciar();
    setItemSel(null);
    setOpsItem([]);
    if (donanteInicial) {
      setDonante(donanteInicial);
      setOpsDonante([donanteInicial]);
    } else {
      setDonante(null);
      setOpsDonante([]);
    }
    contabilidadRepository.listarCuentas()
      .then(({ data }) => setCuentas(data.filter(c => c.activo)))
      .catch(() => { /* opcional: sin cuentas solo se omite el registro contable */ });
    contabilidadRepository.listarCategorias('ingreso')
      .then(({ data }) => {
        const cat = data.find(c => c.codigoPuc === '4120');
        if (cat) setCatDonId(cat.id);
      })
      .catch(() => { /* opcional: sin la categoría solo se omite el registro contable */ });
  }, [open, donanteInicial, reiniciar]);

  useEffect(() => {
    if (!form.sedeId) { setProgramas([]); return; }
    sedesRepository.listarProgramas(form.sedeId)
      .then(({ data }) => setProgramas(data))
      .catch(() => setProgramas([])); // opcional: el programa no es obligatorio
  }, [form.sedeId]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setSedeId = v => setForm(p => ({ ...p, sedeId: v, programaId: '' }));

  const buscarDonantes = useCallback(async (q) => {
    if (!q) return;
    setBuscandoD(true);
    try {
      const { data } = await donantesRepository.listar({ buscar: q });
      setOpsDonante(data.map(aOpcionDonante));
    } catch { /* opcional: el autocompletar vacío no bloquea el formulario */ } finally { setBuscandoD(false); }
  }, []);

  const buscarItems = useCallback(async (q) => {
    if (!q) return;
    setBuscandoI(true);
    try {
      const { data } = await inventarioRepository.listarItems({ buscar: q });
      setOpsItem(data);
    } catch { /* opcional: el artículo se puede escribir a mano */ } finally { setBuscandoI(false); }
  }, []);

  const hayCambios = hayCambiosEn(
    { form, donante: donante?.id ?? null, itemSel: itemSel?.id ?? null },
    { form: inicial.form, donante: inicial.donante, itemSel: null });
  const { confirmarCierre } = useCerrarConCambios({ hayCambios, bloqueado: guardando, onCerrar: onClose });

  // Donante recién creado con la creación rápida: queda seleccionado
  const donanteCreado = data => {
    const op = aOpcionDonante(data);
    setOpsDonante([op]);
    setDonante(op);
    setNuevoDon({ open: false, nombre: '' });
    notificar(`Donante «${data.nombre}» creado y seleccionado.`, 'success');
  };
  // Documento repetido en la creación rápida → se selecciona el donante que ya existe
  const usarExistente = ({ id, nombre }) => {
    const op = { id, nombre, documento: null };
    setOpsDonante([op]);
    setDonante(op);
    donantesRepository.obtener(id)
      .then(({ data }) => setDonante(d => (d?.id === id ? aOpcionDonante(data) : d)))
      .catch(() => { /* opcional: sin el documento solo falta el tercero en contabilidad */ });
  };

  const guardar = async () => {
    if (guardando || !v.validarTodo()) return;
    setGuardando(true); setError('');
    try {
      const { data } = await donacionesRepository.crear({
        donanteId:    donante.id,
        tipo:         form.tipo,
        monto:        form.tipo === 'dinero' ? Number(form.monto) : null,
        itemId:       itemSel?.id ?? null,
        nombreItem:   itemSel ? null : (form.nombreItem.trim() || null),
        cantidad:     form.tipo === 'especie' ? Number(form.cantidad) : null,
        unidadMedida: form.unidadMedida.trim() || null,
        sedeId:       form.sedeId || null,
        programaId:   form.programaId || null,
        descripcion:  form.descripcion.trim() || null,
        fechaDonacion: form.fechaDonacion || hoy(),
      });
      let aviso = null;
      if (form.tipo === 'dinero' && form.registrarContabilidad && form.cuentaContabId && !catDonId)
        aviso = 'La donación se registró, pero no se registró el ingreso en contabilidad porque no existe la categoría PUC 4120 (Donaciones). Créala en Contabilidad o registra el ingreso manualmente.';
      if (form.tipo === 'dinero' && form.registrarContabilidad && form.cuentaContabId && catDonId) {
        try {
          await contabilidadRepository.crearMovimiento({
            tipo:              'ingreso',
            fecha:             form.fechaDonacion || hoy(),
            concepto:          `Donación - ${donante.nombre}`,
            monto:             Number(form.monto),
            cuentaId:          form.cuentaContabId,
            categoriaId:       catDonId,
            programaId:        form.programaId || null,
            terceroNombre:     donante.nombre,
            terceroDocumento:  donante.documento ?? null,
            numeroSoporte:     data.reciboNumero ?? null,
            descripcion:       form.descripcion.trim() || null,
          });
        } catch (e) {
          // la donación ya quedó guardada: se avisa para registrar la contabilidad manualmente
          aviso = `La donación se registró, pero no se pudo registrar el ingreso en contabilidad. ${mensajeErrorApi(e, { accion: 'registrar el ingreso' })} Regístralo manualmente.`;
        }
      }
      if (form.tipo === 'especie' && form.ingresarInventario) {
        try {
          await inventarioRepository.ingresarDesdeDonacion({
            itemId:       itemSel?.id ?? null,
            nombreItem:   itemSel?.nombre ?? form.nombreItem.trim(),
            categoria:    itemSel ? undefined : form.categoriaInv,
            unidadMedida: form.unidadMedida.trim() || 'unidad',
            stockMinimo:  form.stockMinimoInv ? Number(form.stockMinimoInv) : 0,
            sedeId:       form.sedeId || null,
            cantidad:     Number(form.cantidad),
            donanteId:    donante?.id ?? null,
            nombreDonante: donante?.nombre ?? null,
            donacionId:   data.id,
          });
        } catch (e) {
          // la donación ya quedó guardada: se avisa para ingresar el inventario manualmente
          aviso = `La donación se registró, pero no se pudo ingresar al inventario. ${mensajeErrorApi(e, { accion: 'ingresar el artículo' })} Agrégalo manualmente.`;
        }
      }
      onGuardada(data, aviso);
    } catch (e) {
      setError(mensajeErrorApi(e, { accion: 'registrar la donación' }));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={confirmarCierre} maxWidth="sm" fullWidth bloqueado={guardando} alEnviar={guardar}>
        <DialogTitle sx={{ fontWeight: 800, color: COLOR_DONACIONES }}>Nueva donación</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Autocomplete
                options={opsDonante}
                getOptionLabel={o => o.nombre ?? ''}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                filterOptions={(ops, estado) => {
                  const filtradas = filtrarDonantes(ops, estado);
                  const texto = estado.inputValue.trim();
                  const exacto = ops.some(o => o.nombre?.toLowerCase() === texto.toLowerCase());
                  if (puedeCrearDonante && texto.length >= 2 && !exacto && texto !== donante?.nombre)
                    filtradas.push({ crear: true, id: '__crear__', nombre: texto });
                  return filtradas;
                }}
                renderOption={({ key, ...props }, o) => (
                  <Box component="li" key={key} {...props}
                    sx={o.crear ? { color: COLOR_DONACIONES, fontWeight: 700, gap: 1 } : undefined}>
                    {o.crear
                      ? <><PersonAddIcon sx={{ fontSize: 18 }} />{`+ Crear donante «${o.nombre}»`}</>
                      : <>
                        {o.nombre}
                        {o.documento && <Box component="span" sx={{ ml: 1, color: 'text.secondary', fontSize: '0.8rem' }}>{o.documento}</Box>}
                      </>}
                  </Box>
                )}
                value={donante}
                onChange={(_, v) => {
                  if (v?.crear) { setNuevoDon({ open: true, nombre: v.nombre }); return; }
                  setDonante(v);
                }}
                onInputChange={(_, v, reason) => { if (reason === 'input') buscarDonantes(v); }}
                loading={buscandoD}
                noOptionsText="Escriba para buscar…"
                renderInput={p => (
                  <TextField {...p} size="small" label="Donante *" {...v.props('donante')} autoFocus={autoFocus && !donanteInicial}
                    slotProps={{ ...p.slotProps, input: { ...p.slotProps.input, endAdornment: <>{buscandoD && <CircularProgress size={16} />}{p.slotProps.input.endAdornment}</> } }}
                  />
                )}
              />
            </Grid>

            <Grid size={12}>
              <ToggleButtonGroup value={form.tipo} exclusive size="small"
                onChange={(_, v) => v && setForm(p => ({
                  ...p, tipo: v,
                  ...(v === 'dinero'  ? { ingresarInventario: false } : {}),
                  ...(v === 'especie' ? { registrarContabilidad: false } : {}),
                }))} sx={{ width: '100%' }}>
                <ToggleButton value="dinero"  sx={{ flex: 1, fontWeight: 700 }}>
                  <AttachMoneyIcon sx={{ fontSize: 17, mr: 0.5 }} /> Dinero
                </ToggleButton>
                <ToggleButton value="especie" sx={{ flex: 1, fontWeight: 700 }}>
                  <Inventory2Icon sx={{ fontSize: 17, mr: 0.5 }} /> En especie
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>

            {form.tipo === 'dinero' && <>
              <Grid size={12}>
                <CampoMoneda label="Monto *" value={form.monto} onChange={m => set('monto', m)}
                  autoFocus={autoFocus && !!donanteInicial}
                  {...v.props('monto', 'El número de recibo se genera automáticamente')} />
              </Grid>
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.registrarContabilidad}
                      onChange={e => set('registrarContabilidad', e.target.checked)}
                      size="small"
                      sx={{ color: COLOR_DONACIONES, '&.Mui-checked': { color: COLOR_DONACIONES } }}
                    />
                  }
                  label="Registrar ingreso en contabilidad"
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.85rem' } }}
                />
              </Grid>
              {form.registrarContabilidad && (
                <Grid size={12}>
                  <FormControl fullWidth size="small" required error={!!v.err('cuentaContabId')}>
                    <InputLabel id="nueva-donacion-dialog-cuenta-destino-label">Cuenta destino *</InputLabel>
                    <Select labelId="nueva-donacion-dialog-cuenta-destino-label" value={form.cuentaContabId} label="Cuenta destino *"
                      onChange={e => set('cuentaContabId', e.target.value)}
                      onBlur={() => v.tocar('cuentaContabId')}>
                      <MenuItem value=""><em>Seleccione una cuenta…</em></MenuItem>
                      {cuentas.map(c => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.nombre}{c.banco ? ` — ${c.banco}` : ''}
                        </MenuItem>
                      ))}
                    </Select>
                    {v.err('cuentaContabId') && <FormHelperText>{v.err('cuentaContabId')}</FormHelperText>}
                  </FormControl>
                </Grid>
              )}
            </>}

            {form.tipo === 'especie' && <>
              <Grid size={12}>
                <Autocomplete
                  options={opsItem}
                  getOptionLabel={o => (typeof o === 'string' ? o : o.nombre ?? '')}
                  isOptionEqualToValue={(o, v) => o.id === v?.id}
                  value={itemSel}
                  onChange={(_, v) => {
                    setItemSel(v ?? null);
                    set('nombreItem', v?.nombre ?? '');
                    if (v?.unidadMedida) set('unidadMedida', v.unidadMedida);
                  }}
                  onInputChange={(_, v, reason) => { if (reason === 'input') buscarItems(v); }}
                  loading={buscandoI}
                  noOptionsText="Escriba para buscar…"
                  renderInput={p => (
                    <TextField {...p} size="small" label="Artículo del inventario (opcional)"
                      placeholder="Buscar por nombre…"
                      slotProps={{ ...p.slotProps, input: { ...p.slotProps.input, endAdornment: <>{buscandoI && <CircularProgress size={16} />}{p.slotProps.input.endAdornment}</> } }}
                    />
                  )}
                />
              </Grid>
              {!itemSel && (
                <Grid size={12}>
                  <TextField fullWidth size="small" label="Nombre del artículo *"
                    value={form.nombreItem} onChange={e => set('nombreItem', e.target.value)}
                    placeholder="Ej: Ropa, alimentos, útiles escolares…" {...v.props('nombreItem')} />
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Cantidad *" type="text"
                  slotProps={{ htmlInput: { inputMode: 'decimal', autoComplete: 'off' } }}
                  value={form.cantidad} onChange={e => set('cantidad', limpiarCantidad(e.target.value))} {...v.props('cantidad')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CampoUnidadMedida value={form.unidadMedida} onChange={v => set('unidadMedida', v)} />
              </Grid>
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.ingresarInventario}
                      onChange={e => set('ingresarInventario', e.target.checked)}
                      size="small"
                      sx={{ color: COLOR_ESPECIE, '&.Mui-checked': { color: COLOR_ESPECIE } }}
                    />
                  }
                  label="Ingresar al inventario automáticamente"
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.85rem' } }}
                />
              </Grid>
              {form.ingresarInventario && !itemSel && <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="nueva-donacion-dialog-categoria-label">Categoría *</InputLabel>
                    <Select labelId="nueva-donacion-dialog-categoria-label" value={form.categoriaInv} label="Categoría *"
                      onChange={e => set('categoriaInv', e.target.value)}>
                      {CATEGORIAS_INVENTARIO.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off' } }} fullWidth size="small" label="Stock mínimo" type="text"
                    value={form.stockMinimoInv}
                    onChange={e => set('stockMinimoInv', limpiarCantidad(e.target.value, { decimales: false }))}
                    {...v.props('stockMinimoInv', 'Alerta de stock bajo (opcional)')} />
                </Grid>
              </>}
            </>}

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="nueva-donacion-dialog-sede-opcional-label">Sede (opcional)</InputLabel>
                <Select labelId="nueva-donacion-dialog-sede-opcional-label" value={form.sedeId} label="Sede (opcional)" onChange={e => setSedeId(e.target.value)}>
                  <MenuItem value=""><em>Sin sede</em></MenuItem>
                  {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small" disabled={!form.sedeId || programas.length === 0}>
                <InputLabel id="nueva-donacion-dialog-programa-opcional-label">Programa (opcional)</InputLabel>
                <Select labelId="nueva-donacion-dialog-programa-opcional-label" value={form.programaId} label="Programa (opcional)"
                  onChange={e => set('programaId', e.target.value)}>
                  <MenuItem value=""><em>Sin programa</em></MenuItem>
                  {programas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField fullWidth size="small" label="Fecha" type="date"
                value={form.fechaDonacion} onChange={e => set('fechaDonacion', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }} {...v.props('fechaDonacion')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 7 }}>
              <TextField fullWidth size="small" label="Descripción" value={form.descripcion}
                onChange={e => set('descripcion', e.target.value)} />
            </Grid>
          </Grid>
        </DialogContent>
        <ResumenErrores {...v.resumen} accion="registrar la donación" />
        <ErrorServidor mensaje={error} onClose={() => setError('')} />
        <AccionesDialogo onCancelar={confirmarCierre} guardando={guardando} enviar
          textoGuardar="Registrar donación"
          sxGuardar={{ bgcolor: COLOR_DONACIONES, '&:hover': { bgcolor: '#b45309' } }} />
      </Dialog>

      {/* Creación rápida: se abre encima con el nombre escrito y, al guardar, queda seleccionado.
          Va fuera del <form> del diálogo: el submit de su portal subiría por React hasta él. */}
      <DonanteDialog
        open={nuevoDon.open}
        nombreInicial={nuevoDon.nombre}
        onClose={() => setNuevoDon({ open: false, nombre: '' })}
        onGuardado={donanteCreado}
        onVerExistente={usarExistente}
        textoVerExistente="Usar donante existente"
      />
    </>
  );
}
