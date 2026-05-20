import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Autocomplete, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, Grid, InputAdornment, InputLabel, MenuItem, Select, TextField,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import Inventory2Icon  from '@mui/icons-material/Inventory2';
import { donantesRepository }   from '../../../../../infrastructure/repositories/donantesRepository';
import { donacionesRepository } from '../../../../../infrastructure/repositories/donacionesRepository';
import { sedesRepository }      from '../../../../../infrastructure/repositories/sedesRepository';
import { inventarioRepository } from '../../../../../infrastructure/repositories/inventarioRepository';
import { COLOR_DONACIONES, COLOR_ESPECIE, hoy } from './helpers';

const VACIO = {
  tipo: 'dinero', monto: '', reciboNumero: '', nombreItem: '',
  cantidad: '', unidadMedida: '', sedeId: '', programaId: '',
  descripcion: '', fechaDonacion: hoy(),
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

  useEffect(() => {
    if (!open) return;
    setForm({ ...VACIO, fechaDonacion: hoy() });
    setError('');
    setItemSel(null);
    setOpsItem([]);
    if (donanteInicial) {
      setDonante(donanteInicial);
      setOpsDonante([donanteInicial]);
    } else {
      setDonante(null);
      setOpsDonante([]);
    }
  }, [open, donanteInicial]);

  useEffect(() => {
    if (!form.sedeId) { setProgramas([]); return; }
    sedesRepository.listarProgramas(form.sedeId)
      .then(({ data }) => setProgramas(data))
      .catch(() => setProgramas([]));
  }, [form.sedeId]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setSedeId = v => setForm(p => ({ ...p, sedeId: v, programaId: '' }));

  const buscarDonantes = useCallback(async (q) => {
    if (!q) return;
    setBuscandoD(true);
    try {
      const { data } = await donantesRepository.listar({ buscar: q });
      setOpsDonante(data.map(d => ({ id: d.id, nombre: d.nombre })));
    } catch {} finally { setBuscandoD(false); }
  }, []);

  const buscarItems = useCallback(async (q) => {
    if (!q) return;
    setBuscandoI(true);
    try {
      const { data } = await inventarioRepository.listarItems({ buscar: q });
      setOpsItem(data);
    } catch {} finally { setBuscandoI(false); }
  }, []);

  const guardar = async () => {
    if (!donante) { setError('Debe seleccionar un donante.'); return; }
    if (form.tipo === 'dinero' && (!form.monto || Number(form.monto) <= 0)) {
      setError('El monto es obligatorio para donaciones en dinero.'); return;
    }
    if (form.tipo === 'especie' && (!form.cantidad || Number(form.cantidad) <= 0)) {
      setError('La cantidad es obligatoria.'); return;
    }
    if (form.tipo === 'especie' && !itemSel && !form.nombreItem.trim()) {
      setError('Debe indicar el artículo o su nombre.'); return;
    }
    setGuardando(true); setError('');
    try {
      const { data } = await donacionesRepository.crear({
        donanteId:    donante.id,
        tipo:         form.tipo,
        monto:        form.tipo === 'dinero' ? Number(form.monto) : null,
        reciboNumero: form.reciboNumero.trim() || null,
        itemId:       itemSel?.id ?? null,
        nombreItem:   itemSel ? null : (form.nombreItem.trim() || null),
        cantidad:     form.tipo === 'especie' ? Number(form.cantidad) : null,
        unidadMedida: form.unidadMedida.trim() || null,
        sedeId:       form.sedeId || null,
        programaId:   form.programaId || null,
        descripcion:  form.descripcion.trim() || null,
        fechaDonacion: form.fechaDonacion || hoy(),
      });
      onGuardada(data);
    } catch (e) {
      setError(e?.response?.data?.mensaje || 'Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR_DONACIONES }}>Nueva donación</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={12}>
            <Autocomplete
              options={opsDonante}
              getOptionLabel={o => o.nombre ?? ''}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              value={donante}
              onChange={(_, v) => setDonante(v)}
              onInputChange={(_, v, reason) => { if (reason === 'input') buscarDonantes(v); }}
              loading={buscandoD}
              noOptionsText="Escriba para buscar…"
              renderInput={p => (
                <TextField {...p} size="small" label="Donante *"
                  InputProps={{ ...(p.InputProps ?? {}), endAdornment: <>{buscandoD && <CircularProgress size={16} />}{p.InputProps?.endAdornment}</> }}
                />
              )}
            />
          </Grid>

          <Grid size={12}>
            <ToggleButtonGroup value={form.tipo} exclusive size="small"
              onChange={(_, v) => v && set('tipo', v)} sx={{ width: '100%' }}>
              <ToggleButton value="dinero"  sx={{ flex: 1, fontWeight: 700 }}>
                <AttachMoneyIcon sx={{ fontSize: 17, mr: 0.5 }} /> Dinero
              </ToggleButton>
              <ToggleButton value="especie" sx={{ flex: 1, fontWeight: 700 }}>
                <Inventory2Icon sx={{ fontSize: 17, mr: 0.5 }} /> En especie
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          {form.tipo === 'dinero' && <>
            <Grid size={6}>
              <TextField fullWidth size="small" label="Monto *" type="number"
                value={form.monto} onChange={e => set('monto', e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth size="small" label="N° Recibo" value={form.reciboNumero}
                onChange={e => set('reciboNumero', e.target.value)} />
            </Grid>
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
                    InputProps={{ ...(p.InputProps ?? {}), endAdornment: <>{buscandoI && <CircularProgress size={16} />}{p.InputProps?.endAdornment}</> }}
                  />
                )}
              />
            </Grid>
            {!itemSel && (
              <Grid size={12}>
                <TextField fullWidth size="small" label="Nombre del artículo *"
                  value={form.nombreItem} onChange={e => set('nombreItem', e.target.value)}
                  placeholder="Ej: Ropa, alimentos, útiles escolares…" />
              </Grid>
            )}
            <Grid size={6}>
              <TextField fullWidth size="small" label="Cantidad *" type="number"
                value={form.cantidad} onChange={e => set('cantidad', e.target.value)} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth size="small" label="Unidad de medida"
                value={form.unidadMedida} onChange={e => set('unidadMedida', e.target.value)}
                placeholder="kg, und, litros…" />
            </Grid>
          </>}

          <Grid size={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Sede (opcional)</InputLabel>
              <Select value={form.sedeId} label="Sede (opcional)" onChange={e => setSedeId(e.target.value)}>
                <MenuItem value=""><em>Sin sede</em></MenuItem>
                {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={6}>
            <FormControl fullWidth size="small" disabled={!form.sedeId || programas.length === 0}>
              <InputLabel>Programa (opcional)</InputLabel>
              <Select value={form.programaId} label="Programa (opcional)"
                onChange={e => set('programaId', e.target.value)}>
                <MenuItem value=""><em>Sin programa</em></MenuItem>
                {programas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={5}>
            <TextField fullWidth size="small" label="Fecha" type="date"
              value={form.fechaDonacion} onChange={e => set('fechaDonacion', e.target.value)}
              InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid size={7}>
            <TextField fullWidth size="small" label="Descripción" value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando}
          sx={{ bgcolor: COLOR_DONACIONES, fontWeight: 700, '&:hover': { bgcolor: '#b45309' } }}>
          {guardando ? <CircularProgress size={20} color="inherit" /> : 'Registrar donación'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
