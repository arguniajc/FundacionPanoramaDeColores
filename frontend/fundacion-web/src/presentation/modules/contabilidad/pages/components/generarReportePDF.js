import { fmt, fmtFecha } from './helpers';

export function generarReportePDF(reporte, config) {
  import('jspdf').then(({ default: jsPDF }) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    let y = 10;

    const nombre  = config?.nombreFundacion || 'Fundación Panorama de Colores';
    const nit     = config?.nit     ? `NIT ${config.nit}`          : '';
    const dir     = config?.direccion || '';
    const COLOR   = [78, 27, 149];
    const VERDE   = [22, 163, 74];
    const ROJO    = [220, 38, 38];
    const AZUL    = [37, 99, 235];

    const addPage = () => {
      doc.addPage();
      y = 15;
    };

    const checkSpace = (needed) => {
      if (y + needed > H - 15) addPage();
    };

    // ── Encabezado ──────────────────────────────────────────────────────────
    doc.setFillColor(...COLOR);
    doc.rect(0, 0, W, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(nombre, W / 2, 11, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const sub = [nit, dir].filter(Boolean).join('  ·  ');
    if (sub) doc.text(sub, W / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE CONTABLE', W / 2, 25, { align: 'center' });

    y = 38;
    // ── Periodo ──────────────────────────────────────────────────────────────
    doc.setTextColor(...COLOR);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(reporte.periodo.toUpperCase(), W / 2, y, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Generado el ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}`, W / 2, y + 6, { align: 'center' });

    y += 14;

    // ── Cajas de resumen ─────────────────────────────────────────────────────
    const boxW  = (W - 30) / 3;
    const boxH  = 16;
    const boxes = [
      { label: 'TOTAL INGRESOS', value: fmt(reporte.totalIngresos), color: VERDE },
      { label: 'TOTAL EGRESOS',  value: fmt(reporte.totalEgresos),  color: ROJO  },
      { label: 'BALANCE',        value: fmt(reporte.balance),       color: reporte.balance >= 0 ? AZUL : ROJO },
    ];
    boxes.forEach((b, i) => {
      const x = 10 + i * (boxW + 5);
      doc.setFillColor(...b.color);
      doc.roundedRect(x, y, boxW, boxH, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(b.label, x + boxW / 2, y + 5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(b.value, x + boxW / 2, y + 12, { align: 'center' });
    });
    y += boxH + 8;

    // ── Tabla helper ─────────────────────────────────────────────────────────
    const drawTable = (headers, rows, colWidths, title) => {
      checkSpace(30);
      doc.setDrawColor(...COLOR);
      doc.setLineWidth(0.3);
      doc.line(10, y, W - 10, y);
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLOR);
      doc.text(title, 10, y);
      y += 5;

      // Cabecera
      doc.setFillColor(...COLOR);
      doc.rect(10, y, W - 20, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      let xh = 12;
      headers.forEach((h, i) => { doc.text(h, xh, y + 4); xh += colWidths[i]; });
      y += 6;

      // Filas
      rows.forEach((row, ri) => {
        checkSpace(7);
        if (ri % 2 === 0) { doc.setFillColor(248, 245, 255); doc.rect(10, y, W - 20, 6, 'F'); }
        doc.setTextColor(30, 30, 30);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        let xr = 12;
        row.forEach((cell, ci) => {
          const txt = String(cell ?? '—');
          const maxW = colWidths[ci] - 2;
          doc.text(txt, xr, y + 4, { maxWidth });
          xr += colWidths[ci];
        });
        y += 6;
      });
      y += 4;
    };

    // ── Por cuenta PUC ───────────────────────────────────────────────────────
    if (reporte.porCuenta.length > 0) {
      drawTable(
        ['Código PUC', 'Categoría', 'Tipo', 'Total'],
        reporte.porCuenta.map(r => [r.codigoPuc, r.cuenta, r.tipo === 'ingreso' ? 'Ingreso' : 'Egreso', fmt(r.total)]),
        [25, 100, 25, 40],
        'Resumen por Categoría PUC'
      );
    }

    // ── Por programa ──────────────────────────────────────────────────────────
    if (reporte.porPrograma.length > 0) {
      drawTable(
        ['Programa', 'Ingresos', 'Egresos', 'Balance'],
        reporte.porPrograma.map(r => [r.programa, fmt(r.ingresos), fmt(r.egresos), fmt(r.balance)]),
        [80, 38, 38, 38],
        'Resumen por Programa'
      );
    }

    // ── Detalle de movimientos ────────────────────────────────────────────────
    if (reporte.movimientos.length > 0) {
      checkSpace(30);
      doc.setDrawColor(...COLOR);
      doc.setLineWidth(0.3);
      doc.line(10, y, W - 10, y);
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLOR);
      doc.text('Detalle de Movimientos', 10, y);
      y += 5;

      // Cabecera
      const hCols = ['N°', 'Fecha', 'Tipo', 'Concepto', 'PUC', 'Monto'];
      const wCols = [16,   20,      16,      80,          18,    30];
      doc.setFillColor(...COLOR);
      doc.rect(10, y, W - 20, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      let xh = 12;
      hCols.forEach((h, i) => { doc.text(h, xh, y + 4); xh += wCols[i]; });
      y += 6;

      reporte.movimientos.forEach((m, ri) => {
        checkSpace(6);
        if (ri % 2 === 0) { doc.setFillColor(248, 245, 255); doc.rect(10, y, W - 20, 6, 'F'); }
        doc.setTextColor(30, 30, 30);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        const esIngreso = m.tipo === 'ingreso';
        const cells = [
          m.consecutivo ? `#${m.consecutivo}-${new Date(m.fecha).getFullYear()}` : '—',
          fmtFecha(m.fecha),
          esIngreso ? 'Ingreso' : 'Egreso',
          m.concepto,
          m.codigoPuc,
          fmt(m.monto),
        ];
        let xr = 12;
        cells.forEach((cell, ci) => {
          if (ci === 5) doc.setTextColor(esIngreso ? 22 : 220, esIngreso ? 163 : 38, esIngreso ? 74 : 38);
          else doc.setTextColor(30, 30, 30);
          doc.text(String(cell ?? '—'), xr, y + 4, { maxWidth: wCols[ci] - 2 });
          xr += wCols[ci];
        });
        y += 6;
      });
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.setFont('helvetica', 'normal');
      doc.text(`Página ${i} de ${totalPages}  —  ${nombre}`, W / 2, H - 6, { align: 'center' });
    }

    doc.save(`reporte_contable_${reporte.periodo.replace(/\s+/g, '_').toLowerCase()}.pdf`);
  });
}
