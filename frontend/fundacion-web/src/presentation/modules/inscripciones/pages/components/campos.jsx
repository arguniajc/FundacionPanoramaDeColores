// Helpers, constantes y componentes de campo compartidos del módulo de inscripciones.
import { useState, useEffect, useMemo } from 'react';
import {
  Alert, Autocomplete, Box, Button, Chip, FormControl, FormControlLabel, Grid,
  InputAdornment, InputLabel, MenuItem, Select, Switch, TextField, Tooltip, Typography,
} from '@mui/material';
import { archivosRepository }   from '../../../../../infrastructure/repositories/archivosRepository';
import {
  PAISES, DEPARTAMENTOS_COLOMBIA, CIUDADES_COLOMBIA,
  TIPOS_DOCUMENTO, GENEROS, TIPOS_SANGRE, ESTRATOS, NIVELES_EDUCATIVOS,
  TALLAS_ROPA, TALLAS_PANTALON, TALLAS_ZAPATOS, EPS_LIST, VALORACIONES,
  GRADOS_COLOMBIA, JORNADAS_ESCOLARES, AUTOIDENTIFICACION, RELACIONES_TUTOR,
  getCiudadesDeUbicacion, getEstadosDePais,
} from '../../../../../shared/utils/geodata';
import FirmaPad from '../../../../../shared/components/FirmaPad';

export const COLOR = 'var(--color-primario)';

export const ESTADOS = [
  { value: 'activa',     label: 'Activa',     color: 'success' },
  { value: 'suspendida', label: 'Suspendida', color: 'warning' },
  { value: 'completada', label: 'Completada', color: 'info'    },
  { value: 'baja',       label: 'Baja',       color: 'error'   },
];

export function chipEstado(estado) {
  const e = ESTADOS.find(x => x.value === estado) ?? { label: estado, color: 'default' };
  return <Chip label={e.label} size="small" color={e.color} />;
}

export function calcEdad(fechaNac) {
  if (!fechaNac) return null;
  const nac = new Date(fechaNac + 'T00:00:00');
  const hoy = new Date();
  let e = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
  return e;
}

export function fmtFechaCorta(iso) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

export function agruparPorSeccion(campos) {
  const orden = [];
  const mapa  = new Map();
  for (const c of campos) {
    const sec = c.seccion?.trim() || '';
    if (!mapa.has(sec)) { mapa.set(sec, []); orden.push(sec); }
    mapa.get(sec).push(c);
  }
  return orden.map(sec => ({ seccion: sec, campos: mapa.get(sec) }));
}

