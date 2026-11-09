// Asistente para crear una nueva inscripción: beneficiario → programa → formulario dinámico.
// - Lo escrito en el formulario se guarda como borrador (sessionStorage) por beneficiario + programa
//   y se recupera al volver a elegirlos; se borra al inscribir.
// - Cerrar con datos sin guardar pide confirmación; mientras guarda no se puede cerrar.
import { useState, useEffect, useRef } from 'react';
import {
  Alert, Autocomplete, Box, Button, CircularProgress,
  DialogContent, DialogTitle,
  Grid, Step, StepLabel, Stepper, TextField, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import CheckIcon from '@mui/icons-material/Check';
import Dialog from '@/shared/components/DialogResponsive';
import { AccionesDialogo, ErrorServidor } from '@/shared/components/form/FormControles';
import { useCerrarConCambios } from '@/shared/hooks/useCerrarConCambios';
import { useAutoFocus } from '@/shared/hooks/useAutoFocus';
import { beneficiariosRepository } from '@/infrastructure/repositories/beneficiariosRepository';
import { sedesRepository }         from '@/infrastructure/repositories/sedesRepository';
import { inscripcionesRepository } from '@/infrastructure/repositories/inscripcionesRepository';
import { mensajeErrorApi }         from '@/shared/utils/mensajeErrorApi';
import ResumenErrores              from '@/shared/components/ResumenErrores';
import IndicadorCupo               from '@/shared/components/IndicadorCupo';
import { colorEstado }             from '@/shared/theme/paleta';
import { estadoCupo }              from '@/shared/utils/cupos';
import { CampoInput, FirmaAutorizacion, SeccionHeader } from './campos';
import { COLOR, agruparPorSeccion, calcEdad } from './camposUtils';
import {
  ETIQUETAS_FIRMA, erroresCamposDinamicos, erroresFirma, esPanelResponsable, faltantesPanel,
} from './validacionFormulario';
import {
  borrarBorrador, guardarBorrador, hayContenidoPropio, leerBorrador,
} from './borradorInscripcion';

// Nombres de los errores que no son campos del programa, para el resumen.
const ETIQUETAS_PASO = {
  beneficiario:    'Beneficiario',
  programa:        'Programa',
  __responsable__: 'Responsable mayor de edad',
  ...ETIQUETAS_FIRMA,
};

const PASOS = ['Beneficiario', 'Programa', 'Formulario'];

/** Por qué no se puede elegir un programa (null si se puede). */
function motivoBloqueo(programa, inscritoActivo) {
  if (inscritoActivo) return {
    etiqueta: 'Ya inscrito',
    explicacion: 'Este beneficiario ya tiene una inscripción activa en este programa.',
  };
  if (estadoCupo(programa).lleno) return {
    etiqueta: 'Cupo lleno',
    explicacion: 'No admite más inscripciones activas. Da de baja una inscripción o aumenta el cupo del programa.',
  };
  return null;
}

/**
 * Tarjeta de programa seleccionable (role="radio": Tab llega a ella, Enter o Espacio la elige).
 * Si el cupo está lleno o el beneficiario ya está inscrito queda aria-disabled, con la explicación
 * enlazada por aria-describedby; sigue siendo enfocable para que el lector de pantalla la anuncie.
 */
function TarjetaPrograma({ programa: p, seleccionada, onElegir, bloqueo }) {
  const deshabilitada = !!bloqueo;
  const idExplicacion = `programa-${p.id}-bloqueo`;
  const elegir = () => { if (!deshabilitada) onElegir(); };
  const elegirConTeclado = e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(); }
  };
  return (
    <Box role="radio" aria-checked={seleccionada} tabIndex={0}
      aria-disabled={deshabilitada || undefined}
      aria-describedby={deshabilitada ? idExplicacion : undefined}
      onClick={elegir} onKeyDown={elegirConTeclado}
      sx={{
        border: '2px solid', borderColor: seleccionada ? COLOR : 'divider',
        borderRadius: 2, p: 1.5, cursor: deshabilitada ? 'not-allowed' : 'pointer', height: '100%',
        bgcolor: (t) => (deshabilitada ? t.palette.action.disabledBackground
          : seleccionada ? alpha(t.palette.primary.main, 0.08) : t.palette.background.paper),
        transition: 'all 0.15s',
        '&:hover': deshabilitada ? {} : { borderColor: COLOR, bgcolor: (t) => alpha(t.palette.primary.main, 0.08) },
        '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }}>
      {seleccionada && <CheckIcon aria-hidden sx={{ float: 'right', color: COLOR, fontSize: 20 }} />}
      {deshabilitada && <ChipEstado etiqueta={bloqueo.etiqueta} tono={bloqueo.etiqueta === 'Cupo lleno' ? 'error' : 'info'} />}
      <Typography sx={{ fontWeight: 700, color: deshabilitada ? 'text.secondary' : COLOR }}>{p.nombre}</Typography>
      <Typography sx={{ color: 'text.secondary', display: 'block' }} variant="caption">{p.nombreSede}</Typography>
      <IndicadorCupo programa={p} avisarLleno={false} sx={{ mt: 0.75 }} />
      {deshabilitada && (
        <Typography id={idExplicacion} variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
          {bloqueo.explicacion}
        </Typography>
      )}
    </Box>
  );
}

/** Etiqueta pequeña con los colores semánticos de la paleta. */
function ChipEstado({ etiqueta, tono }) {
  const theme = useTheme();
  const { fondo, texto } = colorEstado(tono, theme.palette.mode);
  return (
    <Box component="span" sx={{
      float: 'right', ml: 1, px: 1, py: 0.25, borderRadius: 1, bgcolor: fondo, color: texto,
      fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {etiqueta}
    </Box>
  );
}

export function NuevaInscripcionDialog({ onCerrar, onCreada }) {
  const [paso,           setPaso]           = useState(0);
  const [beneficiarios,  setBeneficiarios]  = useState([]);
  const [buscando,       setBuscando]       = useState(false);
  const [busqueda,       setBusqueda]       = useState('');
  const [selBenef,       setSelBenef]       = useState(null);
  const [programas,      setProgramas]      = useState([]);
  const [selPrograma,    setSelPrograma]    = useState(null);
  const [programasInscrito, setProgramasInscrito] = useState(() => new Set()); // ids con inscripción activa del beneficiario
  const [campos,         setCampos]         = useState([]);
  const [cargandoCampos, setCargandoCampos] = useState(false);
  const [datos,          setDatos]          = useState({});
  const [panelActivo,    setPanelActivo]    = useState({});
  const [observaciones,  setObservaciones]  = useState('');
  // Valores con los que arranca el formulario del programa (auto-completados): base del borrador
  const [inicio,         setInicio]         = useState({ datos: {}, panelActivo: {}, clave: '' });
  const [recuperado,     setRecuperado]     = useState(false); // se restauró un borrador
  const [guardando,      setGuardando]      = useState(false);
  const [error,          setError]          = useState('');    // error al inscribir
  const [errorCarga,     setErrorCarga]     = useState('');    // error al buscar / cargar
  const [intentado,      setIntentado]      = useState(false); // ya se intentó avanzar en este paso
  const [verResumen,     setVerResumen]     = useState(false);
  const autoFocus = useAutoFocus();
  const inscrita  = useRef(false); // tras inscribir ya no se vuelve a guardar el borrador

  const tienePadreMadre = campos.some(c => c.tipo === 'datos_padre') && campos.some(c => c.tipo === 'datos_madre');
  const claveActual = selBenef && selPrograma ? `${selBenef.id}:${selPrograma.id}` : '';
  // El formulario cargado corresponde al beneficiario + programa elegidos
  const formularioListo = !!claveActual && inicio.clave === claveActual && !cargandoCampos;

  const contenidoPropio = formularioListo && hayContenidoPropio(datos, inicio.datos, observaciones);
  // Cualquier avance en el asistente cuenta como cambio: cerrar pregunta antes de descartar
  const hayCambios = !!selBenef || !!selPrograma || busqueda.trim() !== '' || contenidoPropio;
  const { confirmarCierre } = useCerrarConCambios({ hayCambios, bloqueado: guardando, onCerrar });

  useEffect(() => {
    if (busqueda.length < 2) { setBeneficiarios([]); return; }
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const { data } = await beneficiariosRepository.listar({ buscar: busqueda, porPagina: 20, pagina: 1, estado: 'activos' });
        setBeneficiarios(data.data ?? []);
      } catch (err) {
        setBeneficiarios([]);
        setErrorCarga(mensajeErrorApi(err, { accion: 'buscar beneficiarios' }));
      }
      finally { setBuscando(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  // Programas activos con su ocupación (inscritosActivos); se recarga si el servidor avisa cupo lleno
  const cargarProgramas = () =>
    sedesRepository.listar({ soloActivas: true }).then(({ data }) => {
      const progs = data.flatMap(s =>
        (s.programas ?? []).filter(p => p.activo).map(p => ({ ...p, nombreSede: s.nombre }))
      );
      setProgramas(progs);
    }).catch(err => setErrorCarga(mensajeErrorApi(err, { accion: 'cargar los programas' })));

  useEffect(() => { cargarProgramas(); }, []);

  // Programas donde el beneficiario elegido ya está inscrito activo (ayuda visual: el servidor
  // igual lo valida al guardar, así que un fallo aquí no bloquea nada)
  useEffect(() => {
    setProgramasInscrito(new Set());
    if (!selBenef) return;
    let vigente = true;
    inscripcionesRepository.listar({ beneficiarioId: selBenef.id, estado: 'activa', pagina: 1, porPagina: 100 })
      .then(({ data }) => {
        if (!vigente) return;
        const lista = Array.isArray(data) ? data : (data?.data ?? []);
        setProgramasInscrito(new Set(lista
          .filter(i => i.beneficiarioId === selBenef.id && (i.activo ?? i.estado === 'activa'))
          .map(i => i.programaId)));
      })
      .catch(() => {});
    return () => { vigente = false; };
  }, [selBenef]);

  // Con los datos más recientes del programa (la lista se recarga si el servidor avisa cupo lleno)
  const bloqueoDe = p => motivoBloqueo(programas.find(x => x.id === p.id) ?? p, programasInscrito.has(p.id));
  const bloqueoSeleccionado = selPrograma ? bloqueoDe(selPrograma) : null;

  // Carga los campos del programa, arma los valores iniciales y recupera el borrador si lo hay
  useEffect(() => {
    if (!selPrograma) { setCampos([]); return; }
    let vigente = true;
    setCargandoCampos(true);
    setRecuperado(false);
    sedesRepository.listarCampos(selPrograma.id).then(({ data }) => {
      if (!vigente) return;
      setCampos(data);
      const auto = {};
      const init = {};
      for (const c of data) {
        if (c.tipo === 'edad' && selBenef?.fechaNacimiento) {
          const e = calcEdad(selBenef.fechaNacimiento);
          if (e !== null) auto[c.id] = String(e);
        }
        if (c.tipo === 'fecha_nac' && selBenef?.fechaNacimiento)
          auto[c.id] = selBenef.fechaNacimiento;
        if (c.tipo === 'datos_padre' || c.tipo === 'datos_madre') init[c.id] = true;
        if (c.tipo === 'datos_tutor') init[c.id] = false;
        // Sí/No empieza en No: así un interruptor obligatorio cuenta como respondido sin tocarlo
        if (c.tipo === 'boolean') auto[c.id] = 'false';
      }
      const borrador = selBenef ? leerBorrador(selBenef.id, selPrograma.id) : null;
      if (borrador && hayContenidoPropio(borrador.datos, auto, borrador.observaciones)) {
        setDatos({ ...auto, ...borrador.datos });
        setPanelActivo({ ...init, ...(borrador.panelActivo ?? {}) });
        setObservaciones(borrador.observaciones ?? '');
        setRecuperado(true);
      } else {
        setDatos(auto);
        setPanelActivo(init);
      }
      setInicio({ datos: auto, panelActivo: init, clave: selBenef ? `${selBenef.id}:${selPrograma.id}` : '' });
    }).catch(err => { if (vigente) setErrorCarga(mensajeErrorApi(err, { accion: 'cargar el formulario del programa' })); })
      .finally(() => { if (vigente) setCargandoCampos(false); });
    return () => { vigente = false; };
  }, [selPrograma, selBenef]);

  // Guarda el borrador mientras se escribe (solo si hay algo escrito por la persona)
  useEffect(() => {
    if (!formularioListo || guardando || inscrita.current) return;
    if (hayContenidoPropio(datos, inicio.datos, observaciones))
      guardarBorrador(selBenef.id, selPrograma.id, { datos, panelActivo, observaciones });
    else
      borrarBorrador(selBenef.id, selPrograma.id);
  }, [datos, panelActivo, observaciones, formularioListo, guardando, inicio, selBenef, selPrograma]);

  const empezarDeCero = () => {
    if (selBenef && selPrograma) borrarBorrador(selBenef.id, selPrograma.id);
    setDatos(inicio.datos);
    setPanelActivo(inicio.panelActivo);
    setObservaciones('');
    setRecuperado(false);
    setIntentado(false);
    setVerResumen(false);
  };

  // Tutor visible SOLO en estos casos:
  // 1. Padre y madre ambos desactivados.
  // 2. Todos los padres/madres activos tienen fecha de nacimiento Y son menores de 18.
  // En cualquier otro caso (sin fecha, o al menos uno mayor) → tutor oculto.
  useEffect(() => {
    if (campos.length === 0) return;
    const padreMadre = campos.filter(c => c.tipo === 'datos_padre' || c.tipo === 'datos_madre');
    const tutores    = campos.filter(c => c.tipo === 'datos_tutor');
    if (tutores.length === 0 || padreMadre.length === 0) return;

    const activosPM = padreMadre.filter(c => panelActivo[c.id] !== false);

    let mostrarTutor;
    if (activosPM.length === 0) {
      mostrarTutor = true; // caso 1: todos desactivados
    } else {
      // casos 2-4: solo si TODOS los activos tienen fecha confirmada y son < 18
      mostrarTutor = activosPM.every(c => {
        try { const pd = JSON.parse(datos[c.id] ?? '{}'); const e = calcEdad(pd.fechaNac); return e !== null && e < 18; }
        catch { return false; }
      });
    }

    setPanelActivo(prev => {
      let changed = false;
      const next = { ...prev };
      tutores.forEach(t => {
        const estaActivo = next[t.id] !== false;
        if (estaActivo !== mostrarTutor) { next[t.id] = mostrarTutor; changed = true; }
      });
      return changed ? next : prev;
    });
  }, [datos, campos, panelActivo]);

  const handleTogglePanel = (campo) => {
    const nuevoActivo = !panelActivo[campo.id];
    const next = { ...panelActivo, [campo.id]: nuevoActivo };
    if (!nuevoActivo) {
      setDatos(prev => { const n = { ...prev }; delete n[campo.id]; return n; });
      const padresMadre = campos.filter(c => c.tipo === 'datos_padre' || c.tipo === 'datos_madre');
      const todosApagados = padresMadre.every(c => (c.id === campo.id ? true : !next[c.id]));
      if (todosApagados) campos.filter(c => c.tipo === 'datos_tutor').forEach(c => { next[c.id] = true; });
    }
    setPanelActivo(next);
  };

  // Errores del paso actual: { clave: mensaje }. Las claves numéricas son los campos del programa.
  const erroresPaso = () => {
    if (paso === 0) return selBenef ? {} : {
      beneficiario: 'Busca y selecciona el beneficiario: escribe al menos 2 letras del nombre y elígelo de la lista. Ejemplo: Ana',
    };
    if (paso === 1) {
      if (!selPrograma) return { programa: 'Selecciona el programa haciendo clic en su tarjeta.' };
      // Elegido antes de cambiar de beneficiario o de recargar los cupos
      if (bloqueoSeleccionado) return {
        programa: `${selPrograma.nombre}: ${bloqueoSeleccionado.etiqueta.toLowerCase()}. ${bloqueoSeleccionado.explicacion} Elige otro programa.`,
      };
      return {};
    }
    const errores = { ...erroresCamposDinamicos(campos, datos, panelActivo), ...erroresFirma(datos) };
    // Al menos un responsable activo, completo y mayor de edad
    const panelesTutor = campos.filter(c => esPanelResponsable(c.tipo));
    if (panelesTutor.length > 0) {
      const algunoAdultoCompleto = panelesTutor.some(c => {
        if (panelActivo[c.id] === false) return false;
        try {
          const pd = JSON.parse(datos[c.id] ?? '{}');
          const edad = calcEdad(pd.fechaNac);
          return faltantesPanel(pd, c.tipo).length === 0 && edad !== null && edad >= 18;
        } catch { return false; }
      });
      if (!algunoAdultoCompleto)
        errores.__responsable__ = 'Debe haber al menos un padre, madre o tutor mayor de 18 años con todos sus datos completos. Revisa la fecha de nacimiento (ejemplo: 20/05/1985).';
    }
    return errores;
  };

  const errores    = erroresPaso();
  const hayErrores = Object.keys(errores).length > 0;
  // Los mensajes se muestran en los campos solo después de intentar avanzar o guardar.
  const errCampo   = clave => (intentado ? (errores[clave] ?? '') : '');
  const etiquetaError = clave =>
    ETIQUETAS_PASO[clave] ?? campos.find(c => String(c.id) === clave)?.etiqueta ?? clave;

  /** Valida el paso actual: si falta algo marca los campos, muestra el resumen y devuelve false. */
  const validarPaso = () => {
    if (!hayErrores) { setIntentado(false); setVerResumen(false); return true; }
    setIntentado(true); setVerResumen(true);
    return false;
  };

  const cambiarPaso = (delta) => {
    if (delta > 0 && !validarPaso()) return;
    setIntentado(false); setVerResumen(false);
    setPaso(p => p + delta);
  };

  const handleSubmit = async () => {
    if (guardando || !formularioListo || !validarPaso()) return;
    setGuardando(true);
    setError('');
    try {
      const result = await inscripcionesRepository.crear({
        beneficiarioId: selBenef.id,
        programaId:     selPrograma.id,
        datos:          JSON.stringify(datos),
        observaciones:  observaciones.trim() || null,
      });
      inscrita.current = true;
      borrarBorrador(selBenef.id, selPrograma.id);
      onCreada(result.data); // la página muestra "<beneficiario> inscrito en <programa>"
    } catch (err) {
      // 409: cupo lleno o ya inscrito; se actualizan los cupos para que al volver se vea el estado real
      if (err?.response?.status === 409) cargarProgramas();
      setError(mensajeErrorApi(err, {
        accion: 'guardar la inscripción',
        conflicto: 'El beneficiario ya está inscrito en este programa.',
      }));
    } finally {
      setGuardando(false);
    }
  };

  // Enter en un campo: avanza de paso o inscribe en el último
  const enviar = () => { if (paso < 2) cambiarPaso(1); else handleSubmit(); };
  // No se avanza ni se inscribe mientras se cargan los campos del programa elegido
  const esperandoCampos = paso >= 1 && !!selPrograma && cargandoCampos;

  return (
    <Dialog open onClose={confirmarCierre} alEnviar={enviar} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { borderRadius: { xs: 0, sm: 3 } } } }}>
      <DialogTitle sx={{ bgcolor: COLOR, color: 'white', fontWeight: 700 }}>
        Nueva Inscripción
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        <Stepper activeStep={paso} sx={{ mb: 3 }}>
          {PASOS.map(label => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {paso === 0 && (
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 2 }}>Busca el beneficiario</Typography>
            <Autocomplete
              options={beneficiarios}
              loading={buscando}
              loadingText="Buscando..."
              value={selBenef}
              onChange={(_, v) => setSelBenef(v)}
              inputValue={busqueda}
              onInputChange={(_, v) => setBusqueda(v)}
              getOptionLabel={o => o.nombreMenor ?? o.nombre ?? ''}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              noOptionsText={busqueda.length < 2 ? 'Escribe al menos 2 caracteres' : 'Sin resultados'}
              renderOption={(props, o) => (
                <li {...props} key={o.id}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }} variant="body2">{o.nombreMenor ?? o.nombre}</Typography>
                    <Typography sx={{ color: 'text.secondary' }} variant="caption">
                      {o.tipoDocumento} {o.numeroDocumento ?? 'Sin documento'}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField {...params} label="Buscar por nombre" size="small" autoFocus={autoFocus}
                  error={!!errCampo('beneficiario')} helperText={errCampo('beneficiario') || undefined} />
              )}
            />
            {selBenef && (
              <Box sx={{ mt: 2, p: 2, bgcolor: (t) => alpha(t.palette.primary.main, 0.08), borderRadius: 2, border: '1px solid', borderColor: (t) => alpha(t.palette.primary.main, 0.3) }}>
                <Typography sx={{ fontWeight: 700 }}>{selBenef.nombreMenor ?? selBenef.nombre}</Typography>
                <Typography sx={{ color: 'text.secondary' }} variant="caption">
                  {selBenef.tipoDocumento} · {selBenef.numeroDocumento ?? 'Sin documento'}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {paso === 1 && (
          <Box>
            <Typography id="nueva-inscripcion-programa" sx={{ fontWeight: 700, mb: errCampo('programa') ? 0.5 : 2 }}>
              Selecciona el programa
            </Typography>
            {errCampo('programa') && (
              <Typography sx={{ display: 'block', mb: 1.5 }} variant="caption" color="error">{errCampo('programa')}</Typography>
            )}
            {programas.length === 0 ? (
              <Alert severity="warning">No hay programas activos disponibles.</Alert>
            ) : (
              <Grid container spacing={1.5} role="radiogroup" aria-labelledby="nueva-inscripcion-programa">
                {programas.map(p => (
                  <Grid key={p.id} size={{ xs: 12, sm: 6 }}>
                    <TarjetaPrograma programa={p} seleccionada={selPrograma?.id === p.id}
                      bloqueo={bloqueoDe(p)} onElegir={() => setSelPrograma(p)} />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {paso === 2 && (
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 2 }}>
              Completa el formulario de {selPrograma?.nombre}
            </Typography>
            {recuperado && !cargandoCampos && (
              <Alert severity="info" sx={{ mb: 2 }}
                action={<Button color="inherit" size="small" onClick={empezarDeCero}>Empezar de cero</Button>}>
                Recuperamos lo que habías escrito para este beneficiario y programa.
              </Alert>
            )}
            {cargandoCampos ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress sx={{ color: COLOR }} aria-label="Cargando el formulario" />
              </Box>
            ) : campos.length === 0 ? (
              <Alert severity="info">
                Este programa no tiene campos adicionales. Puedes inscribir directamente.
              </Alert>
            ) : (
              <Grid container spacing={2.5}>
                {agruparPorSeccion(campos).map(({ seccion: sec, campos: grp }) => (
                  <Grid key={sec || '_root'} size={12} container spacing={2.5} sx={{ m: 0, p: 0 }}>
                    <SeccionHeader titulo={sec} />
                    {grp.map(c => {
                      const esPanel = c.tipo === 'datos_padre' || c.tipo === 'datos_madre' || c.tipo === 'datos_tutor';
                      const activo  = esPanel ? (panelActivo[c.id] !== false) : true;
                      if (c.tipo === 'datos_tutor' && !activo) return null;
                      return (
                        <Grid key={c.id} size={(c.tipo === 'document' || c.tipo === 'daterange' || c.tipo === 'firma' || c.tipo === 'documento_id' || c.tipo === 'grado_escolar' || esPanel) ? 12 : { xs: 12, sm: 6 }}>
                          <CampoInput
                            campo={c}
                            value={datos[c.id]}
                            onChange={v => setDatos(prev => ({ ...prev, [c.id]: v }))}
                            activo={esPanel ? activo : undefined}
                            onToggle={(c.tipo === 'datos_padre' || c.tipo === 'datos_madre') && tienePadreMadre ? () => handleTogglePanel(c) : undefined}
                            error={errCampo(String(c.id))}
                          />
                        </Grid>
                      );
                    })}
                  </Grid>
                ))}
                <Grid size={12}>
                  <TextField fullWidth size="small" label="Observaciones (opcional)"
                    multiline rows={2} value={observaciones}
                    onChange={e => setObservaciones(e.target.value)} />
                </Grid>
              </Grid>
            )}
            {!cargandoCampos && (
              <FirmaAutorizacion datos={datos} setDatos={setDatos}
                panelActivo={panelActivo} campos={campos}
                errores={intentado ? errores : {}}
                sx={{ mt: campos.length === 0 ? 0 : 1 }} />
            )}
          </Box>
        )}
      </DialogContent>

      <ResumenErrores visible={verResumen && hayErrores} errores={errores} etiqueta={etiquetaError}
        onClose={() => setVerResumen(false)} accion={paso < 2 ? 'continuar' : 'inscribir'} />
      <ErrorServidor mensaje={errorCarga} onClose={() => setErrorCarga('')} titulo="No se pudo cargar" />
      <ErrorServidor mensaje={error} onClose={() => setError('')} />
      <AccionesDialogo
        onCancelar={confirmarCierre}
        guardando={guardando}
        enviar
        textoGuardar={paso < 2 ? 'Siguiente' : 'Inscribir'}
        deshabilitado={esperandoCampos}
        anterior={paso > 0 ? { onClick: () => cambiarPaso(-1), texto: 'Atrás' } : undefined}
        sxGuardar={{ bgcolor: COLOR }}
      />
    </Dialog>
  );
}
