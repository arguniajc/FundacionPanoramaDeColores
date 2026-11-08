import { useState, useEffect, useCallback } from 'react';
import { useTheme, alpha } from '@mui/material/styles';
import { useConfirm } from '@/shared/components/useConfirm';
import { actividadesRepository }  from '@/infrastructure/repositories/actividadesRepository';
import { sedesRepository }        from '@/infrastructure/repositories/sedesRepository';
import usePermisos                from '@/shared/hooks/usePermisos';
import { BRAND_COLOR }            from '@/shared/constants/brand';
import { useToast } from '@/shared/context/useToast';
import { mensajeErrorApi }        from '@/shared/utils/mensajeErrorApi';
import { fechaLocalISO } from '@/shared/utils/fecha';
import { exportarExcel } from '@/shared/utils/exportarExcel';

const COLOR = BRAND_COLOR;

export const ESTADOS = [
  { value: 'programada', label: 'Programada', color: 'info'    },
  { value: 'en_curso',   label: 'En curso',   color: 'warning' },
  { value: 'realizada',  label: 'Realizada',  color: 'success' },
  { value: 'cancelada',  label: 'Cancelada',  color: 'error'   },
];

const COLORES_PROGRAMA = [
  COLOR, '#1976d2', '#388e3c', '#f57c00', '#c62828', '#00838f', '#6a1b9a',
];

// Expande los horarios recurrentes en eventos del calendario para un rango dado,
// respetando las fechas de vigencia configuradas en cada horario.
function expandirHorarios(horarios, start, end, estilo) {
  const eventos = [];
  for (const h of horarios) {
    if (!h.activo) continue;
    const vigDesde = h.fechaInicioVigencia ? new Date(h.fechaInicioVigencia + 'T00:00:00') : null;
    const vigHasta = h.fechaFinVigencia    ? new Date(h.fechaFinVigencia    + 'T23:59:59') : null;
    const desde = vigDesde && vigDesde > start ? vigDesde : new Date(start);
    const hasta = vigHasta && vigHasta < end   ? vigHasta : new Date(end);
    if (desde > hasta) continue;
    const cur = new Date(desde);
    cur.setHours(0, 0, 0, 0);
    while (cur <= hasta) {
      if (cur.getDay() === h.diaSemana) {
        const fecha = fechaLocalISO(cur); // día local del calendario, no UTC
        eventos.push({
          id:              `horario-${h.id}-${fecha}`,
          title:           h.programaNombre,
          start:           `${fecha}T${h.horaInicio}`,
          end:             `${fecha}T${h.horaFin}`,
          backgroundColor: estilo.fondo,
          borderColor:     estilo.borde,
          textColor:       estilo.borde,
          extendedProps:   { tipo: 'horario', horario: h },
        });
      }
      cur.setDate(cur.getDate() + 1);
    }
  }
  return eventos;
}

