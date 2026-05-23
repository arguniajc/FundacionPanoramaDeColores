import { fmt, fmtFecha } from './helpers';

const COLOR  = [78, 27, 149];
const VERDE  = [22, 163, 74];
const ROJO   = [220, 38, 38];

export function generarComprobantePDF(mov, config) {
  import('jspdf').then(({ default: jsPDF }) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    const nombre = config?.nombreFundacion || 'Fundación Panorama de Colores';
    const nit    = config?.nit     ? `NIT ${config.nit}`   : '';
    const dir    = config?.direccion || '';
    const esIng  = mov.tipo === 'ingreso';
    const TIPO_COLOR = esIng ? VERDE : ROJO;

    // ── Encabezado ──────────────────────────────────────────────────────────
    doc.setFillColor(...COLOR);
    doc.rect(0, 0, W, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(nombre, W / 2, 10, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const sub = [nit, dir].filter(Boolean).join('  ·  ');
    if (sub) doc.text(sub, W / 2, 17, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`COMPROBANTE DE ${esIng ? 'INGRESO' : 'EGRESO'}`, W / 2, 24, { align: 'center' });

    // ── Número de comprobante ────────────────────────────────────────────────
    let y = 36;
    const numComp = mov.consecutivo
      ? `#${mov.consecutivo}-${new Date(mov.fecha).getFullYear()}`
      : '(sin número)';

    doc.setFillColor(...TIPO_COLOR);
    doc.roundedRect(10, y, W - 20, 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Comprobante ${numComp}`, W / 2, y + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(
      `Tipo: ${esIng ? 'Ingreso' : 'Egreso'}  ·  Fecha: ${fmtFecha(mov.fecha)}  ·  Emitido: ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      W / 2, y + 10, { align: 'center' }
    );
    y += 18;

    // ── Monto destacado ──────────────────────────────────────────────────────
    doc.setFillColor(248, 245, 255);
    doc.roundedRect(10, y, W - 20, 16, 2, 2, 'F');
    doc.setDrawColor(...TIPO_COLOR);
    doc.setLineWidth(0.5);
    doc.roundedRect(10, y, W - 20, 16, 2, 2, 'D');
    doc.setTextColor(...TIPO_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('VALOR DEL MOVIMIENTO', W / 2, y + 5, { align: 'center' });
    doc.setFontSize(14);
    doc.text(fmt(mov.monto), W / 2, y + 13, { align: 'center' });
    y += 22;

    // ── Campos de detalle ────────────────────────────────────────────────────
    const campos = [
      ['Concepto',         mov.concepto             ?? '—'],
      ['Categoría PUC',    `${mov.codigoPuc ?? ''} — ${mov.categoriaNombre ?? '—'}`],
      ['Cuenta',           mov.cuentaNombre         ?? '—'],
      ['Programa',         mov.programaNombre        ?? '—'],
      ['Tercero / Proveedor', mov.terceroNombre      ?? '—'],
      ['NIT / Documento',  mov.terceroDocumento      ?? '—'],
      ['N° Soporte',       mov.numeroSoporte         ?? '—'],
      ['Tipo de soporte',  mov.tipoSoporte           ?? '—'],
    ];

    if (mov.retencionPracticada > 0) {
      campos.push(
        ['Tarifa retención', `${mov.tarifaRetencion ?? ''}%`],
        ['Valor retención',  fmt(mov.retencionPracticada)],
        ['Concepto retención', mov.conceptoRetencion ?? '—'],
      );
    }

    doc.setLineWidth(0.2);
    campos.forEach(([label, value], i) => {
      const rowY = y + i * 9;
      if (i % 2 === 0) {
        doc.setFillColor(248, 245, 255);
        doc.rect(10, rowY, W - 20, 9, 'F');
      }
      doc.setDrawColor(220, 215, 230);
      doc.rect(10, rowY, W - 20, 9, 'D');
      doc.setTextColor(100, 80, 130);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(label.toUpperCase(), 14, rowY + 5.5);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(String(value), 65, rowY + 5.5, { maxWidth: W - 75 });
    });

    y += campos.length * 9 + 8;

    // ── Descripción ──────────────────────────────────────────────────────────
    if (mov.descripcion) {
      doc.setTextColor(...COLOR);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('OBSERVACIONES', 10, y);
      y += 5;
      doc.setTextColor(50, 50, 50);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(mov.descripcion, W - 20);
      doc.text(lines, 10, y);
      y += lines.length * 5 + 4;
    }

    // ── Firma ────────────────────────────────────────────────────────────────
    const firmaY = Math.max(y + 10, H - 50);
    doc.setDrawColor(...COLOR);
    doc.setLineWidth(0.4);
    doc.line(20, firmaY, 85, firmaY);
    doc.line(W - 85, firmaY, W - 20, firmaY);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Elaborado por', 52, firmaY + 4, { align: 'center' });
    doc.text('Revisado / Aprobado', W - 52, firmaY + 4, { align: 'center' });

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.setFontSize(6.5);
    doc.setTextColor(180, 180, 180);
    doc.text(`${nombre}  —  Documento generado electrónicamente`, W / 2, H - 6, { align: 'center' });

    const file = `comprobante_${mov.tipo}_${numComp.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    doc.save(file);
  });
}
