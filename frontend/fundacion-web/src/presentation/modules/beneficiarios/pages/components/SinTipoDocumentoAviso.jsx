// Aviso + diálogo para corregir beneficiarios sin tipo de documento (tipo_documento_id NULL):
// quienes se guardaron con PA, RAMV, PEP, "Sin documento" u "Otro" antes de que el catálogo de la
// base de datos tuviera esos códigos. Solo se muestra si hay registros así y el usuario puede
// editar beneficiarios. La API sugiere el tipo probable (o ninguno: revisar a mano).
import { useState, useEffect } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, DialogContent, DialogTitle, IconButton, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Dialog from '@/shared/components/DialogResponsive';
import AccionesDialogo from '@/shared/components/form/AccionesDialogo';
import ErrorServidor from '@/shared/components/form/ErrorServidor';
import CloseIcon from '@mui/icons-material/Close';
import BadgeIcon from '@mui/icons-material/Badge';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import apiClient from '@/infrastructure/http/apiClient';
import { useAuth } from '@/application/auth/useAuth';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { calcularEdad } from '@/shared/utils/fecha';
import { colorEstado } from '@/shared/theme/paleta';
import { etiquetaTipoDocumento } from '@/shared/constants/tiposDocumento';
import {
  opcionesParaCorregir, textoAviso, motivoSugerencia, avisoSeleccion, correccionesSugeridas, quitarCorregidos,
} from '@/domain/beneficiarios/sinTipoDocumento';

const URL_LISTA = '/api/beneficiarios/sin-tipo-documento';

