import { useState, useEffect, useCallback } from 'react';
import { useConfirm } from '@/shared/components/ConfirmDialog';
import {
  Alert, Box, Button, Chip, CircularProgress, FormControl, Grid, IconButton,
  InputAdornment, InputLabel, MenuItem, Select, Snackbar, TextField, Typography,
} from '@mui/material';
import AddIcon          from '@mui/icons-material/Add';
import Inventory2Icon   from '@mui/icons-material/Inventory2';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TrendingUpIcon   from '@mui/icons-material/TrendingUp';
import SearchIcon       from '@mui/icons-material/Search';
import CloseIcon        from '@mui/icons-material/Close';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import HandshakeIcon    from '@mui/icons-material/Handshake';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportarExcel } from '@/shared/utils/exportarExcel';
import { inventarioRepository } from '@/infrastructure/repositories/inventarioRepository';
import { sedesRepository }      from '@/infrastructure/repositories/sedesRepository';
import { COLOR, CATEGORIAS, CAT_COLOR } from './components/helpers';
import { StatCard }               from './components/StatCard';
import { ItemCard }               from './components/ItemCard';
import { NuevoItemDialog }        from './components/NuevoItemDialog';
import { RegistrarMovimientoDialog } from './components/RegistrarMovimientoDialog';
import { TransferenciaDialog }    from './components/TransferenciaDialog';
import { HistorialDialog }        from './components/HistorialDialog';

