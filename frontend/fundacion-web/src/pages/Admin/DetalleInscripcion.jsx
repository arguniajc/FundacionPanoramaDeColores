/**
 * DetalleInscripcion
 * Modal que muestra todos los datos de un beneficiario.
 * El documento de identidad solo se descarga (nunca se muestra en pantalla)
 * y cada descarga queda registrada en auditoría.
 *
 * Props:
 *   inscripcion  – objeto beneficiario
 *   onCerrar     – cierra el modal
 *   onEditar     – abre el formulario de edición
 */
import { useState } from 'react';
import { flushSync } from 'react-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon               from '@mui/icons-material/Close';
import DownloadIcon            from '@mui/icons-material/Download';
import EditIcon                from '@mui/icons-material/Edit';
import PictureAsPdfIcon        from '@mui/icons-material/PictureAsPdf';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import WhatsAppIcon            from '@mui/icons-material/WhatsApp';

import api               from '../../services/api';
import { calcularEdad }  from '../../utils/fecha';
import { abrirHojaDeVida } from '../../utils/pdf';

// ─── Colores principales ────────────────────────────────────────────────────
const COLOR_PRIMARIO  = '#4E1B95';
const COLOR_HOVER     = '#3a1470';

// ─── Subcomponentes locales ──────────────────────────────────────────────────

/** Fila de etiqueta + valor para las secciones de datos */
function Campo({ label, value, children }) {
  return (
    <Box mb={1.5}>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        fontWeight={700}
        sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
      >
        {label}
      </Typography>
      {children ?? (
        <Typography variant="body2" fontWeight={500}>
          {value || '—'}
        </Typography>
      )}
    </Box>
  );
}