export function useActividadesPage() {
  const { puedo } = usePermisos();
  const confirm   = useConfirm();
  const toast     = useToast();
  const theme     = useTheme();
  // Sesiones recurrentes del calendario: fondo suave que se adapta al modo claro/oscuro
  const estiloHorario = theme.palette.mode === 'dark'
    ? { fondo: alpha(theme.palette.primary.main, 0.18), borde: theme.palette.primary.main }
    : { fondo: '#e8def8', borde: COLOR };

  const [tab,             setTab]             = useState(0);
  const [actividades,     setActividades]     = useState([]);
  const [horarios,        setHorarios]        = useState([]);
  const [programas,       setProgramas]       = useState([]);
  const [nuevaOpen,       setNuevaOpen]       = useState(false);
  const [fechaInicialSug, setFechaInicialSug] = useState('');
  const [editDialogOpen,  setEditDialogOpen]  = useState(false);
  const [editando,        setEditando]        = useState(null);
  const [asistenciaOpen,  setAsistenciaOpen]  = useState(false);
  const [actividadSel,    setActividadSel]    = useState(null);
  const [rangoCalendario, setRangoCalendario] = useState(null);
  const [mesCalendario,   setMesCalendario]   = useState(null);
  const [ctxMenu,         setCtxMenu]         = useState(null);

  const abrirCtxMenu  = (e, actividad) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, actividad }); };
  const cerrarCtxMenu = () => setCtxMenu(null);

  useEffect(() => {
    sedesRepository.listar()
      .then(({ data }) => {
        setProgramas(data.flatMap(s => (s.programas ?? []).map(p => ({
          id: p.id, nombre: `${s.nombre} — ${p.nombre}`,
        }))));
      })
      .catch(() => { /* opcional: sin catálogo de programas el calendario sigue funcionando */ });
  }, []);

  const cargarHorarios = useCallback(async () => {
    try {
      const { data } = await actividadesRepository.listarHorarios();
      setHorarios(data);
    } catch (e) { toast(mensajeErrorApi(e, { accion: 'cargar los horarios' }), 'error'); }
  }, [toast]);

  // La carga es asíncrona: se lanza dentro de una función async para no llamar setState de forma síncrona en el efecto
  useEffect(() => { (async () => { await cargarHorarios(); })(); }, [cargarHorarios]);

  const cargar = useCallback(async (info) => {
    try {
      const fecha = info?.view?.currentStart ?? info?.start ?? new Date();
      const { data } = await actividadesRepository.listar({
        mes:  fecha.getMonth() + 1,
        anio: fecha.getFullYear(),
      });
      setActividades(data);
    } catch (e) { toast(mensajeErrorApi(e, { accion: 'cargar las actividades' }), 'error'); }
  }, [toast]);

  // La carga es asíncrona: se lanza dentro de una función async para no llamar setState de forma síncrona en el efecto
  useEffect(() => { (async () => { await cargar(); })(); }, [cargar]);

  const eventosUnicos = actividades.flatMap((a, i) => {
    const color = COLORES_PROGRAMA[i % COLORES_PROGRAMA.length];
    const base = [{
      id: `act-${a.id}`, title: a.titulo,
      start: a.fechaInicio, end: a.fechaFin ?? undefined,
      backgroundColor: color, borderColor: color,
      extendedProps: { tipo: 'actividad', ...a },
    }];
    for (const dia of (a.diasAdicionales ?? [])) {
      base.push({
        id: `act-${a.id}-dia-${dia.id}`, title: a.titulo,
        start: `${dia.fecha}T${dia.horaInicio}`, end: `${dia.fecha}T${dia.horaFin}`,
        backgroundColor: color, borderColor: color,
        extendedProps: { tipo: 'actividad', ...a },
      });
    }
    return base;
  });

  const eventos = [
    ...eventosUnicos,
    ...(rangoCalendario ? expandirHorarios(horarios, rangoCalendario.start, rangoCalendario.end, estiloHorario) : []),
  ];

  const abrirNueva  = (dateInfo) => {
    setFechaInicialSug(dateInfo?.dateStr ? `${dateInfo.dateStr}T08:00` : new Date().toISOString().slice(0, 16));
    setNuevaOpen(true);
  };
  const abrirEditar = (a) => { setEditando(a); setEditDialogOpen(true); };

  const eliminar = async (id) => {
    if (!await confirm('¿Eliminar esta actividad?')) return;
    try { await actividadesRepository.eliminar(id); cargar(); }
    catch (e) { toast(mensajeErrorApi(e, { accion: 'eliminar la actividad' }), 'error'); }
  };

  // Exporta las actividades del mes que muestra el calendario: es el filtro actual y la API ya
  // devuelve todas las del mes (este listado no se pagina porque el calendario las necesita todas)
  const [exportando, setExportando] = useState(false);
  const exportar = async () => {
    const fecha = mesCalendario ?? new Date();
    const etiquetaMes = fecha.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
    if (!actividades.length) { toast(`No hay actividades en ${etiquetaMes} para exportar.`, 'info'); return; }
    setExportando(true);
    const fmt = (iso) => (iso ? new Date(iso).toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }) : '');
    try {
      const ok = await exportarExcel(`actividades_${fechaLocalISO(fecha).slice(0, 7)}`, [{
        nombre: 'Actividades',
        filas: [
          ['Actividad', 'Programa', 'Inicio', 'Fin', 'Lugar', 'Estado', 'Personas registradas', 'Días adicionales', 'Descripción'],
          ...actividades.map(a => [
            a.titulo,
            a.programaNombre ?? 'Sin programa',
            fmt(a.fechaInicio),
            fmt(a.fechaFin),
            a.lugar ?? '',
            ESTADOS.find(e => e.value === a.estado)?.label ?? a.estado,
            a.totalInscritos ?? 0,
            (a.diasAdicionales ?? []).map(d => `${d.fecha} ${d.horaInicio}–${d.horaFin}`).join('; '),
            a.descripcion ?? '',
          ]),
        ],
        cols: [34, 28, 18, 18, 24, 12, 12, 30, 40],
      }]);
      if (ok) toast(`${actividades.length} actividades de ${etiquetaMes} exportadas.`);
    } finally { setExportando(false); }
  };

  const cancelar = async (a) => {
    if (!await confirm(`¿Marcar "${a.titulo}" como cancelada?`)) return;
    try {
      await actividadesRepository.actualizar(a.id, {
        titulo: a.titulo, descripcion: a.descripcion ?? null,
        programaId: a.programaId ?? null, lugar: a.lugar ?? null,
        fechaInicio: a.fechaInicio, fechaFin: a.fechaFin ?? null,
        estado: 'cancelada',
        diasAdicionales: (a.diasAdicionales ?? []).map(d => ({
          fecha: d.fecha, horaInicio: d.horaInicio, horaFin: d.horaFin,
        })),
      });
      cargar();
    } catch (e) { toast(mensajeErrorApi(e, { accion: 'cancelar la actividad' }), 'error'); }
  };

  return {
    puedo,
    tab, setTab,
    actividades, programas,
    nuevaOpen, setNuevaOpen, fechaInicialSug,
    editDialogOpen, setEditDialogOpen, editando,
    asistenciaOpen, setAsistenciaOpen, actividadSel, setActividadSel,
    rangoCalendario, setRangoCalendario,
    mesCalendario, setMesCalendario,
    ctxMenu, abrirCtxMenu, cerrarCtxMenu,
    abrirNueva, abrirEditar, eliminar, cancelar,
    exportar, exportando,
    cargar, cargarHorarios,
    eventos,
  };
}