export default function InventarioPage() {
  const confirm = useConfirm();
  const [sedes,           setSedes]           = useState([]);
  const [sedeSel,         setSedeSel]         = useState('');
  const [categoriaFil,    setCategoriaFil]    = useState('');
  const [tenenciaFil,     setTenenciaFil]     = useState('');
  const [items,           setItems]           = useState([]);
  const [tipos,           setTipos]           = useState([]);
  const [stats,           setStats]           = useState({ totalItems: 0, stockBajo: 0, movimientosMes: 0, sinStock: 0 });
  const [cargando,        setCargando]        = useState(false);
  const [buscar,          setBuscar]          = useState('');
  const [comodatosAlerta, setComodatosAlerta] = useState([]);
  const [dialItem,        setDialItem]        = useState({ open: false, item: null });
  const [dialMov,         setDialMov]         = useState({ open: false, item: null });
  const [dialTransf,      setDialTransf]      = useState({ open: false, item: null });
  const [dialHistorial,   setDialHistorial]   = useState({ open: false, item: null });
  const [snack,           setSnack]           = useState({ open: false, msg: '', sev: 'success' });

  const ok  = msg => setSnack({ open: true, msg, sev: 'success' });
  const err = msg => setSnack({ open: true, msg, sev: 'error' });

  useEffect(() => {
    sedesRepository.listar({ soloActivas: true })
      .then(r => {
        const lista = r.data;
        setSedes(lista);
        if (lista.length > 0) setSedeSel(lista[0].id);
      })
      .catch(() => err('No se pudieron cargar las sedes.'));

    inventarioRepository.listarTipos()
      .then(r => setTipos(r.data))
      .catch(() => {});

    inventarioRepository.comodatosProximos(30)
      .then(r => setComodatosAlerta(r.data))
      .catch(() => {});
  }, []);

  const cargarItems = useCallback(async (params) => {
    setCargando(true);
    try {
      const [itemsRes, statsRes] = await Promise.all([
        inventarioRepository.listarItems(params),
        inventarioRepository.stats(params.sedeId ? { sedeId: params.sedeId } : {}),
      ]);
      setItems(itemsRes.data);
      setStats(statsRes.data);
    } catch {
      err('No se pudieron cargar los artículos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = {};
      if (sedeSel)      params.sedeId       = sedeSel;
      if (buscar)       params.buscar       = buscar;
      if (categoriaFil) params.categoria    = categoriaFil;
      if (tenenciaFil)  params.tipoTenencia = tenenciaFil;
      cargarItems(params);
    }, 260);
    return () => clearTimeout(t);
  }, [sedeSel, buscar, categoriaFil, tenenciaFil, cargarItems]);

  const recargarStats = async () => {
    try {
      const { data } = await inventarioRepository.stats(sedeSel ? { sedeId: sedeSel } : {});
      setStats(data);
    } catch {}
  };

  const handleGuardado = (itemData, editando) => {
    if (editando) setItems(prev => prev.map(i => i.id === itemData.id ? itemData : i));
    else { setItems(prev => [itemData, ...prev]); recargarStats(); }
    setDialItem({ open: false, item: null });
    ok(editando ? 'Artículo actualizado.' : 'Artículo creado.');
  };

  const handleMovimientoRegistrado = (itemId, nuevoStock) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, stockActual: nuevoStock } : i));
    setDialMov({ open: false, item: null });
    recargarStats();
    ok('Movimiento registrado.');
  };

  const handleTransferida = (data) => {
    setItems(prev => prev.map(i => i.id === data.itemOrigenId ? { ...i, stockActual: data.nuevoStockOrigen } : i));
    const tieneDestino = items.find(i => i.id === data.itemDestinoId);
    if (tieneDestino)
      setItems(prev => prev.map(i => i.id === data.itemDestinoId ? { ...i, stockActual: data.nuevoStockDestino } : i));
    setDialTransf({ open: false, item: null });
    recargarStats();
    ok('Transferencia realizada.');
  };

  const handleEliminar = async (item) => {
    if (!await confirm(`¿Eliminar "${item.nombre}"? Si tiene movimientos quedará desactivado.`)) return;
    try {
      await inventarioRepository.eliminarItem(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      recargarStats();
      ok('Artículo eliminado.');
    } catch {
      err('No se pudo eliminar el artículo.');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box sx={{ width: 4, height: 26, borderRadius: 1, bgcolor: COLOR }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>Inventario</Typography>
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', pl: 0.5 }}>
            Control de bienes, materiales y donaciones por sede
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small" variant="outlined" startIcon={<FileDownloadIcon />}
            disabled={items.length === 0}
            onClick={() => exportarExcel('Inventario', [{
              nombre: 'Artículos',
              datos: items.map(i => ({
                Nombre:              i.nombre,
                Código:              i.codigo ?? '',
                Categoría:           i.categoria ?? '',
                Tenencia:            i.tipoTenencia ?? '',
                Sede:                i.sede?.nombre ?? '',
                'Stock actual':      i.stockActual,
                'Stock mínimo':      i.stockMinimo,
                'Precio unitario':   i.precioUnitario ?? '',
                Unidad:              i.unidadMedida ?? '',
                Descripción:         i.descripcion ?? '',
                Estado:              i.activo ? 'Activo' : 'Inactivo',
              })),
            }])}
          >
            Exportar Excel
          </Button>
          <Button
            variant="contained" startIcon={<AddIcon />}
            onClick={() => setDialItem({ open: true, item: null })}
            sx={{ bgcolor: COLOR, fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#3b1270' } }}
          >
            Nuevo artículo
          </Button>
        </Box>
      </Box>

      {/* Selector de sede */}
      <Box sx={{ mb: 2.5 }}>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel>Sede</InputLabel>
          <Select value={sedeSel} label="Sede" onChange={e => { setSedeSel(e.target.value); setBuscar(''); setCategoriaFil(''); setTenenciaFil(''); }}>
            <MenuItem value="">Todas las sedes</MenuItem>
            {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={<Inventory2Icon />} label="Total artículos" value={stats.totalItems} color={COLOR} loading={cargando} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={<WarningAmberIcon />} label="Stock bajo" value={stats.stockBajo} color="#d97706" loading={cargando} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={<RemoveCircleIcon />} label="Sin stock" value={stats.sinStock} color="#dc2626" loading={cargando} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={<TrendingUpIcon />} label="Movimientos mes" value={stats.movimientosMes} color="#16a34a" loading={cargando} />
        </Grid>
      </Grid>

      {/* Alerta comodatos próximos a vencer */}
      {comodatosAlerta.length > 0 && (
        <Alert severity="warning" icon={<HandshakeIcon />} sx={{ mb: 2.5, borderRadius: 2 }}>
          <strong>{comodatosAlerta.length} comodato{comodatosAlerta.length > 1 ? 's' : ''}</strong> próximo{comodatosAlerta.length > 1 ? 's' : ''} a vencer (en 30 días):{' '}
          {comodatosAlerta.map((c, i) => (
            <span key={c.id}>
              {i > 0 ? ', ' : ''}
              <strong>{c.nombre}</strong>
              {c.comodatoFechaFin && ` (${new Date(c.comodatoFechaFin + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })})`}
            </span>
          ))}
        </Alert>
      )}

      {/* Filtros */}
      <Box sx={{ mb: 2.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Buscar por nombre o código…"
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment>,
            endAdornment: buscar ? <InputAdornment position="end"><IconButton size="small" onClick={() => setBuscar('')}><CloseIcon fontSize="small" /></IconButton></InputAdornment> : null,
          }}
          sx={{ width: { xs: '100%', sm: 300 } }}
        />
        <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap' }}>
          <Chip
            label="Todas"
            onClick={() => setCategoriaFil('')}
            variant={categoriaFil === '' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', ...(categoriaFil === '' ? { bgcolor: COLOR, color: '#fff' } : {}) }}
          />
          {CATEGORIAS.map(cat => (
            <Chip
              key={cat}
              label={cat}
              onClick={() => setCategoriaFil(p => p === cat ? '' : cat)}
              variant={categoriaFil === cat ? 'filled' : 'outlined'}
              sx={{
                fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer',
                ...(categoriaFil === cat ? { bgcolor: CAT_COLOR[cat] ?? COLOR, color: '#fff' } : { borderColor: `${CAT_COLOR[cat]}80`, color: CAT_COLOR[cat] }),
              }}
            />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap' }}>
          {[
            { value: '',             label: 'Tenencia: todas' },
            { value: 'propio',       label: 'Propios' },
            { value: 'comodato',     label: 'Comodato' },
            { value: 'donacion_uso', label: 'Donación uso' },
            { value: 'arrendamiento',label: 'Arrendados' },
          ].map(t => (
            <Chip key={t.value} label={t.label}
              onClick={() => setTenenciaFil(p => p === t.value ? '' : t.value)}
              variant={tenenciaFil === t.value ? 'filled' : 'outlined'}
              icon={t.value === 'comodato' ? <HandshakeIcon sx={{ fontSize: '13px !important' }} /> : undefined}
              sx={{
                fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer',
                ...(tenenciaFil === t.value
                  ? { bgcolor: t.value === 'comodato' ? '#b45309' : COLOR, color: '#fff' }
                  : {}),
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Grid de artículos */}
      {cargando && items.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
      ) : items.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center', border: '1.5px dashed #e2d9f3', borderRadius: 2, bgcolor: '#fdfbff' }}>
          <Inventory2Icon sx={{ fontSize: 48, color: '#c8b4e8', mb: 1.5 }} />
          <Typography fontWeight={700} color="text.secondary">
            {buscar || categoriaFil ? 'No se encontraron artículos con ese filtro' : 'No hay artículos en esta sede'}
          </Typography>
          {!buscar && !categoriaFil && (
            <Button variant="contained" startIcon={<AddIcon />}
              sx={{ mt: 2, bgcolor: COLOR, fontWeight: 700 }}
              onClick={() => setDialItem({ open: true, item: null })}>
              Agregar primer artículo
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2} alignItems="stretch">
          {items.map(item => (
            <Grid key={item.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <ItemCard
                item={item}
                onMovimiento={i => setDialMov({ open: true, item: i })}
                onEditar={i => setDialItem({ open: true, item: i })}
                onEliminar={handleEliminar}
                onHistorial={i => setDialHistorial({ open: true, item: i })}
                onTransferir={i => setDialTransf({ open: true, item: i })}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialogs */}
      <NuevoItemDialog
        open={dialItem.open} item={dialItem.item} sedes={sedes} sedeSelId={sedeSel}
        onClose={() => setDialItem({ open: false, item: null })}
        onGuardado={handleGuardado}
      />
      <RegistrarMovimientoDialog
        open={dialMov.open} item={dialMov.item} tipos={tipos}
        onClose={() => setDialMov({ open: false, item: null })}
        onRegistrado={handleMovimientoRegistrado}
      />
      <TransferenciaDialog
        open={dialTransf.open} item={dialTransf.item} sedes={sedes}
        onClose={() => setDialTransf({ open: false, item: null })}
        onTransferida={handleTransferida}
      />
      <HistorialDialog
        open={dialHistorial.open} item={dialHistorial.item}
        onClose={() => setDialHistorial({ open: false, item: null })}
      />

      <Snackbar open={snack.open} autoHideDuration={3500}
        onClose={() => setSnack(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(p => ({ ...p, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
