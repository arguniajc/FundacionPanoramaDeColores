// Auditoría de descargas de documentos: muestra quién descargó qué y cuándo.
// Llama a GET /api/archivos/log-descargas con paginación del lado del servidor.
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Container, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Pagination, CircularProgress, Alert, TextField, InputAdornment,
} from '@mui/material';
import SearchIcon      from '@mui/icons-material/Search';
import DownloadIcon    from '@mui/icons-material/Download';
import api from '../../services/api';

const POR_PAGINA = 20;

export default function LogDescargas() {
  const [registros,   setRegistros]   = useState([]);
  const [total,       setTotal]       = useState(0);
  const [pagina,      setPagina]      = useState(1);
  const [cargando,    setCargando]    = useState(false);
  const [error,       setError]       = useState('');
  const [buscar,      setBuscar]      = useState('');

  const cargar = useCallback(async (pag) => {
    setCargando(true);
    setError('');
    try {
      const { data } = await api.get('/api/archivos/log-descargas', {
        params: { pagina: pag, porPagina: POR_PAGINA },
      });
      setRegistros(data.data);
      setTotal(data.total);
    } catch {
      setError('No se pudo cargar el registro de descargas.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(pagina); }, [cargar, pagina]);

  const filtrados = buscar.trim()
    ? registros.filter(r =>
        r.usuarioEmail?.toLowerCase().includes(buscar.toLowerCase()) ||
        r.nombreBeneficiario?.toLowerCase().includes(buscar.toLowerCase()))
    : registros;

  const totalPaginas = Math.ceil(total / POR_PAGINA);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Encabezado */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #4E1B95, #2D984F)',
          borderRadius: 3, p: { xs: 2, sm: 3 }, mb: 3, color: 'white',
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <DownloadIcon sx={{ fontSize: 32, opacity: 0.85 }} />
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>
              Log de Descargas
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.3 }}>
              Registro de quién descargó documentos y cuándo
            </Typography>
          </Box>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        {/* Buscador local */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField
            size="small"
            placeholder="Buscar por usuario o beneficiario…"
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
            sx={{ width: { xs: '100%', sm: 340 } }}
          />
        </Box>

        {cargando ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress sx={{ color: '#4E1B95' }} />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fdfbff' }}>
                  {/* xs: solo Usuario y Beneficiario; sm+: todas las columnas */}
                  <TableCell sx={{ fontWeight: 700, color: '#4E1B95' }}>Usuario</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#4E1B95' }}>Beneficiario</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#4E1B95', display: { xs: 'none', sm: 'table-cell' } }}>Tipo</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#4E1B95' }}>Fecha y hora</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No hay registros de descargas todavía.
                    </TableCell>
                  </TableRow>
                ) : filtrados.map(r => (
                  <TableRow key={r.id} hover>
                    {/* Email truncado para no romper el layout */}
                    <TableCell sx={{ fontSize: '0.82rem', maxWidth: { xs: 120, sm: 'none' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.usuarioEmail}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{r.nombreBeneficiario}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Chip label={r.tipoArchivo} size="small" sx={{ bgcolor: '#f0eaff', color: '#4E1B95', fontWeight: 600, fontSize: '0.72rem' }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {new Date(r.descargadoEn).toLocaleString('es-CO', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {totalPaginas > 1 && (
          <Box display="flex" justifyContent="center" py={2}>
            <Pagination
              count={totalPaginas}
              page={pagina}
              onChange={(_, v) => setPagina(v)}
              color="primary"
              size="small"
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
