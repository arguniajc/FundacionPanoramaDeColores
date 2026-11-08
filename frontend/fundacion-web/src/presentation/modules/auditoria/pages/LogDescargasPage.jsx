// Auditoría de descargas: quién descargó qué documento y quién exportó listados (Excel/PDF), y cuándo.
import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Pagination, Alert, TextField, InputAdornment,
} from '@mui/material';
import SearchIcon    from '@mui/icons-material/Search';
import DownloadIcon  from '@mui/icons-material/Download';
import apiClient     from '@/infrastructure/http/apiClient';
import SkeletonTabla from '@/shared/components/SkeletonTabla';
import { useAsyncData } from '@/shared/hooks/useAsyncData';
import { useTheme } from '@mui/material/styles';
import { colorEstado } from '@/shared/theme/paleta';

const POR_PAGINA = 20;
const CABECERA = { fontWeight: 700, color: 'var(--color-primario-texto)' };

const fechaHora = f => new Date(f).toLocaleString('es-CO', {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});

/** Tabla paginada de un registro de auditoría con búsqueda en la página cargada. */
function TablaLog({ url, errorMsg, placeholder, columnas, coincide, fila, vacio }) {
  const [pagina, setPagina] = useState(1);
  const [buscar, setBuscar] = useState('');

  const { data: resultado, cargando, error, ejecutar: cargar } = useAsyncData(
    async (pag) => (await apiClient.get(url, { params: { pagina: pag, porPagina: POR_PAGINA } })).data,
    { errorMsg }
  );

  // Recarga los registros cuando cambia el número de página activa
  useEffect(() => { cargar(pagina); }, [cargar, pagina]);

  const registros = resultado?.data ?? [];
  const q = buscar.trim().toLowerCase();
  const filtrados = q ? registros.filter(r => coincide(r, q)) : registros;
  const totalPaginas = Math.ceil((resultado?.total ?? 0) / POR_PAGINA);

  return (
    <>
      {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          size="small" placeholder={placeholder} value={buscar} onChange={e => setBuscar(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          sx={{ width: { xs: '100%', sm: 340 } }}
        />
      </Box>

      {cargando ? (
        <SkeletonTabla columnas={columnas.length} filas={8} />
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columnas.map(c => (
                  <TableCell key={c.titulo} sx={{ ...CABECERA, ...(c.ocultarEnCelular && { display: { xs: 'none', sm: 'table-cell' } }) }}>
                    {c.titulo}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnas.length} align="center" sx={{ py: 4, color: 'text.secondary' }}>{vacio}</TableCell>
                </TableRow>
              ) : filtrados.map(fila)}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {totalPaginas > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <Pagination count={totalPaginas} page={pagina} onChange={(_, v) => setPagina(v)} color="primary" size="small" />
        </Box>
      )}
    </>
  );
}

const celdaUsuario = { fontSize: '0.82rem', maxWidth: { xs: 120, sm: 'none' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const celdaFecha   = { fontSize: '0.78rem', color: 'text.secondary', whiteSpace: 'nowrap' };

export default function LogDescargasPage() {
  const theme = useTheme();
  const tono = colorEstado('marca', theme.palette.mode);
  const chip = texto => (
    <Chip label={texto} size="small" sx={{ bgcolor: tono.fondo, color: tono.texto, fontWeight: 600, fontSize: '0.72rem' }} />
  );
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{
        background: 'linear-gradient(135deg, var(--color-primario), var(--color-secundario))',
        borderRadius: 3, p: { xs: 2, sm: 3 }, mb: 3, color: 'white',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DownloadIcon sx={{ fontSize: 32, opacity: 0.85 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>Log de Descargas</Typography>
            <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.3 }}>
              Quién descargó documentos o exportó listados, y cuándo
            </Typography>
          </Box>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab label="Documentos" />
          <Tab label="Exportaciones" />
        </Tabs>

        {tab === 0 && (
          <TablaLog
            url="/api/archivos/log-descargas"
            errorMsg="No se pudo cargar el registro de descargas."
            placeholder="Buscar por usuario o beneficiario…"
            vacio="No hay registros de descargas todavía."
            columnas={[{ titulo: 'Usuario' }, { titulo: 'Beneficiario' }, { titulo: 'Tipo', ocultarEnCelular: true }, { titulo: 'Fecha y hora' }]}
            coincide={(r, q) => r.usuarioEmail?.toLowerCase().includes(q) || r.nombreBeneficiario?.toLowerCase().includes(q)}
            fila={r => (
              <TableRow key={r.id} hover>
                <TableCell sx={celdaUsuario}>{r.usuarioEmail}</TableCell>
                <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{r.nombreBeneficiario}</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{chip(r.tipoArchivo)}</TableCell>
                <TableCell sx={celdaFecha}>{fechaHora(r.descargadoEn)}</TableCell>
              </TableRow>
            )}
          />
        )}

        {tab === 1 && (
          <TablaLog
            url="/api/archivos/log-exportaciones"
            errorMsg="No se pudo cargar el registro de exportaciones."
            placeholder="Buscar por usuario, archivo o módulo…"
            vacio="No hay exportaciones registradas todavía."
            columnas={[{ titulo: 'Usuario' }, { titulo: 'Archivo' }, { titulo: 'Módulo', ocultarEnCelular: true }, { titulo: 'Registros', ocultarEnCelular: true }, { titulo: 'Fecha y hora' }]}
            coincide={(r, q) => [r.usuarioEmail, r.archivo, r.modulo].some(v => v?.toLowerCase().includes(q))}
            fila={r => (
              <TableRow key={r.id} hover>
                <TableCell sx={celdaUsuario}>{r.usuarioEmail}</TableCell>
                <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600, wordBreak: 'break-all' }}>{r.archivo}</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{chip(r.modulo ?? '—')}</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: '0.82rem' }}>{r.registros || '—'}</TableCell>
                <TableCell sx={celdaFecha}>{fechaHora(r.exportadoEn)}</TableCell>
              </TableRow>
            )}
          />
        )}
      </Paper>
    </Box>
  );
}
