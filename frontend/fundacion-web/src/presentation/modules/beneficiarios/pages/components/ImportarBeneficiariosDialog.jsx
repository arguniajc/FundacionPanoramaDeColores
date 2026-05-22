import { useState, useRef } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, LinearProgress,
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import UploadFileIcon  from '@mui/icons-material/UploadFile';
import DownloadIcon    from '@mui/icons-material/Download';
import * as XLSX from 'xlsx';
import apiClient from '../../../../../infrastructure/http/apiClient';

const COLOR = '#4E1B95';

const TEMPLATE_HEADERS = [
  'nombre', 'fecha_nacimiento', 'tipo_documento', 'numero_documento',
  'genero', 'pais_nacimiento', 'departamento_nacimiento', 'ciudad_nacimiento',
  'barrio', 'nombre_colegio', 'grado_escolar',
];

export function ImportarBeneficiariosDialog({ open, onClose, onImportado }) {
  const inputRef = useRef();
  const [archivo,   setArchivo]   = useState(null);
  const [headers,   setHeaders]   = useState([]);
  const [preview,   setPreview]   = useState([]);
  const [cargando,  setCargando]  = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error,     setError]     = useState('');

  const reset = () => {
    setArchivo(null); setHeaders([]); setPreview([]);
    setResultado(null); setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => { reset(); onClose(); };

  const handleArchivo = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setArchivo(f); setResultado(null); setError('');
    const reader = new FileReader();
    reader.onload = ({ target }) => {
      const lines = (target.result ?? '').split(/\r?\n/).filter(l => l.trim());
      if (!lines.length) return;
      const rows = lines.slice(0, 6).map(l =>
        l.split(',').map(c => c.replace(/^"|"$/g, '').trim())
      );
      setHeaders(rows[0] ?? []);
      setPreview(rows.slice(1));
    };
    reader.readAsText(f);
  };

  const descargarPlantilla = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, 'plantilla_beneficiarios.csv', { bookType: 'csv' });
  };

  const importar = async () => {
    if (!archivo) return;
    setCargando(true); setError(''); setResultado(null);
    try {
      const fd = new FormData();
      fd.append('archivo', archivo);
      const { data } = await apiClient.post('/api/beneficiarios/importar-csv', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResultado(data);
      if (data.insertados > 0) onImportado?.();
    } catch (e) {
      setError(e?.response?.data?.mensaje || 'Error al importar el archivo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR }}>
        Importar beneficiarios desde CSV
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Plantilla */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: '#f5f0ff', borderRadius: 2, border: '1px solid #e2d9f3' }}>
          <Box flex={1}>
            <Typography fontWeight={700} fontSize="0.85rem">Descarga la plantilla CSV</Typography>
            <Typography fontSize="0.72rem" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
              Columnas: {TEMPLATE_HEADERS.join(', ')}
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
            <input ref={inputRef} type="file" accept=".csv" hidden onChange={handleArchivo} />
            <UploadFileIcon sx={{ fontSize: 36, color: archivo ? COLOR : '#9e9e9e', mb: 1 }} />
            <Typography fontWeight={700} color={archivo ? COLOR : 'text.secondary'}>
              {archivo ? archivo.name : 'Haz clic para seleccionar un archivo CSV'}
            </Typography>
            {archivo && (
              <Typography fontSize="0.75rem" color="text.secondary" mt={0.5}>
                {(archivo.size / 1024).toFixed(1)} KB
              </Typography>
            )}
          </Box>
        )}

        {/* Vista previa */}
        {preview.length > 0 && !resultado && (
          <Box>
            <Typography fontSize="0.8rem" fontWeight={700} mb={1} color="text.secondary">
              Vista previa (primeras {preview.length} filas):
            </Typography>
            <Box sx={{ overflowX: 'auto', borderRadius: 1, border: '1px solid #e0e0e0' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f0ff' }}>
                    {headers.map((h, i) => (
                      <TableCell key={i} sx={{ fontSize: '0.7rem', fontWeight: 700, color: COLOR, whiteSpace: 'nowrap' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.map((row, ri) => (
                    <TableRow key={ri}>
                      {row.map((cell, ci) => (
                        <TableCell key={ci} sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{cell || '—'}</TableCell>
                      ))}
                    </TableRow>
                  ))}
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
          : <Button variant="contained" onClick={importar} disabled={!archivo || cargando}
              sx={{ bgcolor: COLOR, fontWeight: 700, '&:hover': { bgcolor: '#3b1270' } }}>
              {cargando ? <CircularProgress size={20} color="inherit" /> : 'Importar'}
            </Button>
        }
      </DialogActions>
    </Dialog>
  );
}
