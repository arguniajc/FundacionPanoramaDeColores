// Exportaciones de un período de nómina: Excel (una fila por empleado) y desprendibles
// de pago en PDF (una página por empleado), con jsPDF cargado solo al generar.
import { exportarExcel, registrarExportacion } from '@/shared/utils/exportarExcel';
import { fmtCOP, nombrePeriodo, salarioPeriodo } from './nominaFormato';

const COLOR = [78, 27, 149];

const slug = t => String(t ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();

export const COLUMNAS_NOMINA = [
  ['Documento',          l => l.numeroDocumento ?? '',  14],
  ['Empleado',           l => l.empleadoNombre ?? '',   30],
  ['Cargo',              l => l.cargo ?? '',            24],
  ['Días trabajados',    l => Number(l.diasTrabajados ?? 0), 9],
  ['Salario mensual',    l => Number(l.salarioBase ?? 0),       14],
  ['Salario del período', l => salarioPeriodo(l),               14],
  ['Auxilio transporte', l => Number(l.auxilioTransporte ?? 0), 14],
  ['Horas extras',       l => Number(l.horasExtras ?? 0),       13],
  ['Bonificaciones',     l => Number(l.bonificaciones ?? 0),    13],
  ['Deducción salud',    l => Number(l.deduccionSalud ?? 0),    13],
  ['Deducción pensión',  l => Number(l.deduccionPension ?? 0),  13],
  ['Retención fuente',   l => Number(l.retencionFuente ?? 0),   13],
  ['Otras deducciones',  l => Number(l.otrasDeducciones ?? 0),  13],
  ['Total devengado',    l => Number(l.totalDevengado ?? 0),    15],
  ['Total deducciones',  l => Number(l.totalDeducciones ?? 0),  15],
  ['Neto a pagar',       l => Number(l.netoPagar ?? 0),         15],
];

/** Filas del Excel: cabecera, una fila por empleado y una fila de totales. */
export function filasNominaExcel(liquidaciones) {
  const cuerpo = liquidaciones.map(l => COLUMNAS_NOMINA.map(([, valor]) => valor(l)));
  const totales = COLUMNAS_NOMINA.map(([, valor], i) => {
    if (i === 0) return 'TOTAL';
    if (i < 4) return '';
    return liquidaciones.reduce((s, l) => s + valor(l), 0);
  });
  return [COLUMNAS_NOMINA.map(([titulo]) => titulo), ...cuerpo, totales];
}

/** Descarga el Excel del período. Devuelve true si se generó (registra la exportación). */
export function exportarNominaExcel(periodo, liquidaciones) {
  return exportarExcel(`nomina_${slug(nombrePeriodo(periodo))}`, [{
    nombre: nombrePeriodo(periodo),
    filas:  filasNominaExcel(liquidaciones),
    // La hoja se arma con `filas`; `datos` solo sirve para que el registro de la
    // exportación cuente a los empleados y no la fila de totales
    datos:  liquidaciones,
    cols:   COLUMNAS_NOMINA.map(([, , ancho]) => ancho),
  }]);
}

function dibujarDesprendible(doc, periodo, l, config) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const nombre = config?.nombreFundacion || 'Fundación Panorama de Colores';
  const sub = [config?.nit ? `NIT ${config.nit}` : '', config?.direccion || '', config?.telefono ? `Tel. ${config.telefono}` : '']
    .filter(Boolean).join('  ·  ');

  // ── Encabezado ──────────────────────────────────────────────────────────
  doc.setFillColor(...COLOR);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(nombre, W / 2, 10, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (sub) doc.text(sub, W / 2, 17, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('DESPRENDIBLE DE PAGO DE NÓMINA', W / 2, 24, { align: 'center' });

  // ── Período y empleado ──────────────────────────────────────────────────
  let y = 36;
  doc.setTextColor(...COLOR);
  doc.setFontSize(11);
  doc.text(`Período: ${nombrePeriodo(periodo)}`, 10, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  const pago = periodo?.fechaPago ? `Fecha de pago: ${periodo.fechaPago}  ·  ` : '';
  doc.text(`${pago}Emitido: ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}`,
    W - 10, y, { align: 'right' });
  y += 6;

  const datos = [
    ['Empleado',        l.empleadoNombre ?? '—'],
    ['Documento',       l.numeroDocumento ?? '—'],
    ['Cargo',           l.cargo ?? '—'],
    ['Días trabajados', String(l.diasTrabajados ?? 0)],
  ];
  doc.setLineWidth(0.2);
  datos.forEach(([etq, val], i) => {
    const fy = y + i * 8;
    if (i % 2 === 0) { doc.setFillColor(248, 245, 255); doc.rect(10, fy, W - 20, 8, 'F'); }
    doc.setDrawColor(220, 215, 230);
    doc.rect(10, fy, W - 20, 8, 'D');
    doc.setTextColor(100, 80, 130);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(etq.toUpperCase(), 14, fy + 5.2);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(String(val), 55, fy + 5.2, { maxWidth: W - 70 });
  });
  y += datos.length * 8 + 8;

  // ── Devengados y deducciones (dos columnas) ─────────────────────────────
  const devengados = [
    [`Salario (${l.diasTrabajados ?? 30} de 30 días)`, salarioPeriodo(l)],
    ['Auxilio de transporte', l.auxilioTransporte],
    ['Horas extras',          l.horasExtras],
    ['Bonificaciones',        l.bonificaciones],
  ];
  const deducciones = [
    ['Salud (4%)',             l.deduccionSalud],
    ['Pensión (4%)',           l.deduccionPension],
    ['Retención en la fuente', l.retencionFuente],
    ['Otras deducciones',      l.otrasDeducciones],
  ];
  const colW = (W - 26) / 2;
  const tabla = (x, titulo, filas, total, etiquetaTotal, color) => {
    doc.setFillColor(...color);
    doc.rect(x, y, colW, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(titulo, x + 3, y + 5.3);
    filas.forEach(([etq, val], i) => {
      const fy = y + 8 + i * 8;
      doc.setDrawColor(220, 215, 230);
      doc.rect(x, fy, colW, 8, 'D');
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      doc.text(etq, x + 3, fy + 5.3);
      doc.text(fmtCOP(val), x + colW - 3, fy + 5.3, { align: 'right' });
    });
    const ty = y + 8 + filas.length * 8;
    doc.setFillColor(243, 240, 250);
    doc.rect(x, ty, colW, 8, 'F');
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(etiquetaTotal, x + 3, ty + 5.3);
    doc.text(fmtCOP(total), x + colW - 3, ty + 5.3, { align: 'right' });
  };
  tabla(10, 'DEVENGADOS', devengados, l.totalDevengado, 'Total devengado', [22, 163, 74]);
  tabla(16 + colW, 'DEDUCCIONES', deducciones, l.totalDeducciones, 'Total deducciones', [220, 38, 38]);
  y += 8 + 4 * 8 + 8 + 8;

  // ── Neto ────────────────────────────────────────────────────────────────
  doc.setFillColor(248, 245, 255);
  doc.roundedRect(10, y, W - 20, 16, 2, 2, 'F');
  doc.setDrawColor(...COLOR);
  doc.setLineWidth(0.5);
  doc.roundedRect(10, y, W - 20, 16, 2, 2, 'D');
  doc.setTextColor(...COLOR);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('NETO A PAGAR', W / 2, y + 5, { align: 'center' });
  doc.setFontSize(14);
  doc.text(fmtCOP(l.netoPagar), W / 2, y + 13, { align: 'center' });
  y += 24;

  if (l.observacion) {
    doc.setTextColor(...COLOR);
    doc.setFontSize(8);
    doc.text('OBSERVACIONES', 10, y);
    y += 5;
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'normal');
    const lineas = doc.splitTextToSize(String(l.observacion), W - 20);
    doc.text(lineas, 10, y);
    y += lineas.length * 4.5 + 4;
  }

  // ── Firmas y pie ────────────────────────────────────────────────────────
  const firmaY = Math.max(y + 20, H - 45);
  doc.setDrawColor(...COLOR);
  doc.setLineWidth(0.4);
  doc.line(20, firmaY, 85, firmaY);
  doc.line(W - 85, firmaY, W - 20, firmaY);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Firma del empleador', 52.5, firmaY + 4, { align: 'center' });
  doc.text('Recibí conforme (empleado)', W - 52.5, firmaY + 4, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setTextColor(180, 180, 180);
  doc.text(`${nombre}  —  Documento generado electrónicamente`, W / 2, H - 6, { align: 'center' });
}

/**
 * Genera los desprendibles de pago (una página por empleado) en un solo PDF.
 * Con una sola liquidación el archivo lleva el nombre del empleado.
 */
export async function generarDesprendiblesPDF(periodo, liquidaciones, config) {
  if (!liquidaciones?.length) return false;
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  liquidaciones.forEach((l, i) => {
    if (i > 0) doc.addPage();
    dibujarDesprendible(doc, periodo, l, config);
  });

  const base = `desprendible_${slug(nombrePeriodo(periodo))}`;
  const archivo = liquidaciones.length === 1
    ? `${base}_${slug(liquidaciones[0].empleadoNombre)}`
    : `${base}_todos`;
  doc.save(`${archivo}.pdf`);
  registrarExportacion(archivo, [{ datos: liquidaciones }]);
  return true;
}