function FilaCorreccion({ fila, valor, onCambiar, onGuardar, guardando, error, bloqueado }) {
  const aviso = avisoSeleccion(fila, valor);
  const idSelect = `tipo-doc-${fila.id}`;
  return (
    <TableRow sx={{
      '&:last-child td': { borderBottom: 0 }, verticalAlign: 'top',
      // En celular cada fila es una tarjeta: nombre, selector y botón uno debajo del otro
      display: { xs: 'flex', sm: 'table-row' }, flexDirection: 'column',
      borderBottom: { xs: 1, sm: 0 }, borderColor: 'divider', py: { xs: 1, sm: 0 },
      '@media (max-width: 599.95px)': { '& > td': { borderBottom: 0, py: 0.75 } },
    }}>
      <TableCell sx={{ fontSize: '0.85rem', minWidth: { sm: 160 } }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>{fila.nombre}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          <Box component="span" sx={{ display: { sm: 'none' } }}>{fila.numeroDocumento || 'Sin número'} · </Box>
          {calcularEdad(fila.fechaNacimiento)}{fila.activo ? '' : ' · De baja'}
        </Typography>
      </TableCell>
      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
        {fila.numeroDocumento || <Box component="span" sx={{ color: 'text.secondary' }}>—</Box>}
      </TableCell>
      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, minWidth: 150 }}>
        {fila.sugerencia
          ? <Chip size="small" label={fila.sugerencia} color="info" variant="outlined" sx={{ fontWeight: 700 }} />
          : <Chip size="small" label="Revisar a mano" color="warning" variant="outlined" sx={{ fontWeight: 700 }} />}
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.4 }}>
          {motivoSugerencia(fila)}
        </Typography>
      </TableCell>
      <TableCell sx={{ minWidth: { sm: 170 } }}>
        <TextField
          select size="small" fullWidth id={idSelect} label="Tipo"
          value={valor} onChange={e => onCambiar(fila.id, e.target.value)}
          disabled={bloqueado}
          error={!!error}
          helperText={error || aviso || (fila.sugerencia ? '' : 'Elige el tipo')}
        >
          {opcionesParaCorregir(fila.tipo, fila.sugerencia).map(o => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </TextField>
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap', pt: { sm: 1.5 } }}>
        <Button
          size="small" variant="contained"
          onClick={() => onGuardar(fila)}
          disabled={!valor || bloqueado}
          aria-label={`Guardar tipo de documento de ${fila.nombre}`}
          sx={{ position: 'relative', fontWeight: 700, width: { xs: '100%', sm: 'auto' } }}
        >
          <Box component="span" sx={{ visibility: guardando ? 'hidden' : 'visible' }}>Guardar</Box>
          {guardando && <CircularProgress size={16} color="inherit" aria-label="Guardando"
            sx={{ position: 'absolute', top: '50%', left: '50%', mt: '-8px', ml: '-8px' }} />}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function SinTipoDocumentoDialog({ open, onClose, filas, onCorregidos, tipo }) {
  const theme = useTheme();
  const tono  = colorEstado('aviso', theme.palette.mode);
  const [valores,     setValores]     = useState({});   // id → tipo elegido (por defecto, la sugerencia)
  const [errores,     setErrores]     = useState({});   // id → mensaje del servidor
  const [guardandoId, setGuardandoId] = useState(null);
  const [aplicando,   setAplicando]   = useState(false);
  const [errorLote,   setErrorLote]   = useState('');

  const valorDe   = f => valores[f.id] ?? f.sugerencia ?? '';
  const sugeridas = correccionesSugeridas(filas);
  const ocupado   = aplicando || guardandoId !== null;

  const cambiar = (id, v) => {
    setValores(prev => ({ ...prev, [id]: v }));
    setErrores(prev => ({ ...prev, [id]: '' }));
  };

  const guardar = async fila => {
    const tipoDocumento = valorDe(fila);
    setGuardandoId(fila.id); setErrores(prev => ({ ...prev, [fila.id]: '' }));
    try {
      await apiClient.patch(`/api/beneficiarios/${fila.id}/tipo-documento`, { tipoDocumento });
      onCorregidos([fila.id], `Tipo de documento de ${fila.nombre}: ${etiquetaTipoDocumento(tipoDocumento)}`);
    } catch (err) {
      setErrores(prev => ({ ...prev, [fila.id]: mensajeErrorApi(err, { accion: 'guardar el tipo de documento' }) }));
    } finally { setGuardandoId(null); }
  };

  const aplicarTodas = async () => {
    if (!sugeridas.length) return;
    setAplicando(true); setErrorLote('');
    try {
      const { data } = await apiClient.patch('/api/beneficiarios/tipo-documento/lote', sugeridas);
      const n = data?.actualizados ?? sugeridas.length;
      onCorregidos(sugeridas.map(s => s.id), `${n} tipo${n === 1 ? '' : 's'} de documento corregido${n === 1 ? '' : 's'}`);
    } catch (err) {
      setErrorLote(mensajeErrorApi(err, { accion: 'aplicar las sugerencias' }));
    } finally { setAplicando(false); }
  };

  const cerrar = () => { if (!ocupado) { setErrorLote(''); onClose(); } };

  return (
    <Dialog open={open} onClose={cerrar} bloqueado={ocupado} maxWidth="md" fullWidth scroll="paper"
      aria-labelledby="sin-tipo-doc-titulo">
      <DialogTitle id="sin-tipo-doc-titulo" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: tono.fondo, pr: 6 }}>
        <BadgeIcon sx={{ color: tono.texto, flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <Typography component="span" sx={{ fontWeight: 800, fontSize: '1rem', color: tono.texto, display: 'block' }}>
            Beneficiarios sin tipo de documento
          </Typography>
          <Typography component="span" sx={{ fontSize: '0.75rem', color: tono.texto, display: 'block' }}>
            Se guardaron con un tipo que el sistema no reconocía (PA, RAMV, PEP, Sin documento u Otro). Elige el correcto.
          </Typography>
        </Box>
        <IconButton onClick={cerrar} size="small" aria-label="Cerrar" disabled={ocupado}
          sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: { xs: 1, sm: 2 }, py: 1 }}>
        {filas.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 4 }}>
            <CheckCircleIcon sx={{ color: 'success.main' }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Todos los {tipo === 'adulto' ? 'adultos' : 'niños'} tienen tipo de documento.
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" aria-label="Beneficiarios sin tipo de documento">
              <TableHead>
                <TableRow sx={{ display: { xs: 'none', sm: 'table-row' }, '& .MuiTableCell-root': { fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' } }}>
                  <TableCell>Nombre</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Número</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Sugerencia</TableCell>
                  <TableCell>Tipo de documento</TableCell>
                  <TableCell><Box component="span" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Acción</Box></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filas.map(f => (
                  <FilaCorreccion
                    key={f.id} fila={f} valor={valorDe(f)}
                    onCambiar={cambiar} onGuardar={guardar}
                    guardando={guardandoId === f.id} error={errores[f.id]}
                    bloqueado={ocupado}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <ErrorServidor mensaje={errorLote} onClose={() => setErrorLote('')} titulo="No se aplicaron las sugerencias" />
      <AccionesDialogo
        onCancelar={cerrar} textoCancelar="Cerrar"
        onGuardar={aplicarTodas} guardando={aplicando}
        deshabilitado={!sugeridas.length || guardandoId !== null}
        textoGuardar={`Aplicar todas las sugerencias (${sugeridas.length})`}
        sx={{ pt: 1.5, flexWrap: 'wrap' }}
      />
    </Dialog>
  );
}

/**
 * Aviso de la página de Beneficiarios (niños o adultos). `onCorregido(mensaje)` se llama tras cada
 * corrección (la página muestra el toast y recarga su listado).
 */
export function SinTipoDocumentoAviso({ tipo = 'niño', onCorregido }) {
  const { puedo } = useAuth();
  const puedeEditar = puedo('beneficiarios', 'editar');
  const [filas,   setFilas]   = useState([]);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!puedeEditar) return undefined;
    let vigente = true;
    apiClient.get(URL_LISTA, { params: { tipo } })
      .then(({ data }) => { if (vigente) setFilas(Array.isArray(data) ? data : []); })
      .catch(() => { /* aviso opcional: si falla, simplemente no se muestra */ });
    return () => { vigente = false; };
  }, [puedeEditar, tipo]);

  const corregidos = (ids, mensaje) => {
    setFilas(prev => quitarCorregidos(prev, ids));
    onCorregido?.(mensaje);
  };

  if (!puedeEditar || (filas.length === 0 && !abierto)) return null;

  return (
    <>
      {filas.length > 0 && (
        <Alert
          severity="warning" icon={<BadgeIcon fontSize="inherit" />} sx={{ mb: 2, alignItems: 'center' }}
          action={
            <Button color="inherit" size="small" variant="outlined" onClick={() => setAbierto(true)}
              sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
              Revisar
            </Button>
          }
        >
          <strong>{textoAviso(filas.length)}</strong>
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}> — elige el tipo correcto para que sus datos queden completos.</Box>
        </Alert>
      )}
      <SinTipoDocumentoDialog
        open={abierto} onClose={() => setAbierto(false)}
        filas={filas} onCorregidos={corregidos} tipo={tipo}
      />
    </>
  );
}
