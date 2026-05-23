// Stepper para crear una nueva inscripción: beneficiario → programa → formulario dinámico.
import { useState, useEffect } from 'react';
import {
  Alert, Autocomplete, Box, Button, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, Step, StepLabel, Stepper, TextField, Typography,
  useMediaQuery, useTheme,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { beneficiariosRepository } from '../../../../../infrastructure/repositories/beneficiariosRepository';
import { sedesRepository }         from '../../../../../infrastructure/repositories/sedesRepository';
import { inscripcionesRepository } from '../../../../../infrastructure/repositories/inscripcionesRepository';
import {
  COLOR, CampoInput, FirmaAutorizacion, SeccionHeader,
  agruparPorSeccion, calcEdad, parseMeta,
} from './campos';

function panelTutorCompleto(d, tipo) {
  const t = s => !!(s?.trim());
  const base = t(d.nombres) && t(d.apellidos) && t(d.fechaNac) && t(d.pais) &&
               (d.pais?.trim() !== 'Colombia' || t(d.departamento)) &&
               t(d.ciudad) && t(d.tipoDoc) && t(d.numDoc) && t(d.celular) &&
               t(d.direccion) && t(d.barrio) && t(d.eps) &&
               t(d.escolaridad) && t(d.ocupacion) && t(d.empresa) && t(d.autoidentificacion);
  return tipo === 'datos_tutor' ? base && t(d.relacion) : base;
}

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
      } catch { setBeneficiarios([]); }
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
    }).catch(() => {});
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
      }
      setDatos(auto);
      setPanelActivo(init);
    }).catch(() => {}).finally(() => setCargandoCampos(false));
  }, [selPrograma, selBenef]);

  const handleTogglePanel = (campo) => {
    const nuevoActivo = !panelActivo[campo.id];
    const next = { ...panelActivo, [campo.id]: nuevoActivo };
    if (!nuevoActivo) {
      setDatos(prev => { const n = { ...prev }; delete n[campo.id]; return n; });
      const padresMadre = campos.filter(c => c.tipo === 'datos_padre' || c.tipo === 'datos_madre');
      const todosApagados = padresMadre.every(c => (c.id === campo.id ? true : !next[c.id]));
      if (todosApagados) campos.filter(c => c.tipo === 'datos_tutor').forEach(c => { next[c.id] = true; });
    } else {
      campos.filter(c => c.tipo === 'datos_tutor').forEach(c => {
        next[c.id] = false;
        setDatos(prev => { const n = { ...prev }; delete n[c.id]; return n; });
      });
    }
    setPanelActivo(next);
  };

  const pasoValido = () => {
    if (paso === 0) return !!selBenef;
    if (paso === 1) return !!selPrograma;
    if (paso === 2) {
      if (!datos.__firma_padre__) return false;
      const _m = parseMeta(datos.__firma_meta__);
      if (!_m.quien || !_m.nombre?.trim() || !_m.documento?.trim()) return false;
      const camposOk = campos.every(c => {
        if (!c.obligatorio) return true;
        if ((c.tipo === 'datos_padre' || c.tipo === 'datos_madre' || c.tipo === 'datos_tutor') && panelActivo[c.id] === false) return true;
        const v = datos[c.id];
        if (!v) return false;
        if (c.tipo === 'daterange') {
          try { const r = JSON.parse(v); return !!(r.desde && r.hasta); } catch { return false; }
        }
        if (c.tipo === 'documento_id') {
          try { const d = JSON.parse(v); return !!(d.tipo && d.numero); } catch { return false; }
        }
        if (c.tipo === 'grado_escolar') {
          try { const ge = JSON.parse(v); return !!ge.grado; } catch { return false; }
        }
        if (c.tipo === 'datos_padre' || c.tipo === 'datos_madre' || c.tipo === 'datos_tutor') {
          try { const d = JSON.parse(v); return panelTutorCompleto(d, c.tipo); } catch { return false; }
        }
        return true;
      });
      if (!camposOk) return false;
      // Al menos uno de los paneles tutor debe estar completo
      const panelesTutor = campos.filter(c =>
        c.tipo === 'datos_padre' || c.tipo === 'datos_madre' || c.tipo === 'datos_tutor'
      );
      if (panelesTutor.length > 0) {
        const algunoCompleto = panelesTutor.some(c => {
          if (panelActivo[c.id] === false) return false;
          try { return panelTutorCompleto(JSON.parse(datos[c.id] ?? '{}'), c.tipo); } catch { return false; }
        });
        if (!algunoCompleto) return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
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
    } catch {
      setError('No se pudo guardar la inscripción.');
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

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
                <TextField {...params} label="Buscar por nombre" size="small" />
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
            <Typography fontWeight={700} mb={2}>Selecciona el programa</Typography>
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
              sx={{ mt: campos.length === 0 ? 0 : 1 }} />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onCerrar} disabled={guardando}>Cancelar</Button>
        {paso > 0 && (
          <Button onClick={() => setPaso(p => p - 1)} disabled={guardando}>Atrás</Button>
        )}
        <Box flex={1} />
        {paso < 2 ? (
          <Button variant="contained" onClick={() => setPaso(p => p + 1)}
            disabled={!pasoValido()} sx={{ bgcolor: COLOR }}>
            Siguiente
          </Button>
        ) : (
          <Button variant="contained" onClick={handleSubmit}
            disabled={guardando || !pasoValido()} sx={{ bgcolor: COLOR }}>
            {guardando ? 'Guardando...' : 'Inscribir'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
