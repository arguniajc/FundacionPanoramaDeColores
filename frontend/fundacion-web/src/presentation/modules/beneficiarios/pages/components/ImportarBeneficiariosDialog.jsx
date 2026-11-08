import { useState, useRef, useMemo } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, DialogActions,
  DialogContent, DialogTitle, Divider, LinearProgress,
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import UploadFileIcon  from '@mui/icons-material/UploadFile';
import DownloadIcon    from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon       from '@mui/icons-material/Error';
import apiClient from '@/infrastructure/http/apiClient';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { alpha, useTheme } from '@mui/material/styles';
import { colorEstado } from '@/shared/theme/paleta';
import { validarFilaImportacion } from '@/domain/beneficiarios/validacionBeneficiario';

const COLOR = 'primary.main';

/** Topes de la importación: un archivo más grande o con más filas se rechaza antes de leerlo/enviarlo. */
const MAX_MB_EXCEL = 5;
const MAX_FILAS    = 2000;

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
// Mismas reglas que el formulario de beneficiario (domain/beneficiarios/validacionBeneficiario.js):
// la vista previa marca como inválidas las filas que el servidor rechazará.
const validarFila = validarFilaImportacion;

// ── Descarga de plantilla con listas desplegables (exceljs — dynamic import) ───
async function generarPlantilla() {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();

  // ── Hoja 1: Beneficiarios ──
  const ws1 = wb.addWorksheet('Beneficiarios');
  ws1.columns = COLS.map(c => ({ width: c.req ? 22 : 18 }));

  const hRow = ws1.addRow(COLS.map(c => c.header));
  hRow.height = 22;
  COLS.forEach((col, i) => { hRow.getCell(i + 1).note = col.comment; });

  const pRow = ws1.addRow(COLS.map(c => c.vals ? `▼ ${c.vals.join(' / ')}` : c.hint));
  pRow.height = 16;

  for (let i = 0; i < 100; i++) ws1.addRow([]);

  // Listas desplegables en columnas con valores fijos (filas 3–1002)
  COLS.forEach((col, i) => {
    if (!col.vals) return;
    const letra = String.fromCharCode(65 + i);
    ws1.dataValidations.add(`${letra}3:${letra}1002`, {
      type: 'list',
      allowBlank: true,
      formulae: [`"${col.vals.join(',')}"`],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: 'Valor no permitido',
      error: `Seleccione una opción de la lista: ${col.vals.join(', ')}`,
    });
  });

  // ── Hoja 2: Ejemplos ──
  const ws2 = wb.addWorksheet('Ejemplos');
  ws2.columns = COLS.map(c => ({ width: c.req ? 22 : 18 }));
  ws2.addRow(COLS.map(c => c.header));
  ws2.addRow(['Maria',   'Camila', 'Gonzalez', 'Torres',    '2015-03-22', 'TI', '1234567890', 'femenino',  'Sura',      'Ana Torres', 'madre', '3001234567', 'Calle 5 # 10-20',   'Inst. San Jose',   '3', 'nino']);
  ws2.addRow(['Carlos',  '',       'Perez',    '',          '2018-07-14', '',   '',            '',          '',          '',           '',      '',           '',                  '',                 '',  'nino']);
  ws2.addRow(['Roberto', 'Andres', 'Ramirez',  'Gutierrez', '2010-11-05', 'TI', '9876543210', 'masculino', 'Compensar', 'Luis Guti',  'padre', '3209876543', 'Carrera 12 # 5-30', 'Col. Nuevo Siglo', '7', 'nino']);

  // ── Hoja 3: Referencia ──
  const ws3 = wb.addWorksheet('Referencia');
  ws3.columns = [{ width: 22 }, { width: 12 }, { width: 42 }, { width: 20 }];
  ws3.addRow(['Campo', 'Obligatorio', 'Valores válidos / Formato', 'Ejemplo']);
  COLS.forEach(c => ws3.addRow([
    c.header.replace(' *', ''),
    c.req ? 'SÍ' : 'no',
    c.vals ? `▼ ${c.vals.join(', ')}` : c.hint.replace('✓ OBLIGATORIO', '—').replace('opcional', '—'),
    c.header === 'Fecha nacimiento *' ? '2015-03-22'
      : c.header === 'Primer nombre *'   ? 'Maria'
      : c.header === 'Primer apellido *' ? 'Gonzalez'
      : (c.vals ? c.vals[0] : ''),
  ]));
  ws3.addRow([]);
  ws3.addRow(['NOTAS IMPORTANTES']);
  [
    '• Los campos con ▼ tienen lista desplegable — seleccione, no escriba a mano.',
    '• Fecha nacimiento: formato AAAA-MM-DD  (ej: 2015-03-22)',
    '• Campos marcados SÍ son obligatorios. Los demás son opcionales.',
    '• No elimine ni reordene columnas de la hoja Beneficiarios.',
    '• Documentos duplicados serán omitidos automáticamente.',
    '• Fila 1 (encabezados) y fila 2 (pistas) se omiten al importar.',
    '• Llene datos a partir de la fila 3.',
  ].forEach(n => ws3.addRow([n]));

  // Descargar
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'plantilla_beneficiarios_inscripcion.xlsx' });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
export function ImportarBeneficiariosDialog({ open, onClose, onImportado }) {
  const theme    = useTheme();
  const tonoOk   = colorEstado('exito', theme.palette.mode);
  const tonoAv   = colorEstado('aviso', theme.palette.mode);
  const tonoErr  = colorEstado('error', theme.palette.mode);
  const tinte    = alpha(theme.palette.primary.main, 0.06);
  const inputRef = useRef();
  const [archivo,           setArchivo]           = useState(null);
  const [filas,             setFilas]             = useState([]);
  const [cargando,          setCargando]          = useState(false);
  const [resultado,         setResultado]         = useState(null);
  const [error,             setError]             = useState('');
  const [generandoPlantilla, setGenerandoPlantilla] = useState(false);

  const handleGenerarPlantilla = () => {
    setGenerandoPlantilla(true);
    generarPlantilla()
      .catch(() => setError('No se pudo generar la plantilla. Revisa tu conexión e intenta de nuevo.'))
      .finally(() => setGenerandoPlantilla(false));
  };

  const reset = () => {
    setArchivo(null); setFilas([]); setResultado(null); setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => { reset(); onClose(); };

  const handleArchivo = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setArchivo(f); setResultado(null); setError(''); setFilas([]);
    if (!/.xlsx?$/i.test(f.name)) {
      setError('Solo se aceptan archivos de Excel (.xlsx). Descarga la plantilla y llénala.');
      return;
    }
    if (f.size > MAX_MB_EXCEL * 1024 * 1024) {
      setError(`El archivo pesa ${(f.size / 1024 / 1024).toFixed(1)} MB y el máximo es ${MAX_MB_EXCEL} MB. Divídelo en varios archivos de máximo ${MAX_FILAS} filas.`);
      return;
    }
    try {
      const ab = await f.arrayBuffer();
      const XLSX = await import('xlsx');
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

      if (filasParsed.length > MAX_FILAS) {
        setError(`El archivo tiene ${filasParsed.length} filas y el máximo por importación es ${MAX_FILAS}. Divídelo en varios archivos.`);
        return;
      }
      setFilas(filasParsed);
    } catch {
      setError('No se pudo leer el archivo. Asegúrese de usar el formato .xlsx.');
    }
  };

  const erroresPorFila = useMemo(() => filas.map(validarFila), [filas]);

  const importar = async () => {
    const validas = filas.filter((_, i) => erroresPorFila[i].length === 0);
    if (!validas.length) { setError('Ninguna fila es válida. Revise los errores resaltados.'); return; }
    setCargando(true); setError(''); setResultado(null);
    try {
      const { data } = await apiClient.post('/api/beneficiarios/importar-xlsx', validas);
      setResultado(data);
      if (data.insertados > 0) onImportado?.();
    } catch (e) {
      setError(mensajeErrorApi(e, { accion: 'importar los beneficiarios' }));
    } finally {
      setCargando(false);
    }
  };

  const filasValidas   = filas.filter((_, i) => erroresPorFila[i].length === 0);
  const filasInvalidas = filas.filter((_, i) => erroresPorFila[i].length > 0);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR }}>
        Importar beneficiarios desde Excel
      </DialogTitle>
      <DialogContent dividers>
        {/* Plantilla */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5, bgcolor: tinte, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>Descarga la plantilla .xlsx</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.3 }}>
              Incluye <b>nombres amigables</b> en las columnas, pistas de formato en la fila 2,
              hoja de ejemplos y hoja de referencia con valores válidos.
              Los campos marcados con <b>*</b> son obligatorios.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.8 }}>
              {COLS.filter(c => c.req).map(c => (
                <Chip key={c.field} label={c.header.replace(' *', '')} size="small"
                  sx={{ fontSize: '0.65rem', bgcolor: alpha(theme.palette.primary.main, 0.12), color: COLOR, fontWeight: 700, height: 18 }} />
              ))}
              <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', alignSelf: 'center' }}>← obligatorios</Typography>
            </Box>
          </Box>
          <Button variant="outlined" size="small" startIcon={generandoPlantilla ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
            onClick={handleGenerarPlantilla} disabled={generandoPlantilla}
            sx={{ borderColor: COLOR, color: COLOR, whiteSpace: 'nowrap', flexShrink: 0, alignSelf: 'flex-start' }}>
            {generandoPlantilla ? 'Generando…' : 'Plantilla'}
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Zona de carga */}
        {!resultado && (
          <Box
            onClick={() => inputRef.current?.click()}
            sx={{
              border: '2px dashed', borderColor: archivo ? COLOR : 'divider',
              borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer',
              bgcolor: archivo ? tinte : 'transparent',
              '&:hover': { bgcolor: tinte, borderColor: COLOR },
              mb: 2,
            }}
          >
            <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleArchivo} />
            <UploadFileIcon sx={{ fontSize: 36, color: archivo ? COLOR : 'text.disabled', mb: 1 }} />
            <Typography sx={{ fontWeight: 700, color: archivo ? COLOR : 'text.secondary' }}>
              {archivo ? archivo.name : 'Haz clic para seleccionar un archivo .xlsx'}
            </Typography>
            {archivo && (
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
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

        {/* Vista previa — todas las filas con scroll */}
        {filas.length > 0 && !resultado && (
          <Box>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, mb: 1, color: 'text.secondary' }}>
              Vista previa — {filas.length} fila(s) leída(s)
              {filasInvalidas.length > 0 && ` · ${filasInvalidas.length} con errores (resaltadas en rojo)`}:
            </Typography>
            <Box sx={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 300, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'superficie2' }}>
                    <TableCell sx={{ fontSize: '0.7rem', fontWeight: 700, color: COLOR, bgcolor: 'superficie2' }}>#</TableCell>
                    {['Primer nombre','Primer apellido','Fecha nac.','Documento','Acudiente'].map(h => (
                      <TableCell key={h} sx={{ fontSize: '0.7rem', fontWeight: 700, color: COLOR, whiteSpace: 'nowrap', bgcolor: 'superficie2' }}>{h}</TableCell>
                    ))}
                    <TableCell sx={{ fontSize: '0.7rem', fontWeight: 700, color: COLOR, bgcolor: 'superficie2' }}>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filas.map((f, i) => {
                    const errs = erroresPorFila[i];
                    return (
                      <TableRow key={i} sx={{ bgcolor: errs.length ? alpha(theme.palette.error.main, 0.08) : 'inherit' }}>
                        <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{i + 1}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{f.primerNombre || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{f.primerApellido || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{f.fechaNacimiento || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{f.numeroDocumento || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{f.nombreAcudiente || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          {errs.length === 0
                            ? <Chip label="OK" color="success" size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                            : <Box component="span" sx={{ color: 'error.main', fontSize: '0.7rem' }}>{errs.join('; ')}</Box>
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
              <Box sx={{ p: 1.5, bgcolor: tonoOk.fondo, border: '1px solid', borderColor: alpha(theme.palette.success.main, 0.3), borderRadius: 2, flex: 1, textAlign: 'center', minWidth: 100 }}>
                <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: 'success.main' }}>{resultado.insertados}</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Insertados</Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: tonoAv.fondo, border: '1px solid', borderColor: alpha(theme.palette.warning.main, 0.3), borderRadius: 2, flex: 1, textAlign: 'center', minWidth: 100 }}>
                <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: 'warning.main' }}>{resultado.omitidos}</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Omitidos (duplicados)</Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: resultado.errores?.length ? tonoErr.fondo : tonoOk.fondo, border: '1px solid', borderColor: alpha(resultado.errores?.length ? theme.palette.error.main : theme.palette.success.main, 0.3), borderRadius: 2, flex: 1, textAlign: 'center', minWidth: 100 }}>
                <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: resultado.errores?.length ? 'error.main' : 'success.main' }}>{resultado.errores?.length ?? 0}</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Errores</Typography>
              </Box>
            </Box>
            {resultado.errores?.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, mb: 1, color: 'error.main' }}>Filas con error:</Typography>
                <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid', borderColor: alpha(theme.palette.error.main, 0.3), borderRadius: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: tonoErr.fondo }}>
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
                          <TableCell sx={{ fontSize: '0.75rem', color: 'error.main' }}>{e.motivo}</TableCell>
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
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mx: 3, mt: 1.5, mb: 0 }}>
          {error}
        </Alert>
      )}

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={cargando}>
          {resultado ? 'Cerrar' : 'Cancelar'}
        </Button>
        {resultado
          ? <Button variant="outlined" onClick={reset} sx={{ borderColor: COLOR, color: COLOR }}>Importar otro archivo</Button>
          : <Button variant="contained" onClick={importar}
              disabled={!archivo || cargando || filasValidas.length === 0}
              sx={{ bgcolor: COLOR, fontWeight: 700, '&:hover': { bgcolor: 'primary.dark' } }}>
              {cargando
                ? <CircularProgress size={20} color="inherit" />
                : `Importar ${filasValidas.length > 0 ? `${filasValidas.length} fila(s)` : ''}`}
            </Button>
        }
      </DialogActions>
    </Dialog>
  );
}
