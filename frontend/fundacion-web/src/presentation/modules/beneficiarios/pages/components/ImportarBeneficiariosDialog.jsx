import { useState, useRef } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, LinearProgress,
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import UploadFileIcon  from '@mui/icons-material/UploadFile';
import DownloadIcon    from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon       from '@mui/icons-material/Error';
import * as XLSX from 'xlsx';
import apiClient from '@/infrastructure/http/apiClient';
import { BRAND_COLOR } from '@/shared/constants/brand';
import { exportarExcel } from '@/shared/utils/exportarExcel';

const COLOR = BRAND_COLOR;

// ── Columnas de la plantilla ───────────────────────────────────────────────────
const COLS = [
  { header: 'Primer nombre *',    field: 'primerNombre',    req: true,  hint: '✓ OBLIGATORIO',         vals: null,                           comment: 'OBLIGATORIO. Primer nombre del beneficiario.' },
  { header: 'Segundo nombre',     field: 'segundoNombre',   req: false, hint: 'opcional',              vals: null,                           comment: 'Opcional. Segundo nombre.' },
  { header: 'Primer apellido *',  field: 'primerApellido',  req: true,  hint: '✓ OBLIGATORIO',         vals: null,                           comment: 'OBLIGATORIO. Primer apellido.' },
  { header: 'Segundo apellido',   field: 'segundoApellido', req: false, hint: 'opcional',              vals: null,                           comment: 'Opcional. Segundo apellido.' },
  { header: 'Fecha nacimiento *', field: 'fechaNacimiento', req: true,  hint: 'Formato: AAAA-MM-DD',   vals: null,                           comment: 'OBLIGATORIO. Formato: AAAA-MM-DD\nEjemplo: 2015-03-22' },
  { header: 'Tipo documento',     field: 'tipoDocumento',   req: false, hint: 'RC / TI / CC / CE / PA',vals: ['RC','TI','CC','CE','PA','NUI'],comment: 'Opcional. Valores: RC, TI, CC, CE, PA, NUI' },
  { header: 'Numero documento',   field: 'numeroDocumento', req: false, hint: 'opcional',              vals: null,                           comment: 'Opcional. Número del documento de identidad.' },
  { header: 'Genero',             field: 'genero',          req: false, hint: 'masculino/femenino/otro',vals: ['masculino','femenino','otro'],  comment: 'Opcional. Valores: masculino, femenino, otro' },
  { header: 'EPS',                field: 'eps',             req: false, hint: 'Ej: Sura, Compensar',   vals: null,                           comment: 'Opcional. Nombre de la EPS.' },
  { header: 'Acudiente',          field: 'nombreAcudiente', req: false, hint: 'Nombre completo',       vals: null,                           comment: 'Opcional. Nombre completo del acudiente.' },
  { header: 'Parentesco',         field: 'parentesco',      req: false, hint: 'madre/padre/otro',       vals: ['madre','padre','abuelo','abuela','tio','tia','hermano','hermana','otro'], comment: 'Opcional. Valores: madre, padre, abuelo, abuela, tio, tia, hermano, otro' },
  { header: 'WhatsApp',           field: 'whatsapp',        req: false, hint: 'Ej: 3001234567',        vals: null,                           comment: 'Opcional. Celular/WhatsApp del acudiente. Solo números.' },
  { header: 'Direccion',          field: 'direccion',       req: false, hint: 'Ej: Calle 5 # 10-20',  vals: null,                           comment: 'Opcional. Dirección del acudiente.' },
  { header: 'Colegio',            field: 'nombreColegio',   req: false, hint: 'Nombre del colegio',    vals: null,                           comment: 'Opcional. Nombre de la institución educativa.' },
  { header: 'Grado escolar',      field: 'gradoEscolar',    req: false, hint: 'Ej: 1, 2, 3, jardin',  vals: null,                           comment: 'Opcional. Grado escolar actual.' },
  { header: 'Tipo',               field: 'tipo',            req: false, hint: 'nino / adulto',          vals: ['nino','adulto'],               comment: 'Opcional. nino (por defecto) o adulto.' },
];

