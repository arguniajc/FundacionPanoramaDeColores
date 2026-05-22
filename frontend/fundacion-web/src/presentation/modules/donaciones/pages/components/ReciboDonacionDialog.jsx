import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Divider, CircularProgress,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { fmtMoney, fmtFecha } from './helpers';

function generarPDF(don) {
  import('jspdf').then(({ default: jsPDF }) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a5' });
    const W = doc.internal.pageSize.getWidth();
    let y = 18;

    // Header
    doc.setFillColor(77, 27, 149);
    doc.rect(0, 0, W, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Fundación Panorama de Colores', W / 2, 12, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('RECIBO DE DONACIÓN', W / 2, 21, { align: 'center' });

    y = 36;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    if (don.reciboNumero) {
      doc.setFont('helvetica', 'bold');
      doc.text(`N° ${don.reciboNumero}`, W - 14, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
    }

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha: ${fmtFecha(don.fechaDonacion)}`, 14, y);
    y += 10;

    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, W - 14, y);
    y += 7;

    // Donante info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DONANTE', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(don.nombreDonante, 14, y);
    y += 4;
    if (don.tipoDocDonante && don.documentoDonante) {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text(`${don.tipoDocDonante.toUpperCase()}: ${don.documentoDonante}`, 14, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      y += 4;
    }
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text(don.tipoDonante === 'empresa' ? 'Persona Jurídica' : 'Persona Natural', 14, y);
    y += 9;

    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, W - 14, y);
    y += 7;

    // Donación info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE LA DONACIÓN', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');

    const rows = [
      ['Tipo', don.tipo === 'dinero' ? 'Dinero en efectivo' : 'Especie'],
      don.tipo === 'dinero'
        ? ['Valor', fmtMoney(don.monto)]
        : ['Artículo', `${don.cantidad ?? ''} ${don.unidadMedida ?? ''} ${don.nombreItem ?? ''}`.trim()],
      ['Programa', don.nombrePrograma || '—'],
      ['Sede', don.nombreSede || '—'],
    ];
    if (don.descripcion) rows.push(['Descripción', don.descripcion]);

    for (const [label, val] of rows) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`${label}:`, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(val), 55, y);
      y += 6;
    }

    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, W - 14, y);
    y += 8;

    // Firma
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Firma representante legal', 14, y + 12);
    doc.line(14, y + 11, 70, y + 11);
    doc.text('Firma donante', W - 70, y + 12, { align: 'left' });
    doc.line(W - 70, y + 11, W - 14, y + 11);

    y += 28;
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Este recibo es prueba de la donación realizada. Gracias por su generosidad.', W / 2, y, { align: 'center' });

    const filename = `recibo_donacion_${don.reciboNumero ?? don.id.slice(0, 8)}.pdf`;
    doc.save(filename);
  });
}

export function ReciboDonacionDialog({ open, donacion, onClose }) {
  const [generando, setGenerando] = useState(false);

  const handleDescargar = async () => {
    setGenerando(true);
    try {
      generarPDF(donacion);
    } finally {
      setTimeout(() => setGenerando(false), 800);
    }
  };

  if (!donacion) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Recibo de Donación</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
          <Box>
            <Typography variant="caption" color="text.secondary">Fecha</Typography>
            <Typography>{fmtFecha(donacion.fechaDonacion)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Tipo</Typography>
            <Typography>{donacion.tipo === 'dinero' ? 'Dinero' : 'Especie'}</Typography>
          </Box>
          {donacion.tipo === 'dinero' ? (
            <Box>
              <Typography variant="caption" color="text.secondary">Valor</Typography>
              <Typography fontWeight={700} color="primary">{fmtMoney(donacion.monto)}</Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="caption" color="text.secondary">Artículo</Typography>
              <Typography>{donacion.cantidad} {donacion.unidadMedida} — {donacion.nombreItem}</Typography>
            </Box>
          )}
          {donacion.reciboNumero && (
            <Box>
              <Typography variant="caption" color="text.secondary">N° Recibo</Typography>
              <Typography>{donacion.reciboNumero}</Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
        <Button
          variant="contained"
          startIcon={generando ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
          onClick={handleDescargar}
          disabled={generando}
        >
          Descargar PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}
