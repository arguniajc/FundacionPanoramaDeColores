import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, FormControl,
  InputAdornment, InputLabel, MenuItem, Pagination, Paper, Select,
  Skeleton, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import HistoryIcon  from '@mui/icons-material/History';
import SaveIcon     from '@mui/icons-material/Save';
import SearchIcon   from '@mui/icons-material/Search';
import SecurityIcon from '@mui/icons-material/Security';
import apiClient    from '@/infrastructure/http/apiClient';
import { useAsyncData } from '@/shared/hooks/useAsyncData';
import { exportarExcel } from '@/shared/utils/exportarExcel';

// ── Permisos ──────────────────────────────────────────────────────────────────

const MODULOS = [
  { key: 'dashboard',      label: 'Dashboard',            acciones: ['ver'] },
  { key: 'beneficiarios',  label: 'Beneficiarios',         acciones: ['ver','crear','editar','eliminar','exportar'] },
  { key: 'donantes',       label: 'Donantes',              acciones: ['ver','crear','editar','eliminar'] },
  { key: 'donaciones',     label: 'Donaciones',            acciones: ['ver','crear','editar','eliminar','exportar','autorizar'] },
  { key: 'programas',      label: 'Proyectos / Programas', acciones: ['ver','crear','editar','eliminar','autorizar'] },
  { key: 'inscripciones',  label: 'Inscripciones',         acciones: ['ver','crear','editar','eliminar'] },
  { key: 'sedes',          label: 'Sedes',                 acciones: ['ver','crear','editar','eliminar'] },
  { key: 'actividades',    label: 'Actividades',           acciones: ['ver','crear','editar','eliminar'] },
  { key: 'voluntarios',    label: 'Voluntarios',           acciones: ['ver','crear','editar','eliminar','exportar'] },
  { key: 'talento_humano', label: 'Talento Humano',        acciones: ['ver','crear','editar','eliminar'] },
  { key: 'contabilidad',   label: 'Contabilidad',          acciones: ['ver','crear','editar','eliminar','exportar'] },
  { key: 'inventario',     label: 'Inventario',            acciones: ['ver','crear','editar','eliminar'] },
  { key: 'reportes',       label: 'Reportes',              acciones: ['ver','exportar'] },
  { key: 'documentos',     label: 'Documentos',            acciones: ['ver','crear','editar','eliminar'] },
  { key: 'log_descargas',  label: 'Log de descargas',      acciones: ['ver'] },
  { key: 'configuracion',  label: 'Configuración',         acciones: ['ver','editar'] },
  { key: 'seguridad',      label: 'Seguridad',             acciones: ['ver','editar'] },
];

const TODAS_ACCIONES = ['ver','crear','editar','eliminar','exportar','autorizar'];

const ROLES = [
  { value: 'representante_legal',   label: 'Representante Legal' },
  { value: 'sistemas',              label: 'Sistemas' },
  { value: 'coordinador_programas', label: 'Coordinador de Programas' },
  { value: 'trabajador_social',     label: 'Trabajador Social' },
  { value: 'tesorero',              label: 'Tesorero' },
  { value: 'contador',              label: 'Contador' },
  { value: 'secretario',            label: 'Secretario' },
  { value: 'talento_humano',        label: 'Talento Humano' },
  { value: 'auditor',               label: 'Auditor / Solo lectura' },
];

function buildMatrix(permisosDict) {
  const m = {};
  for (const mod of MODULOS) {
    m[mod.key] = {};
    for (const acc of mod.acciones) {
      m[mod.key][acc] = permisosDict[mod.key]?.includes(acc) ?? false;
    }
  }
  return m;
}

function matrixToDto(matrix) {
  const lista = [];
  for (const mod of MODULOS) {
    for (const acc of mod.acciones) {
      lista.push({ modulo: mod.key, accion: acc, permitido: matrix[mod.key][acc] });
    }
  }
  return lista;
}

// ── Auditoría ─────────────────────────────────────────────────────────────────

const TIPO_LABELS = {
  beneficiario:             'Beneficiario',
  donacion:                 'Donación',
  donante:                  'Donante',
  inventario_item:          'Inventario — Ítem',
  inventario_movimiento:    'Inventario — Movimiento',
  inventario_transferencia: 'Inventario — Transferencia',
  contabilidad_cuenta:      'Contabilidad — Cuenta',
  contabilidad_movimiento:  'Contabilidad — Movimiento',
  contabilidad_presupuesto: 'Contabilidad — Presupuesto',
  contabilidad_arqueo:      'Contabilidad — Arqueo',
  nomina_periodo:           'Nómina — Período',
  nomina_liquidacion:       'Nómina — Liquidación',
};