// ── Normalizar cabecera para búsqueda robusta ──────────────────────────────────
// Convierte "Primer nombre *" → "PRIMER_NOMBRE"
const normalizeKey = (s) =>
  s.toString()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // quitar tildes
    .toUpperCase()
    .replace(/[*]/g, '')                                // quitar asteriscos
    .replace(/[^A-Z0-9]+/g, '_')                       // no alfanumérico → _
    .replace(/_+/g, '_')                               // colapsar _
    .replace(/^_+|_+$/g, '');                          // trim _

// Mapa normalizado + alias técnicos para compatibilidad con plantilla anterior
const COL_MAP = {};
COLS.forEach(({ header, field }) => { COL_MAP[normalizeKey(header)] = field; });
// Alias técnicos (plantilla antigua: PRIMER_NOMBRE, FECHA_NACIMIENTO, etc.)
const ALIASES = {
  PRIMER_NOMBRE: 'primerNombre', SEGUNDO_NOMBRE: 'segundoNombre',
  PRIMER_APELLIDO: 'primerApellido', SEGUNDO_APELLIDO: 'segundoApellido',
  FECHA_NACIMIENTO: 'fechaNacimiento', TIPO_DOCUMENTO: 'tipoDocumento',
  NUMERO_DOCUMENTO: 'numeroDocumento', GENERO: 'genero',
  NOMBRE_ACUDIENTE: 'nombreAcudiente', PARENTESCO: 'parentesco',
  WHATSAPP: 'whatsapp', DIRECCION: 'direccion', COLEGIO: 'nombreColegio',
  GRADO_ESCOLAR: 'gradoEscolar', TIPO: 'tipo', EPS: 'eps',
};
Object.assign(COL_MAP, ALIASES);

// ── Detectar fila de pistas (se omite al parsear) ──────────────────────────────
const HINT_PATTERN = /^✓|^opcional|^obligatorio|^formato:|^ej:|^valores:/i;
const esFilaPistas = (row) =>
  row.filter(Boolean).some(v => HINT_PATTERN.test(v.toString().trim()));

// ── Validar una fila ───────────────────────────────────────────────────────────
function validarFila(f) {
  const errs = [];
  if (!f.primerNombre?.trim())   errs.push('Primer nombre obligatorio');
  if (!f.primerApellido?.trim()) errs.push('Primer apellido obligatorio');
  if (!f.fechaNacimiento?.trim()) {
    errs.push('Fecha nacimiento obligatoria');
  } else if (isNaN(Date.parse(f.fechaNacimiento))) {
    errs.push('Fecha inválida — use AAAA-MM-DD');
  }
  return errs;
}

