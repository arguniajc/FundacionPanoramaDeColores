// Stepper para crear una nueva inscripción: beneficiario → programa → formulario dinámico.
import { useState, useEffect } from 'react';
import {
  Alert, Autocomplete, Box, Button, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, Step, StepLabel, Stepper, TextField, Typography,
  useMediaQuery, useTheme,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { beneficiariosRepository } from '@/infrastructure/repositories/beneficiariosRepository';
import { sedesRepository }         from '@/infrastructure/repositories/sedesRepository';
import { inscripcionesRepository } from '@/infrastructure/repositories/inscripcionesRepository';
import { mensajeErrorApi }         from '@/shared/utils/mensajeErrorApi';
import ResumenErrores              from '@/shared/components/ResumenErrores';
import { CampoInput, FirmaAutorizacion, SeccionHeader } from './campos';
import { COLOR, agruparPorSeccion, calcEdad } from './camposUtils';
import {
  ETIQUETAS_FIRMA, erroresCamposDinamicos, erroresFirma, esPanelResponsable, faltantesPanel,
} from './validacionFormulario';

// Nombres de los errores que no son campos del programa, para el resumen.
const ETIQUETAS_PASO = {
  beneficiario:    'Beneficiario',
  programa:        'Programa',
  __responsable__: 'Responsable mayor de edad',
  ...ETIQUETAS_FIRMA,
};

export function NuevaInscripcionDialog({ onCerrar, onCreada }) {
  const [paso,           setPaso]           = useState(0);
  const [beneficiarios,  setBeneficiarios]  = useState([]);
  const [buscando,       setBuscando]       = useState(false);
  const [busqueda,       setBusqueda]       = useState('');
  const [selBenef,       setSelBenef]       = useState(null);
  const [programas,      setProgramas]      = useState([]);
  const [selPrograma,    setSelPrograma]    = useState(null);
  const [campos,         setCampos]         = useState([]);
  const [cargandoCampos, setCargandoCampos] = useState(false);
  const [datos,          setDatos]          = useState({});
  const [panelActivo,    setPanelActivo]    = useState({});
  const [observaciones,  setObservaciones]  = useState('');
  const [guardando,      setGuardando]      = useState(false);
  const [error,          setError]          = useState('');
  const [intentado,      setIntentado]      = useState(false); // ya se intentó avanzar en este paso
  const [verResumen,     setVerResumen]     = useState(false);
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const tienePadreMadre = campos.some(c => c.tipo === 'datos_padre') && campos.some(c => c.tipo === 'datos_madre');

  useEffect(() => {
    if (busqueda.length < 2) { setBeneficiarios([]); return; }
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const { data } = await beneficiariosRepository.listar({ buscar: busqueda, porPagina: 20, pagina: 1, estado: 'activos' });
        setBeneficiarios(data.data ?? []);
      } catch (err) {
        setBeneficiarios([]);
        setError(mensajeErrorApi(err, { accion: 'buscar beneficiarios' }));
      }
      finally { setBuscando(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    sedesRepository.listar({ soloActivas: true }).then(({ data }) => {
      const progs = data.flatMap(s =>
        (s.programas ?? []).filter(p => p.activo).map(p => ({ ...p, nombreSede: s.nombre }))
      );
      setProgramas(progs);
    }).catch(err => setError(mensajeErrorApi(err, { accion: 'cargar los programas' })));
  }, []);

  useEffect(() => {
    if (!selPrograma) { setCampos([]); return; }
    setCargandoCampos(true);
    sedesRepository.listarCampos(selPrograma.id).then(({ data }) => {
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
      setDatos(auto);
      setPanelActivo(init);
    }).catch(err => setError(mensajeErrorApi(err, { accion: 'cargar el formulario del programa' })))
      .finally(() => setCargandoCampos(false));
  }, [selPrograma, selBenef]);

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
    if (paso === 1) return selPrograma ? {} : {
      programa: 'Selecciona el programa haciendo clic en su tarjeta.',
    };
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
    if (guardando || !validarPaso()) return;
    setGuardando(true);
    setError('');
    try {
      const result = await inscripcionesRepository.crear({
        beneficiarioId: selBenef.id,
        programaId:     selPrograma.id,
        datos:          JSON.stringify(datos),
        observaciones:  observaciones.trim() || null,
      });
      onCreada(result.data);
    } catch (err) {
      setError(mensajeErrorApi(err, {
        accion: 'guardar la inscripción',
        conflicto: 'El beneficiario ya está inscrito en este programa.',
      }));
    } finally {
      setGuardando(false);
    }
  };

  const PASOS = ['Beneficiario', 'Programa', 'Formulario'];

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}>
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
            <Typography fontWeight={700} mb={2}>Busca el beneficiario</Typography>
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
                    <Typography variant="body2" fontWeight={700}>{o.nombreMenor ?? o.nombre}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {o.tipoDocumento} {o.numeroDocumento ?? 'Sin documento'}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField {...params} label="Buscar por nombre" size="small"
                  error={!!errCampo('beneficiario')} helperText={errCampo('beneficiario') || undefined} />
              )}
            />
            {selBenef && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f3f0ff', borderRadius: 2, border: '1px solid #d0c4f7' }}>
                <Typography fontWeight={700}>{selBenef.nombreMenor ?? selBenef.nombre}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {selBenef.tipoDocumento} · {selBenef.numeroDocumento ?? 'Sin documento'}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {paso === 1 && (
          <Box>
            <Typography fontWeight={700} mb={errCampo('programa') ? 0.5 : 2}>Selecciona el programa</Typography>
            {errCampo('programa') && (
              <Typography variant="caption" color="error" display="block" mb={1.5}>{errCampo('programa')}</Typography>
            )}
            {programas.length === 0 ? (
              <Alert severity="warning">No hay programas activos disponibles.</Alert>
            ) : (
              <Grid container spacing={1.5}>
                {programas.map(p => (
                  <Grid key={p.id} size={{ xs: 12, sm: 6 }}>
                    <Box onClick={() => setSelPrograma(p)} sx={{
                      border: `2px solid ${selPrograma?.id === p.id ? COLOR : '#e2d9f3'}`,
                      borderRadius: 2, p: 1.5, cursor: 'pointer',
                      bgcolor: selPrograma?.id === p.id ? '#f3f0ff' : '#fdfbff',
                      transition: 'all 0.15s',
                      '&:hover': { borderColor: COLOR, bgcolor: '#f3f0ff' },
                    }}>
                      <Typography fontWeight={700} color={COLOR}>{p.nombre}</Typography>
                      <Typography variant="caption" color="text.secondary">{p.nombreSede}</Typography>
                      {selPrograma?.id === p.id && (
                        <CheckIcon sx={{ float: 'right', color: COLOR, fontSize: 20 }} />
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {paso === 2 && (
          <Box>
            <Typography fontWeight={700} mb={2}>
              Completa el formulario de {selPrograma?.nombre}
            </Typography>
            {cargandoCampos ? (
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress sx={{ color: COLOR }} />
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
            <FirmaAutorizacion datos={datos} setDatos={setDatos}
              panelActivo={panelActivo} campos={campos}
              errores={intentado ? errores : {}}
              sx={{ mt: campos.length === 0 ? 0 : 1 }} />
          </Box>
        )}
      </DialogContent>

      <ResumenErrores visible={verResumen && hayErrores} errores={errores} etiqueta={etiquetaError}
        onClose={() => setVerResumen(false)} accion={paso < 2 ? 'continuar' : 'inscribir'} />
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mx: 3, mt: 1.5, mb: 0 }}>
          {error}
        </Alert>
      )}
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onCerrar} disabled={guardando}>Cancelar</Button>
        {paso > 0 && (
          <Button onClick={() => cambiarPaso(-1)} disabled={guardando}>Atrás</Button>
        )}
        <Box flex={1} />
        {paso < 2 ? (
          <Button variant="contained" onClick={() => cambiarPaso(1)} sx={{ bgcolor: COLOR }}>
            Siguiente
          </Button>
        ) : (
          <Button variant="contained" onClick={handleSubmit}
            disabled={guardando} sx={{ bgcolor: COLOR }}>
            {guardando ? 'Guardando...' : 'Inscribir'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
