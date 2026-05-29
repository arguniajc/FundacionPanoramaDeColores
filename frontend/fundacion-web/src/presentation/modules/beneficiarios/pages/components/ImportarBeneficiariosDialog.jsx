import { useState, useRef } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, LinearProgress,
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon   from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon      from '@mui/icons-material/Error';
import * as XLSX from 'xlsx';
import apiClient from '@/infrastructure/http/apiClient';
import { BRAND_COLOR } from '@/shared/constants/brand';

const COLOR = BRAND_COLOR;

const COL_MAP = {
  PRIMER_NOMBRE:       'primerNombre',
  SEGUNDO_NOMBRE:      'segundoNombre',
  PRIMER_APELLIDO:     'primerApellido',
  SEGUNDO_APELLIDO:    'segundoApellido',
  FECHA_NACIMIENTO:    'fechaNacimiento',
  TIPO_DOCUMENTO:      'tipoDocumento',
  NUMERO_DOCUMENTO:    'numeroDocumento',
  GENERO:              'genero',
  EPS:                 'eps',
  NOMBRE_ACUDIENTE:    'nombreAcudiente',
  PARENTESCO:          'parentesco',
  WHATSAPP:            'whatsapp',
  DIRECCION:           'direccion',
  COLEGIO:             'nombreColegio',
  GRADO_ESCOLAR:       'gradoEscolar',
  TIPO:                'tipo',
};

const HEADERS = Object.keys(COL_MAP);

const EJEMPLO = {
  PRIMER_NOMBRE:    'María',
  SEGUNDO_NOMBRE:   'Camila',
  PRIMER_APELLIDO:  'González',
  SEGUNDO_APELLIDO: 'Torres',
  FECHA_NACIMIENTO: '2015-03-22',
  TIPO_DOCUMENTO:   'TI',
  NUMERO_DOCUMENTO: '1234567890',
  GENERO:           'femenino',
  EPS:              'Sura',
  NOMBRE_ACUDIENTE: 'Ana Torres',
  PARENTESCO:       'madre',
  WHATSAPP:         '3001234567',
  DIRECCION:        'Calle 5 # 10-20',
  COLEGIO:          'Inst. Educativa San José',
  GRADO_ESCOLAR:    '3',
  TIPO:             'niño',
};

function validarFila(f) {
  const errs = [];
  if (!f.primerNombre)   errs.push('PRIMER_NOMBRE requerido');
  if (!f.primerApellido) errs.push('PRIMER_APELLIDO requerido');
  if (!f.fechaNacimiento) {
    errs.push('FECHA_NACIMIENTO requerida');
  } else {
    const d = Date.parse(f.fechaNacimiento);
    if (isNaN(d)) errs.push('FECHA_NACIMIENTO inválida (use AAAA-MM-DD)');
  }
  return errs;
}

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
      const rawRows = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '', dateNF: 'yyyy-mm-dd' });
      const parsed = rawRows.map(row => {
        const mapped = {};
        Object.entries(row).forEach(([k, v]) => {
          const key = k.toString().trim().toUpperCase().replace(/\s+/g, '_');
          const campo = COL_MAP[key];
          if (campo) mapped[campo] = (v ?? '').toString().trim();
        });
        return mapped;
      }).filter(r => Object.values(r).some(v => v !== ''));
      setFilas(parsed);
    } catch {
      setError('No se pudo leer el archivo Excel. Asegúrese de usar el formato .xlsx.');
    }
  };

  const descargarPlantilla = () => {
    const wb  = XLSX.utils.book_new();
    const ws  = XLSX.utils.aoa_to_sheet([HEADERS, Object.values(EJEMPLO)]);
    ws['!cols'] = HEADERS.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');

    const instrucciones = [
      ['Campo', 'Obligatorio', 'Descripción / Valores'],
      ['PRIMER_NOMBRE',    'Sí',  'Primer nombre del beneficiario'],
      ['SEGUNDO_NOMBRE',   'No',  'Segundo nombre (opcional)'],
      ['PRIMER_APELLIDO',  'Sí',  'Primer apellido'],
      ['SEGUNDO_APELLIDO', 'No',  'Segundo apellido (opcional)'],
      ['FECHA_NACIMIENTO', 'Sí',  'Formato AAAA-MM-DD  (ej: 2015-03-22)'],
      ['TIPO_DOCUMENTO',   'No',  'TI, CC, CE, RC, NUI, PA, etc.'],
      ['NUMERO_DOCUMENTO', 'No',  'Número del documento de identidad'],
      ['GENERO',           'No',  'masculino / femenino / otro'],
      ['EPS',              'No',  'Nombre de la EPS (ej: Sura, Compensar)'],
      ['NOMBRE_ACUDIENTE', 'No',  'Nombre completo del acudiente'],
      ['PARENTESCO',       'No',  'madre / padre / abuelo(a) / otro'],
      ['WHATSAPP',         'No',  'Número de WhatsApp del acudiente'],
      ['DIRECCION',        'No',  'Dirección del acudiente'],
      ['COLEGIO',          'No',  'Nombre del colegio'],
      ['GRADO_ESCOLAR',    'No',  'Grado escolar (ej: 3, 4, jardín)'],
      ['TIPO',             'No',  'niño (default) / adulto'],
    ];
    const wsI = XLSX.utils.aoa_to_sheet(instrucciones);
    wsI['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsI, 'Instrucciones');

    XLSX.writeFile(wb, 'plantilla_beneficiarios.xlsx');
  };

  const importar = async () => {
    if (!filas.length) return;
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
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: '#f5f0ff', borderRadius: 2, border: '1px solid #e2d9f3' }}>
          <Box flex={1}>
            <Typography fontWeight={700} fontSize="0.85rem">Descarga la plantilla .xlsx</Typography>
            <Typography fontSize="0.72rem" color="text.secondary">
              Incluye columnas pre-configuradas + hoja de instrucciones
            </Typography>
          </Box>
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={descargarPlantilla}
            sx={{ borderColor: COLOR, color: COLOR, whiteSpace: 'nowrap', flexShrink: 0 }}>
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
                    {['PRIMER_NOMBRE','PRIMER_APELLIDO','FECHA_NACIMIENTO','DOCUMENTO','ACUDIENTE'].map(h => (
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
                        <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{i + 2}</TableCell>
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
                : `Importar ${filasValidas.length > 0 ? filasValidas.length : ''} fila(s)`}
            </Button>
        }
      </DialogActions>
    </Dialog>
  );
}
