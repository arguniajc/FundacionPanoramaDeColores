import { useState, useEffect, useCallback } from 'react';
import { useConfirm }             from '@/shared/components/ConfirmDialog';
import { actividadesRepository }  from '@/infrastructure/repositories/actividadesRepository';
import { sedesRepository }        from '@/infrastructure/repositories/sedesRepository';
import usePermisos                from '@/shared/hooks/usePermisos';
import { BRAND_COLOR }            from '@/shared/constants/brand';

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
function expandirHorarios(horarios, start, end) {
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
        const fecha = cur.toISOString().slice(0, 10);
        eventos.push({
          id:              `horario-${h.id}-${fecha}`,
          title:           h.programaNombre,
          start:           `${fecha}T${h.horaInicio}`,
          end:             `${fecha}T${h.horaFin}`,
          backgroundColor: '#e8def8',
          borderColor:     COLOR,
          textColor:       COLOR,
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
      .catch(() => {});
  }, []);

  const cargarHorarios = useCallback(async () => {
    try {
      const { data } = await actividadesRepository.listarHorarios();
      setHorarios(data);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { cargarHorarios(); }, [cargarHorarios]);

  const cargar = useCallback(async (info) => {
    try {
      const fecha = info?.view?.currentStart ?? info?.start ?? new Date();
      const { data } = await actividadesRepository.listar({
        mes:  fecha.getMonth() + 1,
        anio: fecha.getFullYear(),
      });
      setActividades(data);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

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
    ...(rangoCalendario ? expandirHorarios(horarios, rangoCalendario.start, rangoCalendario.end) : []),
  ];

  const abrirNueva  = (dateInfo) => {
    setFechaInicialSug(dateInfo?.dateStr ? `${dateInfo.dateStr}T08:00` : new Date().toISOString().slice(0, 16));
    setNuevaOpen(true);
  };
  const abrirEditar = (a) => { setEditando(a); setEditDialogOpen(true); };

  const eliminar = async (id) => {
    if (!await confirm('¿Eliminar esta actividad?')) return;
    try { await actividadesRepository.eliminar(id); cargar(); } catch { /* silencioso */ }
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
    } catch { /* silencioso */ }
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
    cargar, cargarHorarios,
    eventos,
  };
}
