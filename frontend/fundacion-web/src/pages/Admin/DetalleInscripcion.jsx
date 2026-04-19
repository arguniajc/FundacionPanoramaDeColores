// Modal de detalle de un beneficiario: muestra todos sus datos, tallas, salud y acudiente.
// El documento se descarga (registra en log de auditoría); nunca se muestra la imagen directamente.
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
import { calcularEdad } from './AdminDashboard';

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

  // Registra la descarga en auditoría, descarga el PDF y lo ofrece al navegador.
  const handleDescargar = async () => {
    setDescargando(true);
    setErrorDescarga('');
    try {
      await api.post('/api/archivos/log-descarga', {
        beneficiarioId: ins.id,
        tipoArchivo:    'documento',
        urlArchivo:     ins.fotoDocumentoUrl,
      }).catch(() => {}); // el log no bloquea la descarga si falla

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

  const generarPDF = () => {
    const fechaInsc = ins.createdAt
      ? new Date(ins.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
      : '—';

    const ventana = window.open('', '_blank');
    ventana.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Hoja de Vida – ${ins.nombreMenor}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Nunito',sans-serif;color:#1E1E1E;background:#fff}
    .portada{background:linear-gradient(135deg,#4E1B95,#2D984F);color:white;padding:2rem 2.5rem;display:flex;align-items:center;gap:2rem}
    .avatar{width:100px;height:100px;border-radius:14px;object-fit:cover;border:4px solid rgba(255,255,255,0.4)}
    .avatar-placeholder{width:100px;height:100px;border-radius:14px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;border:4px solid rgba(255,255,255,0.4)}
    h1{font-size:1.7rem;margin-bottom:.3rem}
    .chips{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem}
    .chip{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:50px;padding:.2rem .8rem;font-size:.75rem;font-weight:700}
    .chip-rojo{background:rgba(229,62,62,.3)}
    .chip-verde{background:rgba(45,152,79,.3)}
    .contenido{padding:1.5rem 2.5rem}
    .seccion{margin-bottom:1.5rem}
    .sec-titulo{color:#4E1B95;font-weight:800;font-size:.95rem;border-bottom:2px solid #e2d9f3;padding-bottom:.3rem;margin-bottom:.9rem}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
    .item{background:#fdfbff;border:1px solid #f0eaff;border-radius:8px;padding:.6rem .9rem}
    .full{grid-column:1/-1}
    .label{font-size:.66rem;font-weight:800;color:#6A6A6A;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.15rem}
    .valor{font-size:.88rem;font-weight:600}
    .tallas{display:flex;gap:1rem}
    .talla{flex:1;text-align:center;background:#fdfbff;border:1px solid #f0eaff;border-radius:10px;padding:.8rem .5rem}
    .talla-num{font-size:1.5rem;font-weight:800;color:#4E1B95}
    .talla-etiq{font-size:.7rem;color:#6A6A6A;font-weight:700}
    .alerta{background:#fff5f5;border:1.5px solid #fed7d7;border-radius:8px;padding:.6rem .9rem;color:#c53030;font-weight:700;font-size:.85rem}
    .doc-img{max-width:240px;border-radius:8px;border:2px solid #e2d9f3;margin-top:.4rem}
    .pie{text-align:center;font-size:.7rem;color:#aaa;margin-top:1.5rem;border-top:1px solid #f0eaff;padding-top:.8rem}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style>
</head>
<body>
<div class="portada">
  ${ins.fotoMenorUrl
    ? `<img src="${ins.fotoMenorUrl}" class="avatar" alt="${ins.nombreMenor}">`
    : `<div class="avatar-placeholder">${(ins.nombreMenor || '??').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</div>`}
  <div>
    <div style="font-size:.8rem;opacity:.75;margin-bottom:.2rem">Fundación Panorama de Colores · 2026</div>
    <h1>${ins.nombreMenor || '—'}</h1>
    <div style="font-size:.88rem;opacity:.85">${ins.tipoDocumento} · ${ins.numeroDocumento || '—'} · ${edad}</div>
    <div class="chips">
      ${ins.tieneAlergia === 'si' ? '<span class="chip chip-rojo">⚠️ Tiene alergia</span>' : '<span class="chip chip-verde">✓ Sin alergia</span>'}
      <span class="chip">📅 ${fechaInsc}</span>
      ${ins.eps ? `<span class="chip">🏥 ${ins.eps}</span>` : ''}
    </div>
  </div>
</div>
<div class="contenido">
  <div class="seccion">
    <div class="sec-titulo">👤 Datos Personales</div>
    <div class="grid">
      <div class="item"><div class="label">Fecha de nacimiento</div><div class="valor">${ins.fechaNacimiento || '—'}</div></div>
      <div class="item"><div class="label">Edad</div><div class="valor">${edad}</div></div>
      <div class="item"><div class="label">Tipo documento</div><div class="valor">${ins.tipoDocumento || '—'}</div></div>
      <div class="item"><div class="label">Número documento</div><div class="valor">${ins.numeroDocumento || '—'}</div></div>
      <div class="item full"><div class="label">Dirección</div><div class="valor">${ins.direccion || '—'}</div></div>
    </div>
  </div>
  <div class="seccion">
    <div class="sec-titulo">❤️ Salud</div>
    <div class="grid">
      <div class="item"><div class="label">EPS</div><div class="valor">${ins.eps || '—'}</div></div>
      <div class="item"><div class="label">¿Tiene alergia?</div><div class="valor" style="color:${ins.tieneAlergia === 'si' ? '#e53e3e' : '#2D984F'};font-weight:800">${ins.tieneAlergia === 'si' ? '⚠️ Sí' : '✓ No'}</div></div>
      ${ins.tieneAlergia === 'si' ? `<div class="item full"><div class="label">Descripción</div><div class="alerta">${ins.descripcionAlergia || '—'}</div></div>` : ''}
      ${ins.observacionesSalud ? `<div class="item full"><div class="label">Observaciones</div><div class="valor">${ins.observacionesSalud}</div></div>` : ''}
    </div>
  </div>
  <div class="seccion">
    <div class="sec-titulo">👕 Tallas</div>
    <div class="tallas">
      <div class="talla"><div class="talla-num">${ins.tallaCamisa || '—'}</div><div class="talla-etiq">CAMISA</div></div>
      <div class="talla"><div class="talla-num">${ins.tallaPantalon || '—'}</div><div class="talla-etiq">PANTALÓN</div></div>
      <div class="talla"><div class="talla-num">${ins.tallaZapatos || '—'}</div><div class="talla-etiq">ZAPATOS</div></div>
    </div>
  </div>
  <div class="seccion">
    <div class="sec-titulo">👨‍👩‍👦 Acudiente</div>
    <div class="grid">
      <div class="item"><div class="label">Nombre</div><div class="valor">${ins.nombreAcudiente || '—'}</div></div>
      <div class="item"><div class="label">Parentesco</div><div class="valor">${ins.parentesco || '—'}</div></div>
      <div class="item"><div class="label">WhatsApp</div><div class="valor">${ins.whatsapp || '—'}</div></div>
    </div>
  </div>
  ${ins.fotoDocumentoUrl ? `
  <div class="seccion">
    <div class="sec-titulo">🪪 Documento de Identidad</div>
    <div class="item"><div class="label">PDF guardado</div><div class="valor">Documento disponible para descarga desde el panel administrativo.</div></div>
  </div>` : ''}
  <div class="pie">Generado por Panel Admin · Fundación Panorama de Colores · ${new Date().toLocaleDateString('es-CO')}</div>
</div>
<script>window.onload=()=>window.print()<\/script>
</body></html>`);
    ventana.document.close();
  };

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
                    {descargando
                      ? 'Preparando el archivo, un momento…'
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
                  disabled={descargando}
                  startIcon={
                    descargando
                      ? <CircularProgress size={14} color="inherit" />
                      : <DownloadIcon />
                  }
                  onClick={handleDescargar}
                  sx={{ bgcolor: '#4E1B95', '&:hover': { bgcolor: '#3a1470' }, flexShrink: 0, minWidth: 120 }}
                >
                  {descargando ? 'Descargando…' : 'Descargar'}
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
