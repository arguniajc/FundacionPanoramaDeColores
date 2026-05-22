import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Divider, CircularProgress, Chip,
} from '@mui/material';
import DownloadIcon  from '@mui/icons-material/Download';
import ReceiptIcon   from '@mui/icons-material/Receipt';
import { useConfiguracion } from '../../../../../shared/context/ConfiguracionContext';
import { fmtMoney, fmtFecha } from './helpers';

function generarPDF(don, config) {
  import('jspdf').then(({ default: jsPDF }) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a5' });
    const W = doc.internal.pageSize.getWidth();
    let y = 18;

    const nombre    = config.nombreFundacion || 'Fundación Panorama de Colores';
    const nit       = config.nit       ? `NIT: ${config.nit}`       : '';
    const direccion = config.direccion || '';
    const telefono  = config.telefono  ? `Tel: ${config.telefono}`  : '';
    const email     = config.emailContacto || '';

    // Encabezado
    doc.setFillColor(77, 27, 149);
    doc.rect(0, 0, W, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(nombre, W / 2, 11, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const subtexto = [nit, direccion, telefono, email].filter(Boolean).join('  |  ');
    if (subtexto) doc.text(subtexto, W / 2, 18, { align: 'center', maxWidth: W - 20 });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('RECIBO DE DONACIÓN', W / 2, 27, { align: 'center' });

    y = 40;
    doc.setTextColor(0, 0, 0);

    // Número de recibo y fecha
    if (don.reciboNumero) {
      doc.setFillColor(245, 240, 255);
      doc.roundedRect(14, y - 5, W - 28, 10, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(77, 27, 149);
      doc.text(`N° ${don.reciboNumero}`, W / 2, y + 1, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y += 10;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha: ${fmtFecha(don.fechaDonacion)}`, 14, y);
    y += 8;

    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, W - 14, y);
    y += 7;

    // Donante
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DONANTE', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(don.nombreDonante, 14, y);
    y += 4;
    if (don.tipoDocDonante && don.documentoDonante) {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text(`${don.tipoDocDonante.toUpperCase()}: ${don.documentoDonante}`, 14, y);
      doc.setTextColor(0, 0, 0);
      y += 4;
    }
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text(don.tipoDonante === 'empresa' ? 'Persona Jurídica' : 'Persona Natural', 14, y);
    y += 9;

    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, W - 14, y);
    y += 7;

    // Detalle donación
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE LA DONACIÓN', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');

    const rows = [
      ['Tipo', don.tipo === 'dinero' ? 'Dinero en efectivo' : 'En especie'],
      don.tipo === 'dinero'
        ? ['Valor', fmtMoney(don.monto)]
        : ['Artículo', `${don.cantidad ?? ''} ${don.unidadMedida ?? ''} ${don.nombreItem ?? ''}`.trim()],
      ['Programa', don.nombrePrograma || '—'],
      ['Sede',     don.nombreSede     || '—'],
    ];
    if (don.descripcion) rows.push(['Descripción', don.descripcion]);

    for (const [label, val] of rows) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`${label}:`, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(val), 52, y);
      y += 6;
    }

    // Si es dinero, resaltar el valor
    if (don.tipo === 'dinero' && don.monto) {
      y += 2;
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(14, y - 5, W - 28, 10, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(22, 163, 74);
      doc.text(fmtMoney(don.monto), W / 2, y + 1, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y += 12;
    }

    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, W - 14, y);
    y += 8;

    // Firmas
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Firma representante legal', 14, y + 12);
    doc.setDrawColor(180, 180, 180);
    doc.line(14, y + 11, 70, y + 11);
    doc.text('Firma donante', W - 70, y + 12, { align: 'left' });
    doc.line(W - 70, y + 11, W - 14, y + 11);

    y += 26;
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      'Este recibo es prueba de la donación realizada. Gracias por su generosidad.',
      W / 2, y, { align: 'center' }
    );

    const filename = `recibo_donacion_${don.reciboNumero ?? don.id.slice(0, 8)}.pdf`;
    doc.save(filename);
  });
}

export function ReciboDonacionDialog({ open, donacion, onClose }) {
  const config = useConfiguracion();
  const [generando, setGenerando] = useState(false);

  const handleDescargar = () => {
    setGenerando(true);
    generarPDF(donacion, config);
    setTimeout(() => setGenerando(false), 800);
  };

  if (!donacion) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
        <ReceiptIcon sx={{ color: '#d97706' }} />
        Recibo de Donación
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>

          {donacion.reciboNumero && (
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <Chip
                label={`N° ${donacion.reciboNumero}`}
                sx={{
                  bgcolor: '#f5f0ff', color: '#4e1b95',
                  fontWeight: 800, fontSize: '1rem',
                  px: 2, height: 36, borderRadius: 2,
                  border: '1.5px solid #c4b5fd',
                }}
              />
            </Box>
          )}

          <Box>
            <Typography variant="caption" color="text.secondary">Donante</Typography>
            <Typography fontWeight={600}>{donacion.nombreDonante}</Typography>
            {donacion.tipoDocDonante && donacion.documentoDonante && (
              <Typography variant="body2" color="text.secondary">
                {donacion.tipoDocDonante.toUpperCase()}: {donacion.documentoDonante}
              </Typography>
            )}
          </Box>
          <Divider />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Fecha</Typography>
              <Typography variant="body2">{fmtFecha(donacion.fechaDonacion)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Tipo</Typography>
              <Typography variant="body2">{donacion.tipo === 'dinero' ? 'Dinero' : 'Especie'}</Typography>
            </Box>
          </Box>
          {donacion.tipo === 'dinero' ? (
            <Box sx={{ bgcolor: '#f0fdf4', borderRadius: 1.5, p: 1.5, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Valor donado</Typography>
              <Typography variant="h6" fontWeight={800} color="success.main">
                {fmtMoney(donacion.monto)}
              </Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="caption" color="text.secondary">Artículo</Typography>
              <Typography variant="body2">
                {donacion.cantidad} {donacion.unidadMedida} — {donacion.nombreItem}
              </Typography>
            </Box>
          )}
          {(donacion.nombrePrograma || donacion.nombreSede) && (
            <Box>
              <Typography variant="caption" color="text.secondary">Destino</Typography>
              <Typography variant="body2">
                {[donacion.nombreSede, donacion.nombrePrograma].filter(Boolean).join(' · ')}
              </Typography>
            </Box>
          )}
          {donacion.descripcion && (
            <Box>
              <Typography variant="caption" color="text.secondary">Descripción</Typography>
              <Typography variant="body2">{donacion.descripcion}</Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cerrar</Button>
        <Button
          variant="contained"
          startIcon={generando ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
          onClick={handleDescargar}
          disabled={generando}
          sx={{ bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' } }}
        >
          Descargar PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}