/** Tarjeta pequeña que muestra una talla (camisa, pantalón o zapatos) */
function TallaCard({ icono, valor, etiqueta }) {
  return (
    <Box
      textAlign="center"
      sx={{
        flex: 1,
        minWidth: 0,
        bgcolor: '#fdfbff',
        border: '1px solid #f0eaff',
        borderRadius: 2,
        py: { xs: 1, sm: 1.5 },
        px: { xs: 0.5, sm: 1 },
      }}
    >
      <Typography sx={{ fontSize: { xs: '1.1rem', sm: '1.4rem' } }}>
        {icono}
      </Typography>
      <Typography
        fontWeight={800}
        sx={{ color: '#000', fontSize: { xs: '0.9rem', sm: '1.25rem' }, lineHeight: 1.2 }}
      >
        {valor || '—'}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', fontSize: { xs: '0.62rem', sm: '0.75rem' } }}
      >
        {etiqueta}
      </Typography>
    </Box>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function DetalleInscripcion({ inscripcion: ins, onCerrar, onEditar }) {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const edad     = calcularEdad(ins.fechaNacimiento);

  const [descargando,   setDescargando]   = useState(false);
  const [errorDescarga, setErrorDescarga] = useState('');

  // ── Descarga del documento de identidad ──────────────────────────────────
  const handleDescargar = async () => {
    if (descargando) return;

    // flushSync garantiza que el spinner se pinte ANTES de continuar
    flushSync(() => {
      setDescargando(true);
      setErrorDescarga('');
    });

    const tInicio = Date.now();

    try {
      // Registro de auditoría (nunca bloquea la descarga si falla)
      await api.post('/api/archivos/log-descarga', {
        beneficiarioId: ins.id,
        tipoArchivo:    'documento',
        urlArchivo:     ins.fotoDocumentoUrl,
      }).catch(() => {});

      // Anchor directo: sin fetch ni problemas de CORS
      const nombre = ins.nombreMenor?.replace(/\s+/g, '_') ?? 'beneficiario';
      const anchor = document.createElement('a');
      anchor.href     = ins.fotoDocumentoUrl;
      anchor.download = `documento_${nombre}.pdf`;
      anchor.target   = '_blank';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

    } catch {
      setErrorDescarga('No se pudo iniciar la descarga. Intenta de nuevo.');

    } finally {
      // Mantener el spinner visible al menos 1.2 s para que sea perceptible
      const restante = 1200 - (Date.now() - tInicio);
      if (restante > 0) await new Promise(r => setTimeout(r, restante));
      setDescargando(false);
    }
  };

  const generarPDF = () => abrirHojaDeVida(ins, edad);

  // ── Iniciales del beneficiario para el Avatar ────────────────────────────
  const iniciales = (ins.nombreMenor || '??')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // ── JSX ──────────────────────────────────────────────────────────────────
  return (
    <Dialog
      open
      onClose={onCerrar}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}
    >

      {/* ── Encabezado ────────────────────────────────────────────────────── */}
      <DialogTitle
        sx={{
          bgcolor: COLOR_PRIMARIO,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1.5, sm: 2 },
          py: { xs: 1.5, sm: 2 },
          px: { xs: 2, sm: 3 },
        }}
      >
        <Avatar
          src={ins.fotoMenorUrl || undefined}
          sx={{
            bgcolor: 'rgba(255,255,255,0.2)',
            width: { xs: 40, sm: 48 },
            height: { xs: 40, sm: 48 },
            flexShrink: 0,
            fontSize: { xs: '0.9rem', sm: '1rem' },
          }}
        >
          {iniciales}
        </Avatar>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            fontWeight={800}
            noWrap
            sx={{ color: 'white', lineHeight: 1.3, fontSize: { xs: '1rem', sm: '1.25rem' } }}
          >
            {ins.nombreMenor}
          </Typography>
          <Typography variant="caption" display="block" sx={{ opacity: 0.75, mt: 0.2 }}>
            {ins.tipoDocumento}&nbsp;·&nbsp;{ins.numeroDocumento || 'Sin documento'}
          </Typography>
          <Typography variant="caption" display="block" sx={{ opacity: 0.6 }}>
            {edad}
          </Typography>
        </Box>

        {/* En pantalla completa (mobile) el botón cerrar va en el header */}
        {isMobile && (
          <IconButton onClick={onCerrar} size="small" sx={{ color: 'white', flexShrink: 0 }}>
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      {/* ── Contenido ─────────────────────────────────────────────────────── */}
      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 } }}>
        <Grid container spacing={{ xs: 1.5, sm: 2 }} mt={0}>

          {/* Sección: Datos personales */}
          <Grid size={12}>
            <Typography variant="subtitle2" color={COLOR_PRIMARIO} fontWeight={700}>
              Datos Personales
            </Typography>
            <Divider sx={{ mt: 0.5, mb: 1.5 }} />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Campo label="Nombre completo"     value={ins.nombreMenor} />
            <Campo label="Fecha de nacimiento" value={ins.fechaNacimiento} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Campo label="Tipo de documento"   value={ins.tipoDocumento} />
            <Campo label="Número de documento" value={ins.numeroDocumento || 'Sin documento'} />
            <Campo label="EPS"                 value={ins.eps} />
          </Grid>
          <Grid size={12}>
            <Campo label="Dirección" value={ins.direccion} />
          </Grid>

          {/* Sección: Tallas */}
          <Grid size={12}>
            <Typography variant="subtitle2" color={COLOR_PRIMARIO} fontWeight={700}>
              Tallas
            </Typography>
            <Divider sx={{ mt: 0.5, mb: 1.5 }} />
            <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5 } }}>
              <TallaCard icono="👕" valor={ins.tallaCamisa}   etiqueta="Camisa"   />
              <TallaCard icono="👖" valor={ins.tallaPantalon} etiqueta="Pantalón" />
              <TallaCard icono="👟" valor={ins.tallaZapatos}  etiqueta="Zapatos"  />
            </Box>
            <Box mt={2} display="flex" alignItems="center" gap={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={700}
                sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Tiene alergia:
              </Typography>
              <Chip
                label={ins.tieneAlergia === 'si' ? '⚠️ Sí' : '✓ No'}
                color={ins.tieneAlergia === 'si' ? 'warning' : 'success'}
                size="small"
              />
            </Box>
          </Grid>

          {/* Sección: Salud (solo si hay alergia u observaciones) */}
          {(ins.tieneAlergia === 'si' || ins.observacionesSalud) && (
            <>
              <Grid size={12}>
                <Typography variant="subtitle2" color={COLOR_PRIMARIO} fontWeight={700} mt={1}>
                  Salud
                </Typography>
                <Divider sx={{ mt: 0.5, mb: 1.5 }} />
              </Grid>

              {ins.tieneAlergia === 'si' && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{
                    bgcolor: '#fff5f5',
                    border: '1.5px solid #fed7d7',
                    borderRadius: 2,
                    p: 1.5,
                  }}>
                    <Typography variant="caption" color="error" fontWeight={700} display="block">
                      DESCRIPCIÓN DE LA ALERGIA
                    </Typography>
                    <Typography variant="body2" color="error.dark">
                      {ins.descripcionAlergia || '—'}
                    </Typography>
                  </Box>
                </Grid>
              )}

              {ins.observacionesSalud && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Campo label="Observaciones de salud" value={ins.observacionesSalud} />
                </Grid>
              )}
            </>
          )}

          {/* Sección: Acudiente */}
          <Grid size={12}>
            <Typography variant="subtitle2" color={COLOR_PRIMARIO} fontWeight={700} mt={1}>
              Acudiente
            </Typography>
            <Divider sx={{ mt: 0.5, mb: 1.5 }} />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Campo label="Nombre"     value={ins.nombreAcudiente} />
            <Campo label="Parentesco" value={ins.parentesco} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Campo label="WhatsApp">
              {ins.whatsapp ? (
                <Box display="flex" alignItems="center" gap={0.5}>
                  <IconButton
                    size="small"
                    component="a"
                    href={`https://wa.me/${ins.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    sx={{ color: '#25D366', p: 0.3, flexShrink: 0 }}
                  >
                    <WhatsAppIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="body2" fontWeight={600}>
                    {ins.whatsapp}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2">—</Typography>
              )}
            </Campo>
          </Grid>

          {/* Sección: Documento de identidad */}
          {ins.fotoDocumentoUrl && (
            <Grid size={12}>
              <Typography variant="subtitle2" color={COLOR_PRIMARIO} fontWeight={700} mt={1}>
                Documento de Identidad
              </Typography>
              <Divider sx={{ mt: 0.5, mb: 1.5 }} />

              <Box sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                bgcolor: '#fdfbff',
                border: '1.5px solid #e2d9f3',
                borderRadius: 2,
                p: 2,
                overflow: 'hidden',
              }}>
                {/* Barra animada en la parte superior mientras se descarga */}
                {descargando && (
                  <LinearProgress sx={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: 4,
                    bgcolor: 'rgba(78,27,149,0.15)',
                    '& .MuiLinearProgress-bar': { bgcolor: COLOR_PRIMARIO },
                  }} />
                )}

                <PictureAsPdfOutlinedIcon sx={{ color: '#c62828', fontSize: 36, flexShrink: 0 }} />

                <Box flex={1}>
                  <Typography variant="body2" fontWeight={700}>
                    PDF del documento
                  </Typography>
                  <Typography
                    variant="caption"
                    color={descargando ? COLOR_PRIMARIO : 'text.secondary'}
                    fontWeight={descargando ? 600 : 400}
                  >
                    {descargando
                      ? 'Descargando, por favor espera…'
                      : 'Haz clic en Descargar para abrir el documento. La descarga queda registrada.'}
                  </Typography>
                  {errorDescarga && (
                    <Typography variant="caption" color="error" display="block" mt={0.5}>
                      {errorDescarga}
                    </Typography>
                  )}
                </Box>

                <Button
                  variant="contained"
                  size="small"
                  onClick={handleDescargar}
                  disabled={descargando}
                  startIcon={
                    descargando
                      ? <CircularProgress size={14} sx={{ color: '#fff !important' }} />
                      : <DownloadIcon sx={{ fontSize: 16 }} />
                  }
                  sx={{
                    flexShrink: 0,
                    minWidth: 120,
                    bgcolor: COLOR_PRIMARIO,
                    '&:hover': { bgcolor: COLOR_HOVER },
                    '&.Mui-disabled': { bgcolor: '#6b30b8', color: '#fff' },
                  }}
                >
                  {descargando ? 'Descargando…' : 'Descargar'}
                </Button>
              </Box>
            </Grid>
          )}

          {/* Alerta de beneficiario inactivo */}
          {!ins.activo && (
            <Grid size={12}>
              <Alert severity="warning" sx={{ mt: 1 }}>
                <Typography variant="caption" fontWeight={700} display="block">
                  BENEFICIARIO INACTIVO
                </Typography>
                {ins.motivoBaja
                  ? <Typography variant="body2">Motivo: {ins.motivoBaja}</Typography>
                  : <Typography variant="body2" color="text.secondary">Sin motivo registrado.</Typography>}
              </Alert>
            </Grid>
          )}

          {/* Fecha de inscripción */}
          <Grid size={12}>
            <Typography variant="caption" color="text.secondary">
              Inscrito el: {new Date(ins.createdAt).toLocaleString('es-CO')}
            </Typography>
          </Grid>

        </Grid>
      </DialogContent>

      {/* ── Acciones ──────────────────────────────────────────────────────── */}
      <DialogActions sx={{
        px: { xs: 2, sm: 3 },
        py: { xs: 1.5, sm: 2 },
        borderTop: '1px solid',
        borderColor: 'divider',
        gap: 1,
      }}>
        {isMobile ? (
          // Mobile: solo íconos para ahorrar espacio
          <>
            <Tooltip title="Generar PDF">
              <IconButton
                onClick={generarPDF}
                sx={{ bgcolor: '#7B1FA2', color: '#fff', borderRadius: 2, p: 1, '&:hover': { bgcolor: '#6a1b9a' } }}
              >
                <PictureAsPdfIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Editar">
              <IconButton
                onClick={onEditar}
                sx={{ bgcolor: '#1565C0', color: '#fff', borderRadius: 2, p: 1, '&:hover': { bgcolor: '#0d47a1' } }}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="contained"
              onClick={onCerrar}
              sx={{ bgcolor: COLOR_PRIMARIO, '&:hover': { bgcolor: COLOR_HOVER } }}
            >
              Cerrar
            </Button>
          </>
        ) : (
          // Tablet / PC: botones con texto
          <>
            <Button
              variant="contained"
              size="small"
              startIcon={<PictureAsPdfIcon />}
              onClick={generarPDF}
              sx={{ bgcolor: '#7B1FA2', '&:hover': { bgcolor: '#6a1b9a' } }}
            >
              PDF
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<EditIcon />}
              onClick={onEditar}
              color="primary"
            >
              Editar
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="contained"
              size="small"
              onClick={onCerrar}
              sx={{ bgcolor: COLOR_PRIMARIO, '&:hover': { bgcolor: COLOR_HOVER } }}
            >
              Cerrar
            </Button>
          </>
        )}
      </DialogActions>

    </Dialog>
  );
}
