import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Checkbox, MenuItem, TextField, Button, Chip,
  Alert, Skeleton, Tooltip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import apiClient from '../../../../infrastructure/http/apiClient';
import { useAsyncData } from '../../../../shared/hooks/useAsyncData';

// Módulos y las acciones posibles para cada uno
const MODULOS = [
  { key: 'dashboard',      label: 'Dashboard',           acciones: ['ver'] },
  { key: 'beneficiarios',  label: 'Beneficiarios',        acciones: ['ver','crear','editar','eliminar','exportar'] },
  { key: 'donantes',       label: 'Donantes',             acciones: ['ver','crear','editar','eliminar'] },
  { key: 'donaciones',     label: 'Donaciones',           acciones: ['ver','crear','editar','eliminar','exportar','autorizar'] },
  { key: 'programas',      label: 'Proyectos / Programas',acciones: ['ver','crear','editar','eliminar','autorizar'] },
  { key: 'inscripciones',  label: 'Inscripciones',        acciones: ['ver','crear','editar','eliminar'] },
  { key: 'sedes',          label: 'Sedes',                acciones: ['ver','crear','editar','eliminar'] },
  { key: 'actividades',    label: 'Actividades',          acciones: ['ver','crear','editar','eliminar'] },
  { key: 'voluntarios',    label: 'Voluntarios',          acciones: ['ver','crear','editar','eliminar','exportar'] },
  { key: 'talento_humano', label: 'Talento Humano',       acciones: ['ver','crear','editar','eliminar'] },
  { key: 'contabilidad',   label: 'Contabilidad',         acciones: ['ver','crear','editar','eliminar','exportar'] },
  { key: 'inventario',     label: 'Inventario',           acciones: ['ver','crear','editar','eliminar'] },
  { key: 'reportes',       label: 'Reportes',             acciones: ['ver','exportar'] },
  { key: 'documentos',     label: 'Documentos',           acciones: ['ver','crear','editar','eliminar'] },
  { key: 'log_descargas',  label: 'Log de descargas',     acciones: ['ver'] },
  { key: 'configuracion',  label: 'Configuración',        acciones: ['ver','editar'] },
  { key: 'seguridad',      label: 'Seguridad',            acciones: ['ver','editar'] },
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

// Construye un mapa { modulo: { accion: bool } } a partir del dict de permisos
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

// Convierte la matriz a la lista de PermisoDto que espera el backend
function matrixToDto(matrix) {
  const lista = [];
  for (const mod of MODULOS) {
    for (const acc of mod.acciones) {
      lista.push({ modulo: mod.key, accion: acc, permitido: matrix[mod.key][acc] });
    }
  }
  return lista;
}

export default function SeguridadPage() {
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

  // Marcar/desmarcar toda una fila (módulo)
  const toggleModulo = (modulo) => {
    const acciones = MODULOS.find(m => m.key === modulo).acciones;
    const todasActivas = acciones.every(a => matrix[modulo][a]);
    setMatrix(prev => ({
      ...prev,
      [modulo]: Object.fromEntries(acciones.map(a => [a, !todasActivas])),
    }));
    setGuardado(false);
  };

  // Marcar/desmarcar toda una columna (acción)
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Seguridad</Typography>
          <Typography variant="body2" color="text.secondary">
            Configura qué puede hacer cada rol en el sistema
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={guardar}
          disabled={saving || cargando || !matrix}
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </Box>

      {/* Selector de rol */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          select label="Rol" size="small" sx={{ minWidth: 260 }}
          value={rol} onChange={e => setRol(e.target.value)}
        >
          {ROLES.map(r => (
            <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
          ))}
        </TextField>
        <Chip label="El Administrador siempre tiene acceso total" size="small" color="warning" />
      </Box>

      {error   && <Alert severity="error"   sx={{ mb: 2 }}>{error}</Alert>}
      {guardado && <Alert severity="success" sx={{ mb: 2 }}>Permisos guardados correctamente.</Alert>}

      {/* Matriz */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ width: 200, fontWeight: 700 }}>Módulo</TableCell>
              {TODAS_ACCIONES.map(acc => (
                <TableCell
                  key={acc}
                  align="center"
                  sx={{ fontWeight: 700, textTransform: 'capitalize', cursor: 'pointer', '&:hover': { bgcolor: 'action.selected' } }}
                  onClick={() => matrix && toggleAccion(acc)}
                >
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
                  onClick={() => matrix && toggleModulo(mod.key)}
                >
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
                        <Checkbox
                          size="small"
                          checked={matrix?.[mod.key]?.[acc] ?? false}
                          onChange={() => toggle(mod.key, acc)}
                          disabled={!matrix}
                        />
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
    </Box>
  );
}