// ── Descarga de plantilla ──────────────────────────────────────────────────────
function generarPlantilla() {
  const headerRow = COLS.map(c => c.header);
  const hintsRow  = COLS.map(c => c.vals ? c.vals.join(' / ') : c.hint);
  const filasVacias = Array.from({ length: 100 }, () => new Array(COLS.length).fill(''));

  const ej1 = ['Maria',   'Camila',  'Gonzalez', 'Torres',    '2015-03-22', 'TI', '1234567890', 'femenino',  'Sura',      'Ana Torres', 'madre', '3001234567', 'Calle 5 # 10-20',    'Inst. San Jose',   '3', 'nino'];
  const ej2 = ['Carlos',  '',        'Perez',    '',          '2018-07-14', '',   '',            '',          '',          '',           '',      '',           '',                   '',                 '',  'nino'];
  const ej3 = ['Roberto', 'Andres',  'Ramirez',  'Gutierrez', '2010-11-05', 'TI', '9876543210', 'masculino', 'Compensar', 'Luis Guti',  'padre', '3209876543', 'Carrera 12 # 5-30',  'Col. Nuevo Siglo', '7', 'nino'];

  const refRows = [
    ['Campo', 'Obligatorio', 'Valores válidos', 'Ejemplo'],
    ...COLS.map(c => [
      c.header.replace(' *', ''),
      c.req ? 'SÍ' : 'no',
      c.vals ? c.vals.join(', ') : c.hint.replace('✓ OBLIGATORIO', '—').replace('opcional', '—'),
      c.header === 'Fecha nacimiento *' ? '2015-03-22'
        : c.header === 'Primer nombre *'   ? 'Maria'
        : c.header === 'Primer apellido *' ? 'Gonzalez'
        : (c.vals ? c.vals[0] : ''),
    ]),
    [],
    ['NOTAS IMPORTANTES'],
    ['• Fecha nacimiento: use el formato AAAA-MM-DD  (año-mes-día con guiones)'],
    ['• Los campos marcados SÍ son obligatorios. Los demás son opcionales.'],
    ['• No elimine ni reordene las columnas de la hoja Beneficiarios.'],
    ['• Puede copiar y pegar la fila de Ejemplos como guía.'],
    ['• Documentos duplicados serán omitidos automáticamente (no causan error).'],
    ['• El encabezado (fila 1) y la fila de pistas (fila 2) se omiten al importar.'],
    ['• Llene los datos a partir de la fila 3.'],
  ];

  exportarExcel('plantilla_beneficiarios_inscripcion', [
    {
      nombre: 'Beneficiarios',
      filas: [headerRow, hintsRow, ...filasVacias],
      cols: COLS.map(c => c.req ? 20 : 18),
      altoFilas: [22, 16],
      comentarios: COLS.map((col, i) => ({ col: i, row: 0, texto: col.comment })),
    },
    {
      nombre: 'Ejemplos',
      filas: [headerRow, ej1, ej2, ej3],
      cols: COLS.map(c => c.req ? 20 : 18),
    },
    {
      nombre: 'Referencia',
      filas: refRows,
      cols: [22, 12, 38, 20],
    },
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
export function ImportarBeneficiariosDialog({ open, onClose, onImportado }) {
  const inputRef = useRef();
  const [archivo,   setArchivo]   = useState(null);
  const [filas,     setFilas]     = useState([]);
  const [cargando,  setCargando]  = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error,     setError]     = useState('');

  const reset = () => {
    setArchivo(null); setFilas([]); setResultado(null); setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => { reset(); onClose(); };

  const handleArchivo = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setArchivo(f); setResultado(null); setError('');
    try {
      const ab = await f.arrayBuffer();
      const wb = XLSX.read(ab, { cellDates: true, dateNF: 'yyyy-mm-dd' });
      const ws = wb.Sheets[wb.SheetNames[0]];

      // Leer como arrays para control total sobre filas
      const rawData = XLSX.utils.sheet_to_json(ws, {
        header: 1, raw: false, defval: '', dateNF: 'yyyy-mm-dd',
      });
      if (!rawData.length) { setError('El archivo está vacío.'); return; }

      // Fila 0 = encabezados → mapa posición→campo
      const headers = (rawData[0] ?? []);
      const posToField = headers.map(h => COL_MAP[normalizeKey(h)] || null);

      // Determinar desde qué fila empiezan los datos (saltar fila de pistas si existe)
      let inicio = 1;
      if (rawData.length > 1 && esFilaPistas(rawData[1])) inicio = 2;

      const filasParsed = rawData
        .slice(inicio)
        .map(row => {
          const mapped = {};
          posToField.forEach((field, i) => {
            if (field) {
              const val = (row[i] ?? '').toString().trim();
              if (val) mapped[field] = val;
            }
          });
          return mapped;
        })
        .filter(r => Object.values(r).some(v => v !== ''));

      setFilas(filasParsed);
    } catch {
      setError('No se pudo leer el archivo. Asegúrese de usar el formato .xlsx.');
    }
  };

  const importar = async () => {
    const validas = filas.filter(f => validarFila(f).length === 0);
    if (!validas.length) { setError('Ninguna fila es válida. Revise los errores resaltados.'); return; }
    setCargando(true); setError(''); setResultado(null);
    try {
      const { data } = await apiClient.post('/api/beneficiarios/importar-xlsx', validas);
      setResultado(data);
      if (data.insertados > 0) onImportado?.();
    } catch (e) {
      setError(e?.response?.data?.mensaje || 'Error al importar.');
    } finally {
      setCargando(false);
    }
  };

  const filasValidas   = filas.filter(f => validarFila(f).length === 0);
  const filasInvalidas = filas.filter(f => validarFila(f).length > 0);
  const preview        = filas.slice(0, 5);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR }}>
        Importar beneficiarios desde Excel
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Plantilla */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5, bgcolor: '#f5f0ff', borderRadius: 2, border: '1px solid #e2d9f3' }}>
          <Box flex={1}>
            <Typography fontWeight={700} fontSize="0.85rem">Descarga la plantilla .xlsx</Typography>
            <Typography fontSize="0.72rem" color="text.secondary" mt={0.3}>
              Incluye <b>nombres amigables</b> en las columnas, pistas de formato en la fila 2,
              hoja de ejemplos y hoja de referencia con valores válidos.
              Los campos marcados con <b>*</b> son obligatorios.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.8 }}>
              {COLS.filter(c => c.req).map(c => (
                <Chip key={c.field} label={c.header.replace(' *', '')} size="small"
                  sx={{ fontSize: '0.65rem', bgcolor: '#ede9fe', color: COLOR, fontWeight: 700, height: 18 }} />
              ))}
              <Typography fontSize="0.65rem" color="text.secondary" alignSelf="center">← obligatorios</Typography>
            </Box>
          </Box>
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={generarPlantilla}
            sx={{ borderColor: COLOR, color: COLOR, whiteSpace: 'nowrap', flexShrink: 0, alignSelf: 'flex-start' }}>
            Plantilla
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Zona de carga */}
        {!resultado && (
          <Box
            onClick={() => inputRef.current?.click()}
            sx={{
              border: `2px dashed ${archivo ? COLOR : '#d1c4e9'}`,
              borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer',
              bgcolor: archivo ? '#f5f0ff' : 'transparent',
              '&:hover': { bgcolor: '#f5f0ff', borderColor: COLOR },
              mb: 2,
            }}
          >
            <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleArchivo} />
            <UploadFileIcon sx={{ fontSize: 36, color: archivo ? COLOR : '#9e9e9e', mb: 1 }} />
            <Typography fontWeight={700} color={archivo ? COLOR : 'text.secondary'}>
              {archivo ? archivo.name : 'Haz clic para seleccionar un archivo .xlsx'}
            </Typography>
            {archivo && (
              <Typography fontSize="0.75rem" color="text.secondary" mt={0.5}>
                {(archivo.size / 1024).toFixed(1)} KB — {filas.length} fila(s) leída(s)
              </Typography>
            )}
          </Box>
        )}

        {/* Resumen de validación */}
        {filas.length > 0 && !resultado && (
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
            <Chip icon={<CheckCircleIcon />} label={`${filasValidas.length} válida(s)`}
              color="success" size="small" variant="outlined" />
            {filasInvalidas.length > 0 && (
              <Chip icon={<ErrorIcon />} label={`${filasInvalidas.length} con error (serán omitidas)`}
                color="error" size="small" variant="outlined" />
            )}
          </Box>
        )}

        {/* Vista previa */}
        {preview.length > 0 && !resultado && (
          <Box>
            <Typography fontSize="0.8rem" fontWeight={700} mb={1} color="text.secondary">
              Vista previa (primeras {preview.length} de {filas.length} filas):
            </Typography>
            <Box sx={{ overflowX: 'auto', borderRadius: 1, border: '1px solid #e0e0e0' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f0ff' }}>
                    <TableCell sx={{ fontSize: '0.7rem', fontWeight: 700, color: COLOR }}>#</TableCell>
                    {['Primer nombre','Primer apellido','Fecha nac.','Documento','Acudiente'].map(h => (
                      <TableCell key={h} sx={{ fontSize: '0.7rem', fontWeight: 700, color: COLOR, whiteSpace: 'nowrap' }}>{h}</TableCell>
                    ))}
                    <TableCell sx={{ fontSize: '0.7rem', fontWeight: 700, color: COLOR }}>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.map((f, i) => {
                    const errs = validarFila(f);
                    return (
                      <TableRow key={i} sx={{ bgcolor: errs.length ? '#fff5f5' : 'inherit' }}>
                        <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{i + 1}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{f.primerNombre || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{f.primerApellido || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{f.fechaNacimiento || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{f.numeroDocumento || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{f.nombreAcudiente || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          {errs.length === 0
                            ? <Chip label="OK" color="success" size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                            : <Box component="span" sx={{ color: '#dc2626', fontSize: '0.7rem' }}>{errs.join('; ')}</Box>
                          }
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}

        {/* Resultado */}
        {resultado && (
          <Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2, flex: 1, textAlign: 'center', minWidth: 100 }}>
                <Typography fontSize="1.6rem" fontWeight={800} color="#16a34a">{resultado.insertados}</Typography>
                <Typography fontSize="0.75rem" color="text.secondary">Insertados</Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 2, flex: 1, textAlign: 'center', minWidth: 100 }}>
                <Typography fontSize="1.6rem" fontWeight={800} color="#d97706">{resultado.omitidos}</Typography>
                <Typography fontSize="0.75rem" color="text.secondary">Omitidos (duplicados)</Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: resultado.errores?.length ? '#fef2f2' : '#f0fdf4', border: `1px solid ${resultado.errores?.length ? '#fecaca' : '#bbf7d0'}`, borderRadius: 2, flex: 1, textAlign: 'center', minWidth: 100 }}>
                <Typography fontSize="1.6rem" fontWeight={800} color={resultado.errores?.length ? '#dc2626' : '#16a34a'}>{resultado.errores?.length ?? 0}</Typography>
                <Typography fontSize="0.75rem" color="text.secondary">Errores</Typography>
              </Box>
            </Box>
            {resultado.errores?.length > 0 && (
              <Box>
                <Typography fontSize="0.8rem" fontWeight={700} mb={1} color="#dc2626">Filas con error:</Typography>
                <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #fecaca', borderRadius: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#fef2f2' }}>
                        <TableCell sx={{ fontSize: '0.7rem', fontWeight: 700 }}>Fila</TableCell>
                        <TableCell sx={{ fontSize: '0.7rem', fontWeight: 700 }}>Nombre</TableCell>
                        <TableCell sx={{ fontSize: '0.7rem', fontWeight: 700 }}>Motivo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {resultado.errores.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{e.fila}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{e.nombre}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#dc2626' }}>{e.motivo}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {cargando && <LinearProgress sx={{ mt: 2 }} />}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={cargando}>
          {resultado ? 'Cerrar' : 'Cancelar'}
        </Button>
        {resultado
          ? <Button variant="outlined" onClick={reset} sx={{ borderColor: COLOR, color: COLOR }}>Importar otro archivo</Button>
          : <Button variant="contained" onClick={importar}
              disabled={!archivo || cargando || filasValidas.length === 0}
              sx={{ bgcolor: COLOR, fontWeight: 700, '&:hover': { bgcolor: '#3b1270' } }}>
              {cargando
                ? <CircularProgress size={20} color="inherit" />
                : `Importar ${filasValidas.length > 0 ? `${filasValidas.length} fila(s)` : ''}`}
            </Button>
        }
      </DialogActions>
    </Dialog>
  );
}