export function SeccionHeader({ titulo }) {
  if (!titulo) return null;
  return (
    <Grid size={12}>
      <Box sx={{ bgcolor: COLOR, borderRadius: 1.5, px: 2, py: 1.1, mt: 1 }}>
        <Typography fontWeight={800} color="white"
          sx={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          {titulo}
        </Typography>
      </Box>
    </Grid>
  );
}

export function parseMeta(raw) {
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

function parsePanelData(raw) {
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

// Tipos de documento válidos según tipo de panel y país.
// padre/madre Colombia: TI (menor), CC (adulto), PPT (permiso temporal) — nunca RC.
// tutor Colombia: CC, CE, PPT, Otro — debe ser adulto, nunca RC ni TI.
function getDocsPorPanelYPais(esTutor, pais) {
  const esColombia = !pais || pais === 'Colombia';
  if (esTutor) return esColombia ? ['CC', 'CE', 'PPT', 'Otro'] : ['PA', 'CE', 'Otro'];
  return esColombia ? ['TI', 'CC', 'PPT'] : ['PA', 'CE', 'Otro'];
}

const QUIEN_FIRMA_LABEL = { padre: 'Padre', madre: 'Madre', tutor: 'Tutor legal' };

export function FirmaAutorizacion({ datos, setDatos, panelActivo = {}, campos = [], disabled = false, sx = {} }) {
  const meta = parseMeta(datos.__firma_meta__);

  const campoPadre = campos.find(c => c.tipo === 'datos_padre');
  const campoMadre = campos.find(c => c.tipo === 'datos_madre');
  const campoTutor = campos.find(c => c.tipo === 'datos_tutor');

  const padrOn  = !!(campoPadre && panelActivo[campoPadre.id] !== false);
  const madreOn = !!(campoMadre && panelActivo[campoMadre.id] !== false);
  const tutorOn = !!(campoTutor && panelActivo[campoTutor.id] !== false);

  const opcionesQuien = [
    padrOn  && 'padre',
    madreOn && 'madre',
    tutorOn && 'tutor',
  ].filter(Boolean);

  const quienAuto = opcionesQuien.length === 1 ? opcionesQuien[0] : null;
  const quienEfectivo = quienAuto || meta.quien || '';

  const campoEfectivo =
    quienEfectivo === 'padre' ? campoPadre :
    quienEfectivo === 'madre' ? campoMadre :
    quienEfectivo === 'tutor' ? campoTutor : null;
  const dPanel     = parsePanelData(campoEfectivo ? datos[campoEfectivo.id] : null);
  const nombreAuto = [dPanel.nombres, dPanel.apellidos].filter(Boolean).join(' ').trim();
  const docAuto    = dPanel.numDoc || '';

  const autoKey = `${quienEfectivo}|${nombreAuto}|${docAuto}`;
  useEffect(() => {
    if (disabled || !quienEfectivo || !campoEfectivo) return;
    const curr = parseMeta(datos.__firma_meta__);
    const updates = {};
    if (quienAuto && curr.quien !== quienAuto) updates.quien = quienAuto;
    if (nombreAuto && curr.nombre !== nombreAuto) updates.nombre = nombreAuto;
    if (docAuto    && curr.documento !== docAuto) updates.documento = docAuto;
    if (!Object.keys(updates).length) return;
    setDatos(prev => ({
      ...prev,
      __firma_meta__: JSON.stringify({ ...parseMeta(prev.__firma_meta__), ...updates }),
    }));
  }, [autoKey, disabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const setMeta = (changes) =>
    setDatos(prev => ({
      ...prev,
      __firma_meta__: JSON.stringify({ ...parseMeta(prev.__firma_meta__), ...changes }),
    }));

  const handleQuien = (v) => {
    const campo = v === 'padre' ? campoPadre : v === 'madre' ? campoMadre : v === 'tutor' ? campoTutor : null;
    const d = parsePanelData(campo ? datos[campo.id] : null);
    setMeta({
      quien:     v,
      nombre:    [d.nombres, d.apellidos].filter(Boolean).join(' ').trim() || meta.nombre || '',
      documento: d.numDoc || meta.documento || '',
    });
  };

  const handleImagen = (v) =>
    setDatos(prev => ({
      ...prev,
      __firma_padre__: v,
      __firma_meta__: JSON.stringify({
        ...parseMeta(prev.__firma_meta__),
        fechaHora: v ? new Date().toISOString() : null,
      }),
    }));

  const fmtFirmaFecha = meta.fechaHora
    ? new Date(meta.fechaHora).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  const nombreMostrar    = nombreAuto || meta.nombre    || '';
  const documentoMostrar = docAuto    || meta.documento || '';
  const nombreDisabled    = !!nombreAuto;
  const documentoDisabled = !!docAuto;

  return (
    <Box sx={{ p: 2, bgcolor: '#f3f0ff', borderRadius: 2, border: '2px solid #d0c4f7', ...sx }}>
      <Typography variant="caption" color={COLOR} fontWeight={800} display="block" mb={1.5}
        sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem' }}>
        Autorización del padre / acudiente
      </Typography>

      {disabled ? (
        datos.__firma_padre__ ? (
          <Box>
            <Box component="img" src={datos.__firma_padre__} alt="Firma"
              sx={{ display: 'block', height: 60, maxWidth: 280, objectFit: 'contain',
                    border: '1px solid #d0c4f7', borderRadius: 1, bgcolor: 'white', mb: 1 }} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              {meta.quien && (
                <Chip size="small" label={QUIEN_FIRMA_LABEL[meta.quien] ?? meta.quien}
                  sx={{ bgcolor: 'color-mix(in srgb, var(--color-primario) 9%, transparent)', color: COLOR, fontWeight: 700, fontSize: '0.72rem' }} />
              )}
              {meta.nombre    && <Typography variant="caption" fontWeight={600}>{meta.nombre}</Typography>}
              {meta.documento && <Typography variant="caption" color="text.secondary">Doc: {meta.documento}</Typography>}
              {fmtFirmaFecha  && <Typography variant="caption" color="text.secondary">{fmtFirmaFecha}</Typography>}
            </Box>
          </Box>
        ) : (
          <Chip label="Sin firma registrada" color="warning" size="small" variant="outlined" />
        )
      ) : (
        <>
          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              {quienAuto ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '40px',
                            px: 1.5, bgcolor: 'color-mix(in srgb, var(--color-primario) 6%, transparent)', borderRadius: 1.5 }}>
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    Firma:
                  </Typography>
                  <Chip size="small" label={QUIEN_FIRMA_LABEL[quienAuto]}
                    sx={{ bgcolor: 'color-mix(in srgb, var(--color-primario) 12%, transparent)', color: COLOR, fontWeight: 700, fontSize: '0.72rem' }} />
                </Box>
              ) : (
                <FormControl fullWidth size="small">
                  <InputLabel>¿Quién firma? *</InputLabel>
                  <Select value={meta.quien || ''} label="¿Quién firma? *"
                    onChange={e => handleQuien(e.target.value)}>
                    {opcionesQuien.length > 0
                      ? opcionesQuien.map(q => (
                          <MenuItem key={q} value={q}>{QUIEN_FIRMA_LABEL[q]}</MenuItem>
                        ))
                      : [
                          <MenuItem key="padre" value="padre">Padre</MenuItem>,
                          <MenuItem key="madre" value="madre">Madre</MenuItem>,
                          <MenuItem key="tutor" value="tutor">Tutor legal</MenuItem>,
                        ]
                    }
                  </Select>
                </FormControl>
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth size="small" label="Nombre completo *"
                value={nombreMostrar}
                disabled={nombreDisabled}
                onChange={e => setMeta({ nombre: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth size="small" label="Número de documento *"
                value={documentoMostrar}
                disabled={documentoDisabled}
                onChange={e => setMeta({ documento: e.target.value.replace(/\D/g, '') })}
                slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
            </Grid>
          </Grid>
          <FirmaPad
            label="Firma"
            value={datos.__firma_padre__ ?? ''}
            onChange={handleImagen}
            obligatorio
          />
          {datos.__firma_padre__ && fmtFirmaFecha && (
            <Typography variant="caption" color="text.secondary" display="block" mt={0.8}>
              Firmado el {fmtFirmaFecha}
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}

export function CampoInput({ campo, value, onChange, activo = true, onToggle }) {
  const [subiendo, setSubiendo] = useState(false);

  if (campo.tipo === 'boolean') {
    return (
      <FormControlLabel
        control={<Switch checked={value === 'true' || value === true}
          onChange={e => onChange(e.target.checked ? 'true' : 'false')} />}
        label={campo.etiqueta + (campo.obligatorio ? ' *' : '')}
      />
    );
  }

  if (campo.tipo === 'select') {
    return (
      <FormControl fullWidth size="small" required={campo.obligatorio}>
        <InputLabel>{campo.etiqueta}</InputLabel>
        <Select label={campo.etiqueta} value={value ?? ''} onChange={e => onChange(e.target.value)}>
          {(campo.opciones ?? []).map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </Select>
      </FormControl>
    );
  }

  if (campo.tipo === 'document') {
    const handleFile = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setSubiendo(true);
      try {
        const { data } = await archivosRepository.subir(file, 'inscripciones');
        onChange(data.url);
      } catch {
        onChange('');
      } finally {
        setSubiendo(false);
      }
    };
    return (
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
          {campo.etiqueta}{campo.obligatorio ? ' *' : ''}
        </Typography>
        {value ? (
          <Box display="flex" alignItems="center" gap={1}>
            <Chip label="✓ Entregado" color="success" size="small" />
            <Button size="small" onClick={() => window.open(value, '_blank', 'noopener,noreferrer')}>Ver PDF</Button>
            <Button size="small" color="error" onClick={() => onChange('')}>Quitar</Button>
          </Box>
        ) : (
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Chip label="Pendiente" color="warning" size="small" variant="outlined" />
            <Button variant="outlined" component="label" size="small" disabled={subiendo}
              sx={{ color: COLOR, borderColor: COLOR }}>
              {subiendo ? 'Subiendo...' : 'Seleccionar PDF'}
              <input type="file" hidden accept="application/pdf" onChange={handleFile} />
            </Button>
          </Box>
        )}
      </Box>
    );
  }

  if (campo.tipo === 'daterange') {
    let rng = { desde: '', hasta: '' };
    try { if (value) rng = JSON.parse(value); } catch {}
    const setRng = (k, v) => onChange(JSON.stringify({ ...rng, [k]: v }));
    return (
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
          {campo.etiqueta}{campo.obligatorio ? ' *' : ''}
        </Typography>
        <Box display="flex" gap={1} alignItems="center">
          <TextField size="small" label="Desde" type="date" value={rng.desde ?? ''}
            onChange={e => setRng('desde', e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
          <Typography variant="body2" color="text.secondary" flexShrink={0}>—</Typography>
          <TextField size="small" label="Hasta" type="date" value={rng.hasta ?? ''}
            onChange={e => setRng('hasta', e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
        </Box>
      </Box>
    );
  }

  if (campo.tipo === 'talla' || campo.tipo === 'altura') {
    return (
      <TextField fullWidth size="small"
        label={campo.etiqueta} type="number" required={campo.obligatorio}
        value={value ?? ''} onChange={e => onChange(e.target.value)}
        slotProps={{ input: { inputProps: { min: 0, step: 1 }, endAdornment: <InputAdornment position="end">cm</InputAdornment> } }}
      />
    );
  }

  if (campo.tipo === 'edad') {
    return (
      <TextField fullWidth size="small"
        label={campo.etiqueta} type="number" required={campo.obligatorio}
        value={value ?? ''} onChange={e => onChange(e.target.value)}
        helperText="Auto-calculada del beneficiario"
        slotProps={{ input: { endAdornment: <InputAdornment position="end">años</InputAdornment> } }}
      />
    );
  }

  if (campo.tipo === 'fecha_nac') {
    return (
      <TextField fullWidth size="small"
        label={campo.etiqueta} type="date" required={campo.obligatorio}
        value={value ?? ''} onChange={e => onChange(e.target.value)}
        helperText="Auto-completada del beneficiario"
        slotProps={{ inputLabel: { shrink: true } }}
      />
    );
  }

  if (campo.tipo === 'firma') {
    return (
      <FirmaPad
        label={campo.etiqueta}
        value={value ?? ''}
        onChange={onChange}
        obligatorio={campo.obligatorio}
      />
    );
  }

  if (campo.tipo === 'documento_id') {
    let doc = { tipo: '', numero: '' };
    try { if (value) doc = JSON.parse(value); } catch {}
    const setDoc = (k, v) => onChange(JSON.stringify({ ...doc, [k]: v }));
    return (
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
          {campo.etiqueta}{campo.obligatorio ? ' *' : ''}
        </Typography>
        <Box display="flex" gap={1}>
          <FormControl size="small" sx={{ width: 140, flexShrink: 0 }}>
            <InputLabel>Tipo</InputLabel>
            <Select label="Tipo" value={doc.tipo} onChange={e => setDoc('tipo', e.target.value)}>
              {TIPOS_DOCUMENTO.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="Número" sx={{ flex: 1 }}
            value={doc.numero} onChange={e => setDoc('numero', e.target.value)}
            required={campo.obligatorio} />
        </Box>
      </Box>
    );
  }

  if (campo.tipo === 'telefono') return (
    <TextField fullWidth size="small"
      label={campo.etiqueta} type="tel" required={campo.obligatorio}
      value={value ?? ''} onChange={e => onChange(e.target.value)} />
  );

  if (campo.tipo === 'email') return (
    <TextField fullWidth size="small"
      label={campo.etiqueta} type="email" required={campo.obligatorio}
      value={value ?? ''} onChange={e => onChange(e.target.value)} />
  );

  if (campo.tipo === 'peso') return (
    <TextField fullWidth size="small"
      label={campo.etiqueta} type="number" required={campo.obligatorio}
      value={value ?? ''} onChange={e => onChange(e.target.value)}
      slotProps={{ input: { inputProps: { min: 0, step: 0.1 }, endAdornment: <InputAdornment position="end">kg</InputAdornment> } }}
    />
  );

  if (campo.tipo === 'grado_escolar') {
    let ge = { grado: '', jornada: '' };
    try { if (value) ge = JSON.parse(value); } catch {}
    const setGE = (k, v) => onChange(JSON.stringify({ ...ge, [k]: v }));
    return (
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
          {campo.etiqueta}{campo.obligatorio ? ' *' : ''}
        </Typography>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small" required={campo.obligatorio}>
              <InputLabel>Grado</InputLabel>
              <Select label="Grado" value={ge.grado} onChange={e => setGE('grado', e.target.value)}>
                {GRADOS_COLOMBIA.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Jornada</InputLabel>
              <Select label="Jornada" value={ge.jornada} onChange={e => setGE('jornada', e.target.value)}>
                {JORNADAS_ESCOLARES.map(j => <MenuItem key={j} value={j}>{j}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (campo.tipo === 'tipo_documento'  || campo.tipo === 'genero'        ||
      campo.tipo === 'tipo_sangre'     || campo.tipo === 'estrato'       ||
      campo.tipo === 'nivel_educativo' || campo.tipo === 'talla_ropa'    ||
      campo.tipo === 'talla_pantalon'  || campo.tipo === 'talla_zapatos' ||
      campo.tipo === 'valoracion'      || campo.tipo === 'autoidentificacion') {
    const listas = {
      tipo_documento: TIPOS_DOCUMENTO, genero: GENEROS,
      tipo_sangre: TIPOS_SANGRE, estrato: ESTRATOS, nivel_educativo: NIVELES_EDUCATIVOS,
      talla_ropa: TALLAS_ROPA, talla_pantalon: TALLAS_PANTALON,
      talla_zapatos: TALLAS_ZAPATOS, valoracion: VALORACIONES,
      autoidentificacion: AUTOIDENTIFICACION,
    };
    return (
      <FormControl fullWidth size="small" required={campo.obligatorio}>
        <InputLabel>{campo.etiqueta + (campo.obligatorio ? ' *' : '')}</InputLabel>
        <Select
          label={campo.etiqueta + (campo.obligatorio ? ' *' : '')}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}>
          {listas[campo.tipo].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </Select>
      </FormControl>
    );
  }

  if (campo.tipo === 'pais' || campo.tipo === 'departamento' || campo.tipo === 'ciudad') {
    const opciones = campo.tipo === 'pais' ? PAISES
      : campo.tipo === 'departamento' ? DEPARTAMENTOS_COLOMBIA
      : CIUDADES_COLOMBIA;
    return (
      <Autocomplete
        freeSolo
        options={opciones}
        value={value ?? ''}
        onChange={(_, v) => onChange(v ?? '')}
        onInputChange={(_, v) => onChange(v)}
        renderInput={(params) => (
          <TextField {...params} fullWidth size="small"
            label={campo.etiqueta + (campo.obligatorio ? ' *' : '')}
            required={campo.obligatorio} />
        )}
      />
    );
  }

  if (campo.tipo === 'datos_padre' || campo.tipo === 'datos_madre' || campo.tipo === 'datos_tutor') {
    let d = {};
    try { if (value) d = JSON.parse(value); } catch {}
    const setD = (k, v) => onChange(JSON.stringify({ ...d, [k]: v }));
    const SC      = '#7B3FC4';
    const esTutor = campo.tipo === 'datos_tutor';
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const estadosPanel  = useMemo(() => getEstadosDePais(d.pais || 'Colombia'), [d.pais]);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ciudadesPanel = useMemo(() => getCiudadesDeUbicacion(d.pais), [d.pais]);
    const subcampos = esTutor ? '17 sub-campos' : '16 sub-campos';
    const tieneToggle = !esTutor && !!onToggle;
    const tiposDocPanel = getDocsPorPanelYPais(esTutor, d.pais);
    return (
      <Box sx={{
        border: `1.5px solid ${activo ? SC + '40' : '#d0d0d0'}`,
        borderRadius: 2.5, overflow: 'hidden',
        boxShadow: activo ? '0 3px 14px rgba(78,27,149,0.10)' : 'none',
        transition: 'all 0.2s',
      }}>
        <Box sx={{
          bgcolor: activo ? `${SC}18` : '#f0f0f0',
          borderBottom: `1.5px solid ${activo ? SC + '30' : '#ddd'}`,
          borderLeft: `5px solid ${activo ? SC : '#bbb'}`,
          px: 2, py: 1,
          display: 'flex', alignItems: 'center', gap: 1.5,
          transition: 'background 0.2s',
        }}>
          <Typography sx={{
            fontSize: '0.88rem', fontWeight: 800, flex: 1,
            color: activo ? SC : '#aaa', transition: 'color 0.2s',
          }}>
            {campo.etiqueta}{campo.obligatorio && activo ? ' *' : ''}
          </Typography>
          {tieneToggle && (
            <Tooltip title={activo ? 'No aplica — deshabilitar' : 'Habilitar este panel'}>
              <Switch checked={activo} onChange={onToggle} size="small"
                sx={{ '& .MuiSwitch-thumb': { bgcolor: activo ? SC : '#bbb' },
                      '& .MuiSwitch-track': { bgcolor: activo ? `${SC}80 !important` : '#ccc !important' } }} />
            </Tooltip>
          )}
          {activo && (
            <Chip label={subcampos} size="small"
              sx={{ bgcolor: `${SC}18`, color: SC, fontWeight: 700, fontSize: '0.68rem',
                    border: `1px solid ${SC}40`, height: 22 }} />
          )}
        </Box>

        {!activo && (
          <Box sx={{ bgcolor: '#fafafa', py: 2.5, textAlign: 'center' }}>
            <Typography variant="body2" color="text.disabled" fontStyle="italic">
              No aplica para esta inscripción
            </Typography>
          </Box>
        )}

        {activo && (
          <Box sx={{ bgcolor: '#f9f6ff', p: 2.5 }}>
            <Grid container spacing={2}>
              {esTutor && (
                <Grid size={12}>
                  <FormControl fullWidth size="small" required>
                    <InputLabel>Relación / Parentesco *</InputLabel>
                    <Select label="Relación / Parentesco *" value={d.relacion ?? ''}
                      onChange={e => setD('relacion', e.target.value)}>
                      {RELACIONES_TUTOR.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Nombres *" required
                  value={d.nombres ?? ''} onChange={e => setD('nombres', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Apellidos *" required
                  value={d.apellidos ?? ''} onChange={e => setD('apellidos', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Fecha de nacimiento *" required type="date"
                  value={d.fechaNac ?? ''} onChange={e => setD('fechaNac', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              {!esTutor && d.fechaNac && (() => { const e = calcEdad(d.fechaNac); return e !== null && e < 18; })() && (
                <Grid size={12}>
                  <Alert severity="warning" sx={{ py: 0.5, fontSize: '0.78rem' }}>
                    Menor de edad — el tutor legal será requerido para la firma de autorización.
                  </Alert>
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: 4 }}>
                <Autocomplete freeSolo options={PAISES} value={d.pais ?? ''}
                  onInputChange={(_, v) => { const td = getDocsPorPanelYPais(esTutor, v); onChange(JSON.stringify({ ...d, pais: v, departamento: '', ciudad: '', tipoDoc: td.includes(d.tipoDoc) ? d.tipoDoc : '' })); }}
                  onChange={(_, v) => { const td = getDocsPorPanelYPais(esTutor, v ?? ''); onChange(JSON.stringify({ ...d, pais: v ?? '', departamento: '', ciudad: '', tipoDoc: td.includes(d.tipoDoc) ? d.tipoDoc : '' })); }}
                  renderInput={p => <TextField {...p} size="small" label="País *" fullWidth required />} />
              </Grid>
              {estadosPanel.length > 0 && (
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Autocomplete freeSolo options={estadosPanel} value={d.departamento ?? ''}
                    onInputChange={(_, v) => onChange(JSON.stringify({ ...d, departamento: v, ciudad: '' }))}
                    onChange={(_, v) => onChange(JSON.stringify({ ...d, departamento: v ?? '', ciudad: '' }))}
                    renderInput={p => <TextField {...p} size="small" label="Departamento / Estado *" fullWidth required />} />
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: estadosPanel.length > 0 ? 4 : 8 }}>
                <Autocomplete freeSolo options={ciudadesPanel} value={d.ciudad ?? ''}
                  onInputChange={(_, v) => setD('ciudad', v)}
                  onChange={(_, v) => setD('ciudad', v ?? '')}
                  renderInput={p => <TextField {...p} size="small" label="Ciudad *" fullWidth required />} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small" required>
                  <InputLabel>Tipo de doc. *</InputLabel>
                  <Select label="Tipo de doc. *" value={d.tipoDoc ?? ''} onChange={e => setD('tipoDoc', e.target.value)}>
                    {tiposDocPanel.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField fullWidth size="small" label="Número de documento *" required
                  value={d.numDoc ?? ''}
                  onChange={e => setD('numDoc', e.target.value.replace(/\D/g, ''))}
                  slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField fullWidth size="small" label="Dirección *" required
                  value={d.direccion ?? ''} onChange={e => setD('direccion', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" label="Barrio *" required
                  value={d.barrio ?? ''} onChange={e => setD('barrio', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete freeSolo options={EPS_LIST}
                  value={d.eps ?? ''}
                  onChange={(_, v) => setD('eps', v ?? '')}
                  onInputChange={(_, v) => setD('eps', v)}
                  renderInput={p => (
                    <TextField {...p} fullWidth size="small" label="EPS / Aseguradora *" required />
                  )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Número de celular *" required
                  value={d.celular ?? ''}
                  onChange={e => setD('celular', e.target.value.replace(/\D/g, ''))}
                  slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small" required>
                  <InputLabel>Nivel de escolaridad *</InputLabel>
                  <Select label="Nivel de escolaridad *" value={d.escolaridad ?? ''} onChange={e => setD('escolaridad', e.target.value)}>
                    {NIVELES_EDUCATIVOS.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Ocupación *" required
                  value={d.ocupacion ?? ''} onChange={e => setD('ocupacion', e.target.value)} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth size="small" label="Empresa / Lugar de trabajo *" required
                  value={d.empresa ?? ''} onChange={e => setD('empresa', e.target.value)} />
              </Grid>
              <Grid size={12}>
                <FormControl fullWidth size="small" required>
                  <InputLabel>Autoidentificación étnica *</InputLabel>
                  <Select label="Autoidentificación étnica *" value={d.autoidentificacion ?? ''}
                    onChange={e => setD('autoidentificacion', e.target.value)}>
                    {AUTOIDENTIFICACION.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <TextField fullWidth size="small"
      label={campo.etiqueta}
      type={campo.tipo === 'number' ? 'number' : campo.tipo === 'date' ? 'date' : 'text'}
      required={campo.obligatorio}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      slotProps={campo.tipo === 'date' ? { inputLabel: { shrink: true } } : undefined}
    />
  );
}
