import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/infrastructure/http/apiClient';
import { useAuth } from '@/application/auth/AuthContext';
import { cacheKey, leerCache, escribirCache, limpiarCache } from '@/infrastructure/cache/sessionCache';
import { calcularEdad } from '@/shared/utils/fecha';
import { exportarExcel } from '@/shared/utils/exportarExcel';

const POR_PAGINA = 15;

export function useBeneficiariosPage({ tipo = 'niño' } = {}) {
  const { esAdmin } = useAuth();

  const [inscripciones,  setInscripciones]  = useState([]);
  const [total,          setTotal]          = useState(0);
  const [pagina,         setPagina]         = useState(1);
  const [buscar,         setBuscar]         = useState('');
  const [estado,         setEstado]         = useState('activos');
  const [filtrosOpen,    setFiltrosOpen]    = useState(false);
  const [fGenero,        setFGenero]        = useState('');
  const [fEdadMin,       setFEdadMin]       = useState('');
  const [fEdadMax,       setFEdadMax]       = useState('');
  const [fEps,           setFEps]           = useState('');
  const [fAlergia,       setFAlergia]       = useState('');
  const [cargando,       setCargando]       = useState(false);
  const [error,          setError]          = useState('');
  const [toast,          setToast]          = useState('');
  const [exportando,     setExportando]     = useState(false);
  const [stats,          setStats]          = useState({ activos: 0, baja: 0, total: 0 });
  const [statsDetalle,   setStatsDetalle]   = useState(null);
  const [cargandoStats,  setCargandoStats]  = useState(false);
  const [modalStats,     setModalStats]     = useState(false);
  const [seleccionada,   setSeleccionada]   = useState(null);
  const [editando,       setEditando]       = useState(null);
  const [creando,        setCreando]        = useState(false);
  const [idBaja,         setIdBaja]         = useState(null);
  const [motivoBaja,     setMotivoBaja]     = useState('');
  const [procesandoBaja, setProcesandoBaja] = useState(false);
  const [actualizando,   setActualizando]   = useState(false);
  const [importDialog,   setImportDialog]   = useState(false);
  const [eliminar,       setEliminar]       = useState(null);
  const [eliminando,     setEliminando]     = useState(false);
  const [errorEliminar,  setErrorEliminar]  = useState('');

  const cargarStatsDetalle = useCallback(async () => {
    setCargandoStats(true);
    try {
      const { data } = await apiClient.get('/api/beneficiarios/stats', { params: { tipo } });
      setStatsDetalle(data);
      setStats({ activos: data.activos ?? 0, baja: data.baja ?? 0, total: data.total ?? 0 });
    } catch { /* silencioso */ }
    finally { setCargandoStats(false); }
  }, [tipo]);

  const filtrosAvanzados = { genero: fGenero, edadMin: fEdadMin, edadMax: fEdadMax, eps: fEps, tieneAlergia: fAlergia };
  const hayFiltrosAvanzados = !!(fGenero || fEdadMin || fEdadMax || fEps || fAlergia);
  const limpiarFiltros = () => { setFGenero(''); setFEdadMin(''); setFEdadMax(''); setFEps(''); setFAlergia(''); };

  const buildParams = () => {
    const p = { pagina, porPagina: POR_PAGINA, buscar: buscar || undefined, estado, tipo };
    if (fGenero)  p.genero       = fGenero;
    if (fEdadMin) p.edadMin      = fEdadMin;
    if (fEdadMax) p.edadMax      = fEdadMax;
    if (fEps)     p.eps          = fEps;
    if (fAlergia) p.tieneAlergia = fAlergia;
    return p;
  };

  const cargar = useCallback(async (forzar = false) => {
    const key    = cacheKey(estado, pagina, buscar, filtrosAvanzados, tipo);
    const cached = !forzar && leerCache(key);

    if (cached) {
      setInscripciones(cached.data);
      setTotal(cached.total);
      setActualizando(true);
      try {
        const { data } = await apiClient.get('/api/beneficiarios', { params: buildParams() });
        setInscripciones(data.data);
        setTotal(data.total);
        escribirCache(key, data.data, data.total);
      } catch { /* mantener caché si falla la red */ }
      finally { setActualizando(false); }
      return;
    }

    setCargando(true); setActualizando(false); setError('');
    try {
      const { data } = await apiClient.get('/api/beneficiarios', { params: buildParams() });
      setInscripciones(data.data);
      setTotal(data.total);
      escribirCache(key, data.data, data.total);
    } catch {
      setError('No se pudieron cargar los beneficiarios.');
    } finally { setCargando(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, buscar, estado, fGenero, fEdadMin, fEdadMax, fEps, fAlergia]);

  useEffect(() => { cargarStatsDetalle(); }, [cargarStatsDetalle]);
  useEffect(() => { cargar(); },     [cargar]);
  useEffect(() => { setPagina(1); }, [buscar, estado, fGenero, fEdadMin, fEdadMax, fEps, fAlergia]);

  const handleDarDeBaja = async () => {
    if (!idBaja) return;
    setProcesandoBaja(true);
    try {
      await apiClient.patch(`/api/beneficiarios/${idBaja}/baja`, { motivo: motivoBaja || null });
      setIdBaja(null); setMotivoBaja('');
      setToast('Beneficiario dado de baja correctamente');
      limpiarCache(); cargar(true); cargarStatsDetalle();
    } catch { setError('No se pudo dar de baja al beneficiario.'); }
    finally  { setProcesandoBaja(false); }
  };

  const handleReactivar = async (id) => {
    try {
      await apiClient.patch(`/api/beneficiarios/${id}/reactivar`);
      setToast('Beneficiario reactivado correctamente');
      limpiarCache(); cargar(true); cargarStatsDetalle();
    } catch { setError('No se pudo reactivar el beneficiario.'); }
  };

  const handleEliminarPermanente = async () => {
    if (!eliminar) return;
    setEliminando(true); setErrorEliminar('');
    try {
      await apiClient.delete(`/api/beneficiarios/${eliminar.id}`);
      setEliminar(null);
      setToast('Beneficiario eliminado permanentemente.');
      limpiarCache(); cargar(true); cargarStatsDetalle();
    } catch (e) {
      setErrorEliminar(e?.response?.data?.mensaje || 'No se pudo eliminar el beneficiario.');
    } finally {
      setEliminando(false);
    }
  };

  const handleGuardadoEdicion = () => {
    setEditando(null);
    setToast('Beneficiario actualizado correctamente');
    limpiarCache(); cargar(true); cargarStatsDetalle();
  };

  const handleBeneficiarioCreado = () => {
    setCreando(false);
    setToast('Beneficiario inscrito correctamente');
    limpiarCache(); cargar(true); cargarStatsDetalle();
  };

  const exportarExcel = async () => {
    setExportando(true);
    setToast('Preparando exportación completa…');
    try {
      const { data } = await apiClient.get('/api/beneficiarios', {
        params: { pagina: 1, porPagina: 9999, estado: 'todos', tipo },
      });
      const todos = data.data;
      if (!todos.length) { setToast('No hay datos para exportar'); return; }

      const encabezados = [
        'NOMBRE','F. NACIMIENTO','TIPO DOC.','N° DOCUMENTO',
        'EDAD','EPS','T. CAMISA','T. PANTALÓN','T. ZAPATOS',
        'ALERGIA','DESC. ALERGIA','OBS. SALUD',
        'ACUDIENTE','PARENTESCO','WHATSAPP','DIRECCIÓN',
        'ESTADO','F. INSCRIPCIÓN',
      ];
      const filas = todos.map(ins => [
        ins.nombreMenor        || '—', ins.fechaNacimiento  || '—',
        ins.tipoDocumento      || '—', ins.numeroDocumento  || '—',
        calcularEdad(ins.fechaNacimiento),
        ins.eps                || '—', ins.tallaCamisa      || '—',
        ins.tallaPantalon      || '—', ins.tallaZapatos     || '—',
        ins.tieneAlergia === 'si' ? 'Sí' : 'No',
        ins.descripcionAlergia || '—', ins.observacionesSalud || '—',
        ins.nombreAcudiente    || '—', ins.parentesco       || '—',
        ins.whatsapp           || '—', ins.direccion        || '—',
        ins.activo ? 'Activo' : 'Baja',
        ins.createdAt ? new Date(ins.createdAt).toLocaleDateString('es-CO') : '—',
      ]);

      exportarExcel(`beneficiarios_${new Date().toISOString().slice(0, 10)}`, [{
        nombre: 'Beneficiarios',
        filas: [encabezados, ...filas],
        cols: [30,15,14,18,10,20,10,11,10,10,30,30,30,14,18,30,12,16],
      }]);
      setToast(`${todos.length} registros exportados`);
    } catch { setToast('Error al generar el Excel. Intenta de nuevo.'); }
    finally  { setExportando(false); }
  };

  const totalPaginas = Math.ceil(total / POR_PAGINA);
  const TABS = [
    { value: 'activos', label: `Activos (${stats.activos})` },
    { value: 'baja',    label: `Baja (${stats.baja})` },
    { value: 'todos',   label: `Todos (${stats.total})` },
  ];

  const handleImportado = () => {
    limpiarCache(); cargar(true); cargarStatsDetalle();
  };

  return {
    esAdmin,
    inscripciones, total, pagina, setPagina, totalPaginas, TABS,
    buscar, setBuscar,
    estado, setEstado,
    filtrosOpen, setFiltrosOpen,
    fGenero, setFGenero, fEdadMin, setFEdadMin, fEdadMax, setFEdadMax,
    fEps, setFEps, fAlergia, setFAlergia,
    hayFiltrosAvanzados, limpiarFiltros,
    cargando, error, actualizando,
    toast, setToast,
    exportando, exportarExcel,
    stats, statsDetalle, cargandoStats,
    modalStats, setModalStats,
    seleccionada, setSeleccionada,
    editando, setEditando,
    creando, setCreando,
    idBaja, setIdBaja, motivoBaja, setMotivoBaja, procesandoBaja,
    importDialog, setImportDialog,
    eliminar, setEliminar, eliminando, errorEliminar, setErrorEliminar,
    handleDarDeBaja, handleReactivar,
    handleGuardadoEdicion, handleBeneficiarioCreado, handleEliminarPermanente,
    handleImportado,
    cargar, cargarStatsDetalle,
  };
}
