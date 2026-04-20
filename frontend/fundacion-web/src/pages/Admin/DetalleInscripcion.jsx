// Modal de detalle de un beneficiario: datos, tallas, salud, acudiente y descarga de documento.
// El documento se descarga con registro de auditoría; nunca se muestra directamente en pantalla.
import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, Typography, Divider, Chip, Box, Avatar, IconButton, Tooltip,
  useMediaQuery, useTheme, Alert, CircularProgress,
} from '@mui/material';
import EditIcon          from '@mui/icons-material/Edit';
import PictureAsPdfIcon  from '@mui/icons-material/PictureAsPdf';
import WhatsAppIcon      from '@mui/icons-material/WhatsApp';
import DownloadIcon      from '@mui/icons-material/Download';
import CloseIcon         from '@mui/icons-material/Close';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import api from '../../services/api';
import { calcularEdad }    from '../../utils/fecha';
import { abrirHojaDeVida } from '../../utils/pdf';

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
        <Typography variant="body2" fontWeight={500}>{value || '—'}</Typography>
      )}
    </Box>
  );
}

function TallaCard({ icono, valor, etiqueta }) {
  return (
    <Box
      textAlign="center"
      sx={{
        flex: 1,
        bgcolor: '#fdfbff',
        border: '1px solid #f0eaff',
        borderRadius: 2,
        py: { xs: 1, sm: 1.5 },
        px: { xs: 0.5, sm: 1 },
        minWidth: 0,
      }}
    >
      <Typography sx={{ fontSize: { xs: '1.1rem', sm: '1.4rem' } }}>{icono}</Typography>
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

export default function DetalleInscripcion({ inscripcion: ins, onCerrar, onEditar }) {
  const theme       = useTheme();
  const isMobile    = useMediaQuery(theme.breakpoints.down('sm'));
  const edad        = calcularEdad(ins.fechaNacimiento);
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState('');

  const handleDescargar = async () => {
    if (descargando) return;
    setDescargando(true);
    setErrorDescarga('');
    // Double-RAF: el navegador pinta el spinner antes de que fetch bloquee el hilo
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      await api.post('/api/archivos/log-descarga', {
        beneficiarioId: ins.id,
        tipoArchivo:    'documento',
        urlArchivo:     ins.fotoDocumentoUrl,
      }).catch(() => {}); // el log nunca bloquea la descarga

      const resp = await fetch(ins.fotoDocumentoUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const buffer = await resp.arrayBuffer();
      const blob   = new Blob([buffer], { type: 'application/pdf' });

      const url    = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const nombre = ins.nombreMenor?.replace(/\s+/g, '_') ?? 'beneficiario';
      anchor.href     = url;
      anchor.download = `documento_${nombre}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      setErrorDescarga('No se pudo descargar el documento. Intenta de nuevo.');
    } finally {
      setDescargando(false);
    }
  };

  const generarPDF = () => abrirHojaDeVida(ins, edad);

  return (
    <Dialog
      open
      onClose={onCerrar}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}
    >
      {/* ── Encabezado ───────────────────────────────────────────────────────── */}
      <DialogTitle
        sx={{
          bgcolor: '#4E1B95',
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
          {(ins.nombreMenor || '??').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
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
        {/* Botón cerrar en mobile (fullScreen) */}
        {isMobile && (
          <IconButton onClick={onCerrar} size="small" sx={{ color: 'white', flexShrink: 0 }}>
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      {/* ── Contenido ────────────────────────────────────────────────────────── */}
      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 } }}>
        <Grid container spacing={{ xs: 1.5, sm: 2 }} mt={0}>

          {/* Datos personales */}
          <Grid size={12}>
            <Typography variant="subtitle2" color="#4E1B95" fontWeight={700}>Datos Personales</Typography>
            <Divider sx={{ mb: 1.5, mt: 0.5 }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Campo label="Nombre completo"      value={ins.nombreMenor} />
            <Campo label="Fecha de nacimiento"  value={ins.fechaNacimiento} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Campo label="Tipo de documento"    value={ins.tipoDocumento} />
            <Campo label="Número de documento"  value={ins.numeroDocumento || 'Sin documento'} />
            <Campo label="EPS"                  value={ins.eps} />
          </Grid>
          <Grid size={12}>
            <Campo label="Dirección" value={ins.direccion} />
          </Grid>

          {/* Tallas + Alergia */}
          <Grid size={12}>
            <Typography variant="subtitle2" color="#4E1B95" fontWeight={700}>Tallas</Typography>
            <Divider sx={{ mb: 1.5, mt: 0.5 }} />
            <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: { xs: 1, sm: 1.5 }, width: '100%' }}>
              <TallaCard icono="👕" valor={ins.tallaCamisa}   etiqueta="Camisa"   />
              <TallaCard icono="👖" valor={ins.tallaPantalon} etiqueta="Pantalón" />
              <TallaCard icono="👟" valor={ins.tallaZapatos}  etiqueta="Zapatos"  />
            </Box>
            <Box mt={3} display="flex" alignItems="center" gap={1}>
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

          {/* Salud */}
          {(ins.tieneAlergia === 'si' || ins.observacionesSalud) && (
            <>
              <Grid size={12}>
                <Typography variant="subtitle2" color="#4E1B95" fontWeight={700} mt={1}>Salud</Typography>
                <Divider sx={{ mb: 1.5, mt: 0.5 }} />
              </Grid>
              {ins.tieneAlergia === 'si' && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ bgcolor: '#fff5f5', border: '1.5px solid #fed7d7', borderRadius: 2, p: 1.5 }}>
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

          {/* Acudiente */}
          <Grid size={12}>
            <Typography variant="subtitle2" color="#4E1B95" fontWeight={700} mt={1}>Acudiente</Typography>
            <Divider sx={{ mb: 1.5, mt: 0.5 }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Campo label="Nombre"     value={ins.nombreAcudiente} />
            <Campo label="Parentesco" value={ins.parentesco} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Campo label="WhatsApp">
              {ins.whatsapp
                ? <Box display="flex" alignItems="center" gap={0.5}>
                    <IconButton
                      size="small"
                      href={`https://wa.me/${ins.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      component="a"
                      sx={{ color: '#25D366', p: 0.3, flexShrink: 0 }}
                    >
                      <WhatsAppIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="body2" fontWeight={600}>{ins.whatsapp}</Typography>
                  </Box>
                : <Typography variant="body2">—</Typography>}
            </Campo>
          </Grid>

          {/* Documento de identidad — solo descarga, nunca imagen */}
          {ins.fotoDocumentoUrl && (
            <Grid size={12}>
              <Typography variant="subtitle2" color="#4E1B95" fontWeight={700} mt={1}>
                Documento de Identidad
              </Typography>
              <Divider sx={{ mb: 1.5, mt: 0.5 }} />
              <Box
                sx={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  bgcolor: '#fdfbff', border: '1.5px solid #e2d9f3',
                  borderRadius: 2, p: 2,
                }}
              >
                <PictureAsPdfOutlinedIcon sx={{ color: '#c62828', fontSize: 36, flexShrink: 0 }} />
                <Box flex={1}>
                  <Typography variant="body2" fontWeight={700}>PDF del documento</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Haz clic en Descargar para abrir el documento. La descarga queda registrada.
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
                  sx={{
                    bgcolor: '#4E1B95', '&:hover': { bgcolor: '#3a1470' },
                    flexShrink: 0, minWidth: 120,
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  {descargando
                    ? <><CircularProgress size={14} sx={{ color: '#fff' }} /> Descargando…</>
                    : <><DownloadIcon sx={{ fontSize: 16 }} /> Descargar</>
                  }
                </Button>
              </Box>
            </Grid>
          )}

          {/* Motivo de baja */}
          {!ins.activo && (
            <Grid size={12}>
              <Alert severity="warning" sx={{ mt: 1 }}>
                <Typography variant="caption" fontWeight={700} display="block">BENEFICIARIO INACTIVO</Typography>
                {ins.motivoBaja
                  ? <Typography variant="body2">Motivo: {ins.motivoBaja}</Typography>
                  : <Typography variant="body2" color="text.secondary">Sin motivo registrado.</Typography>}
              </Alert>
            </Grid>
          )}

          {/* Fecha */}
          <Grid size={12}>
            <Typography variant="caption" color="text.secondary">
              Inscrito el: {new Date(ins.createdAt).toLocaleString('es-CO')}
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>

      {/* ── Acciones ─────────────────────────────────────────────────────────── */}
      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 },
          borderTop: '1px solid',
          borderColor: 'divider',
          gap: 1,
        }}
      >
        {isMobile ? (
          /* Mobile: botones con color sólido */
          <>
            <Tooltip title="Generar PDF">
              <IconButton onClick={generarPDF}
                sx={{ bgcolor: '#7B1FA2', color: '#fff', borderRadius: 2, p: 1, '&:hover': { bgcolor: '#6a1b9a' } }}>
                <PictureAsPdfIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Editar">
              <IconButton onClick={onEditar}
                sx={{ bgcolor: '#1565C0', color: '#fff', borderRadius: 2, p: 1, '&:hover': { bgcolor: '#0d47a1' } }}>
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Box sx={{ flexGrow: 1 }} />
            <Button onClick={onCerrar} variant="contained"
              sx={{ bgcolor: '#4E1B95', '&:hover': { bgcolor: '#3a1470' } }}>
              Cerrar
            </Button>
          </>
        ) : (
          /* Tablet / PC / TV: botones completos con color sólido */
          <>
            <Button startIcon={<PictureAsPdfIcon />} onClick={generarPDF} variant="contained" size="small"
              sx={{ bgcolor: '#7B1FA2', '&:hover': { bgcolor: '#6a1b9a' } }}>
              PDF
            </Button>
            <Button startIcon={<EditIcon />} onClick={onEditar} variant="contained" color="primary" size="small">
              Editar
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Button onClick={onCerrar} variant="contained" size="small"
              sx={{ bgcolor: '#4E1B95', '&:hover': { bgcolor: '#3a1470' } }}>
              Cerrar
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