const ACCION_ESTILOS = {
  creado:           { bg: '#dcfce7', color: '#166534' },
  editado:          { bg: '#dbeafe', color: '#1e40af' },
  eliminado:        { bg: '#fee2e2', color: '#991b1b' },
  cerrado:          { bg: '#f3f4f6', color: '#374151' },
  liquidado:        { bg: '#ede9fe', color: '#6d28d9' },
  'auto-liquidado': { bg: '#ede9fe', color: '#6d28d9' },
  anulado:          { bg: '#ffedd5', color: '#9a3412' },
  movimiento:       { bg: '#e0f2fe', color: '#0369a1' },
  transferencia:    { bg: '#e0f2fe', color: '#0369a1' },
};

const ACCIONES_FILTRO = [
  'creado', 'editado', 'eliminado', 'cerrado',
  'liquidado', 'auto-liquidado', 'anulado', 'movimiento', 'transferencia',
];

const TAMANO_PAGINA = 50;

function TabAuditoria() {
  const [tipos,        setTipos]        = useState([]);
  const [filtTipo,     setFiltTipo]     = useState('');
  const [filtAccion,   setFiltAccion]   = useState('');
  const [inputUsuario, setInputUsuario] = useState('');
  const [filtUsuario,  setFiltUsuario]  = useState('');
  const [filtDesde,    setFiltDesde]    = useState('');
  const [filtHasta,    setFiltHasta]    = useState('');
  const [pagina,       setPagina]       = useState(1);
  const [result,       setResult]       = useState(null);
  const [cargando,     setCargando]     = useState(false);

  useEffect(() => {
    apiClient.get('/api/auditoria/tipos').then(r => setTipos(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setFiltUsuario(inputUsuario), 350);
    return () => clearTimeout(t);
  }, [inputUsuario]);

  const cargar = useCallback(async (pag) => {
    setCargando(true);
    try {
      const params = { pagina: pag, tamano: TAMANO_PAGINA };
      if (filtTipo)    params.tipo    = filtTipo;
      if (filtAccion)  params.accion  = filtAccion;
      if (filtUsuario) params.usuario = filtUsuario;
      if (filtDesde)   params.desde   = filtDesde;
      if (filtHasta)   params.hasta   = filtHasta;
      const { data } = await apiClient.get('/api/auditoria', { params });
      setResult(data);
    } catch {} finally { setCargando(false); }
  }, [filtTipo, filtAccion, filtUsuario, filtDesde, filtHasta]);

  useEffect(() => { setPagina(1); cargar(1); }, [cargar]);

  const hayFiltros = filtTipo || filtAccion || filtUsuario || filtDesde || filtHasta;
  const totalPaginas = result ? Math.ceil(result.total / TAMANO_PAGINA) : 0;

  const limpiar = () => {
    setFiltTipo(''); setFiltAccion('');
    setInputUsuario(''); setFiltUsuario('');
    setFiltDesde(''); setFiltHasta('');
  };

  const exportar = () => {
    if (!result?.datos?.length) return;
    exportarExcel('Auditoria', [{
      nombre: 'Auditoría',
      datos: result.datos.map(ev => ({
        Fecha:   ev.fecha,
        Módulo:  TIPO_LABELS[ev.entidadTipo] ?? ev.entidadTipo,
        Entidad: ev.entidadNombre ?? ev.entidadId ?? '',
        Acción:  ev.accion,
        Usuario: ev.usuarioEmail ?? '',
        Detalle: ev.detalle ?? '',
      })),
    }]);
  };

  return (
    <Box>
      {/* Filtros */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Módulo</InputLabel>
          <Select value={filtTipo} label="Módulo" onChange={e => setFiltTipo(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            {tipos.map(t => (
              <MenuItem key={t} value={t}>{TIPO_LABELS[t] ?? t}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 155 }}>
          <InputLabel>Acción</InputLabel>
          <Select value={filtAccion} label="Acción" onChange={e => setFiltAccion(e.target.value)}>
            <MenuItem value="">Todas</MenuItem>
            {ACCIONES_FILTRO.map(a => (
              <MenuItem key={a} value={a}>{a}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField size="small" placeholder="Buscar usuario…" value={inputUsuario}
          onChange={e => setInputUsuario(e.target.value)} sx={{ width: 200 }}
          InputProps={{ startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            </InputAdornment>
          )}}
        />

        <TextField size="small" label="Desde" type="date" value={filtDesde}
          onChange={e => setFiltDesde(e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />

        <TextField size="small" label="Hasta" type="date" value={filtHasta}
          onChange={e => setFiltHasta(e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />

        {hayFiltros && (
          <Button size="small" onClick={limpiar} sx={{ color: 'text.secondary' }}>
            Limpiar
          </Button>
        )}

        <Box sx={{ flex: 1 }} />

        <Button size="small" variant="outlined" startIcon={<FileDownloadIcon />}
          disabled={!result?.datos?.length} onClick={exportar}>
          Exportar Excel
        </Button>
      </Box>

      {/* Contador */}
      {result && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {result.total.toLocaleString('es-CO')} evento{result.total !== 1 ? 's' : ''}
          {hayFiltros ? ' con estos filtros' : ' en total'}
          {totalPaginas > 1 && ` — página ${result.pagina} de ${totalPaginas}`}
        </Typography>
      )}

      {/* Tabla */}
      {cargando && !result ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Módulo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Entidad</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Acción</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Usuario</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Detalle</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!result?.datos?.length ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    {cargando ? 'Cargando…' : 'No hay eventos de auditoría con estos filtros.'}
                  </TableCell>
                </TableRow>
              ) : result.datos.map(ev => {
                const est = ACCION_ESTILOS[ev.accion] ?? { bg: '#f3f4f6', color: '#374151' };
                return (
                  <TableRow key={ev.id} hover>
                    <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap', color: 'text.secondary' }}>
                      {ev.fecha}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>
                      {TIPO_LABELS[ev.entidadTipo] ?? ev.entidadTipo}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem', maxWidth: 180 }}>
                      <Tooltip title={ev.entidadId ?? ''}>
                        <span>{ev.entidadNombre ?? (ev.entidadId ? `#${ev.entidadId.slice(0, 8)}` : '—')}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip label={ev.accion} size="small"
                        sx={{ bgcolor: est.bg, color: est.color, fontWeight: 700, fontSize: '0.68rem' }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                      {ev.usuarioEmail ?? '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', maxWidth: 220 }}>
                      <Tooltip title={ev.detalle ?? ''}>
                        <span style={{
                          whiteSpace: 'nowrap', overflow: 'hidden',
                          textOverflow: 'ellipsis', display: 'block', maxWidth: 200,
                        }}>
                          {ev.detalle ?? '—'}
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={totalPaginas} page={pagina} color="primary"
            onChange={(_, p) => { setPagina(p); cargar(p); }} />
        </Box>
      )}
    </Box>
  );
}

// ── SeguridadPage ─────────────────────────────────────────────────────────────

export default function SeguridadPage() {
  const [mainTab, setMainTab] = useState(0);
  const [rol,     setRol]     = useState(ROLES[0].value);
  const [saving,  setSaving]  = useState(false);
  const [guardado,setGuardado]= useState(false);

  const {
    data: matrix, cargando, error, ejecutar: _cargar, setData: setMatrix, setError,
  } = useAsyncData(
    async (rolSeleccionado) => {
      const { data } = await apiClient.get('/api/permisos/roles');
      const entry = data.find(r => r.rol === rolSeleccionado);
      return buildMatrix(entry?.permisos ?? {});
    },
    { errorMsg: 'No se pudieron cargar los permisos.' }
  );

  const cargar = useCallback(async (rolSeleccionado) => {
    setGuardado(false);
    await _cargar(rolSeleccionado);
  }, [_cargar]);

  useEffect(() => { cargar(rol); }, [rol, cargar]);

  const toggle = (modulo, accion) => {
    setMatrix(prev => ({
      ...prev,
      [modulo]: { ...prev[modulo], [accion]: !prev[modulo][accion] },
    }));
    setGuardado(false);
  };

  const toggleModulo = (modulo) => {
    const acciones = MODULOS.find(m => m.key === modulo).acciones;
    const todasActivas = acciones.every(a => matrix[modulo][a]);
    setMatrix(prev => ({
      ...prev,
      [modulo]: Object.fromEntries(acciones.map(a => [a, !todasActivas])),
    }));
    setGuardado(false);
  };

  const toggleAccion = (accion) => {
    const modulosConAccion = MODULOS.filter(m => m.acciones.includes(accion));
    const todasActivas = modulosConAccion.every(m => matrix[m.key][accion]);
    setMatrix(prev => {
      const next = { ...prev };
      for (const m of modulosConAccion) {
        next[m.key] = { ...next[m.key], [accion]: !todasActivas };
      }
      return next;
    });
    setGuardado(false);
  };

  const guardar = async () => {
    setSaving(true);
    setError('');
    try {
      await apiClient.put(`/api/permisos/${rol}`, { permisos: matrixToDto(matrix) });
      setGuardado(true);
    } catch (e) {
      setError(e.response?.data?.error ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Seguridad</Typography>
          <Typography variant="body2" color="text.secondary">
            Permisos por rol y registro de auditoría del sistema
          </Typography>
        </Box>
        {mainTab === 0 && (
          <Button variant="contained" startIcon={<SaveIcon />} onClick={guardar}
            disabled={saving || cargando || !matrix}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Permisos" icon={<SecurityIcon fontSize="small" />} iconPosition="start"
          sx={{ minHeight: 42, py: 0, fontWeight: 600 }} />
        <Tab label="Auditoría" icon={<HistoryIcon fontSize="small" />} iconPosition="start"
          sx={{ minHeight: 42, py: 0, fontWeight: 600 }} />
      </Tabs>

      {/* ── Tab Permisos ──────────────────────────────────────────────────────── */}
      {mainTab === 0 && (
        <>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField select label="Rol" size="small" sx={{ minWidth: 260 }}
              value={rol} onChange={e => setRol(e.target.value)}>
              {ROLES.map(r => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </TextField>
            <Chip label="El Administrador siempre tiene acceso total" size="small" color="warning" />
          </Box>

          {error    && <Alert severity="error"   sx={{ mb: 2 }}>{error}</Alert>}
          {guardado && <Alert severity="success" sx={{ mb: 2 }}>Permisos guardados correctamente.</Alert>}

          <TableContainer component={Paper} elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Table size="small" sx={{ tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ width: 200, fontWeight: 700 }}>Módulo</TableCell>
                  {TODAS_ACCIONES.map(acc => (
                    <TableCell key={acc} align="center"
                      sx={{ fontWeight: 700, textTransform: 'capitalize', cursor: 'pointer', '&:hover': { bgcolor: 'action.selected' } }}
                      onClick={() => matrix && toggleAccion(acc)}>
                      <Tooltip title={`Clic para marcar/desmarcar toda la columna "${acc}"`}>
                        <span>{acc}</span>
                      </Tooltip>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {MODULOS.map(mod => (
                  <TableRow key={mod.key} hover>
                    <TableCell
                      sx={{ fontWeight: 500, cursor: 'pointer', '&:hover': { bgcolor: 'action.selected' } }}
                      onClick={() => matrix && toggleModulo(mod.key)}>
                      <Tooltip title="Clic para marcar/desmarcar toda la fila">
                        <span>{mod.label}</span>
                      </Tooltip>
                    </TableCell>
                    {TODAS_ACCIONES.map(acc => {
                      const disponible = mod.acciones.includes(acc);
                      return (
                        <TableCell key={acc} align="center" sx={{ p: 0.5 }}>
                          {cargando ? (
                            <Skeleton variant="rectangular" width={24} height={24} sx={{ mx: 'auto', borderRadius: 1 }} />
                          ) : disponible ? (
                            <Checkbox size="small"
                              checked={matrix?.[mod.key]?.[acc] ?? false}
                              onChange={() => toggle(mod.key, acc)}
                              disabled={!matrix} />
                          ) : (
                            <Box sx={{ color: 'text.disabled', fontSize: '1rem', lineHeight: 1 }}>—</Box>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Clic en el nombre del módulo o en el encabezado de acción para marcar/desmarcar toda la fila o columna.
          </Typography>
        </>
      )}

      {/* ── Tab Auditoría ─────────────────────────────────────────────────────── */}
      {mainTab === 1 && <TabAuditoria />}
    </Box>
  );
}
