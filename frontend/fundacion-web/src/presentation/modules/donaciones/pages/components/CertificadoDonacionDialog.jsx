import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Divider, CircularProgress,
} from '@mui/material';
import DownloadIcon        from '@mui/icons-material/Download';
import VerifiedIcon        from '@mui/icons-material/Verified';
import { useConfiguracion }        from '../../../../../shared/context/ConfiguracionContext';
import { configuracionRepository } from '../../../../../infrastructure/repositories/configuracionRepository';
import { fmtMoney, fmtFecha } from './helpers';
import { BRAND_COLOR } from '../../../../../shared/constants/brand';

// Convierte un número entero a letras en español (hasta 999.999.999)
function numeroALetras(num) {
  if (!num || num <= 0) return 'CERO PESOS';
  const unidades = ['','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE'];
  const decenas  = ['','DIEZ','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
  const especial = ['ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE'];
  const centenas = ['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];

  function grupo(n) {
    if (n === 100) return 'CIEN';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    let r = c > 0 ? centenas[c] + ' ' : '';
    if (d === 1 && u > 0) r += especial[u - 1];
    else if (d === 2 && u > 0) r += 'VEINTI' + unidades[u].toLowerCase();
    else { r += (d > 0 ? decenas[d] : ''); if (d > 0 && u > 0) r += ' Y '; r += unidades[u]; }
    return r.trim();
  }

  const n = Math.round(num);
  const mill = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1_000);
  const resto = n % 1_000;
  let r = '';
  if (mill > 0) r += (mill === 1 ? 'UN MILLÓN' : grupo(mill) + ' MILLONES') + ' ';
  if (miles > 0) r += (miles === 1 ? 'MIL' : grupo(miles) + ' MIL') + ' ';
  if (resto > 0) r += grupo(resto);
  return (r.trim() + ' PESOS M/CTE').replace(/\s+/g, ' ');
}

function generarCertificadoPDF(don, config, firma) {
  import('jspdf').then(({ default: jsPDF }) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    let y = 20;

    const nombre    = config.nombreFundacion || 'Fundación Panorama de Colores';
    const nit       = config.nit ? `NIT ${config.nit}` : '';
    const anio      = new Date(don.fechaDonacion).getFullYear();

    // Borde decorativo
    doc.setDrawColor(78, 27, 149);
    doc.setLineWidth(1.5);
    doc.rect(10, 10, W - 20, H - 20);
    doc.setLineWidth(0.3);
    doc.rect(12, 12, W - 24, H - 24);

    // Encabezado
    doc.setFillColor(78, 27, 149);
    doc.rect(10, 10, W - 20, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(nombre, W / 2, 22, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (nit) doc.text(nit, W / 2, 29, { align: 'center' });
    if (config.direccion) doc.text(config.direccion, W / 2, 34, { align: 'center' });

    y = 52;
    // Título
    doc.setTextColor(78, 27, 149);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('CERTIFICADO DE DONACIÓN', W / 2, y, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Año gravable ${anio}`, W / 2, y + 7, { align: 'center' });

    y += 20;
    doc.setDrawColor(78, 27, 149);
    doc.setLineWidth(0.5);
    doc.line(20, y, W - 20, y);
    y += 10;

    // Cuerpo del certificado
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    const repLegal = firma.nombreRepLegal || 'el representante legal';
    const cargoRep = firma.cargoRep ? `, ${firma.cargoRep}` : '';
    const intro = `${repLegal}${cargoRep} de ${nombre}${nit ? ', ' + nit + ',' : ','} certifica que:`;
    const introLines = doc.splitTextToSize(intro, W - 40);
    doc.text(introLines, 20, y);
    y += introLines.length * 7 + 6;

    // Datos principales
    const rows = [
      ['Donante:', don.nombreDonante],
      don.tipoDocDonante && don.documentoDonante
        ? ['Documento:', `${don.tipoDocDonante.toUpperCase()} ${don.documentoDonante}`]
        : null,
      ['Fecha de la donación:', fmtFecha(don.fechaDonacion)],
      ['Recibo N°:', don.reciboNumero || '—'],
    ].filter(Boolean);

    if (don.tipo === 'dinero') {
      rows.push(['Valor en cifras:', fmtMoney(don.monto)]);
      rows.push(['Valor en letras:', numeroALetras(Math.round(don.monto || 0))]);
    } else {
      rows.push(['Tipo de donación:', 'En especie']);
      rows.push(['Descripción:', `${don.cantidad} ${don.unidadMedida || ''} — ${don.nombreItem || '—'}`.trim()]);
    }

    if (don.nombrePrograma) rows.push(['Programa beneficiado:', don.nombrePrograma]);
    if (don.nombreSede)     rows.push(['Sede:', don.nombreSede]);

    for (const [label, val] of rows) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(label, 25, y);
      doc.setFont('helvetica', 'normal');
      const valLines = doc.splitTextToSize(String(val), W - 100);
      doc.text(valLines, 85, y);
      y += Math.max(valLines.length * 6, 7);
    }

    y += 6;
    doc.setLineWidth(0.3);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y, W - 20, y);
    y += 8;

    // Clausula legal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const clausula = `Esta donación fue realizada en favor de ${nombre}, entidad sin ánimo de lucro, y puede ser deducible del impuesto sobre la renta conforme al Artículo 125 y siguientes del Estatuto Tributario colombiano. El donante debe conservar este certificado como soporte de la deducción.`;
    const clausulaLines = doc.splitTextToSize(clausula, W - 40);
    doc.text(clausulaLines, 20, y);
    y += clausulaLines.length * 5 + 10;

    // Firma
    const xFirma = W / 2 - 35;
    if (firma.firmaRep) {
      try { doc.addImage(firma.firmaRep, 'PNG', xFirma, y, 70, 20); } catch { /* noop */ }
    }
    y += 22;
    doc.setDrawColor(180, 180, 180);
    doc.line(xFirma, y, xFirma + 70, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text(firma.nombreRepLegal || 'Representante Legal', W / 2, y + 5, { align: 'center' });
    if (firma.cargoRep) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(firma.cargoRep, W / 2, y + 10, { align: 'center' });
    }
    if (nit) {
      doc.setFontSize(8);
      doc.text(nit, W / 2, y + 15, { align: 'center' });
    }

    // Footer
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Expedido el ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      W / 2, H - 18, { align: 'center' }
    );

    doc.save(`certificado_donacion_${don.reciboNumero ?? don.id.slice(0, 8)}_${anio}.pdf`);
  });
}

export function CertificadoDonacionDialog({ open, donacion, onClose }) {
  const config = useConfiguracion();
  const [generando, setGenerando] = useState(false);
  const [firma,     setFirma]     = useState({ firmaRep: null, nombreRepLegal: null, cargoRep: null });

  useEffect(() => {
    if (!open) return;
    configuracionRepository.obtener()
      .then(({ data }) => setFirma({
        firmaRep:       data.firmaRep       ?? null,
        nombreRepLegal: data.nombreRepLegal ?? null,
        cargoRep:       data.cargoRep       ?? null,
      }))
      .catch(() => {});
  }, [open]);

  const handleDescargar = () => {
    setGenerando(true);
    generarCertificadoPDF(donacion, config, firma);
    setTimeout(() => setGenerando(false), 800);
  };

  if (!donacion || donacion.tipo !== 'dinero') return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
        <VerifiedIcon sx={{ color: BRAND_COLOR }} />
        Certificado de Donación
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ bgcolor: '#f5f0ff', borderRadius: 2, p: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Año gravable</Typography>
            <Typography fontWeight={800} fontSize="1.1rem" color={BRAND_COLOR}>
              {new Date(donacion.fechaDonacion).getFullYear()}
            </Typography>
          </Box>
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
          <Box sx={{ bgcolor: '#f0fdf4', borderRadius: 1.5, p: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Valor certificado</Typography>
            <Typography variant="h6" fontWeight={800} color="success.main">
              {fmtMoney(donacion.monto)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              {numeroALetras(Math.round(donacion.monto || 0))}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" textAlign="center">
            Deducible de impuesto sobre la renta — Art. 125 E.T.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cerrar</Button>
        <Button variant="contained"
          startIcon={generando ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
          onClick={handleDescargar} disabled={generando}
          sx={{ bgcolor: 'var(--color-primario)', '&:hover': { bgcolor: 'var(--color-gradiente)' } }}>
          Descargar certificado
        </Button>
      </DialogActions>
    </Dialog>
  );
}
