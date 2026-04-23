import jsPDF from 'jspdf';

// Paleta
const PURPLE  = [78, 27, 149];
const LPURPLE = [243, 240, 255];
const BORDER  = [220, 210, 240];
const DARK    = [30, 30, 30];
const GRAY    = [120, 120, 120];
const WHITE   = [255, 255, 255];
const ACCENT  = [110, 55, 190];

const ESTADOS_LABEL = {
  activa: 'Activa', suspendida: 'Suspendida',
  completada: 'Completada', baja: 'Baja',
};

function calcEdad(fechaNac) {
  if (!fechaNac) return null;
  const nac = new Date(fechaNac + 'T00:00:00');
  const hoy = new Date();
  let e = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
  return e;
}

function fmtFecha(iso) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function valorCampo(campo, datos) {
  const v = datos[campo.id];
  if (campo.tipo === 'document') return v ? '✓  Entregado' : '☐  PENDIENTE — no entregado';
  if (v === undefined || v === null || v === '') return '—';
  if (campo.tipo === 'boolean') return (v === 'true' || v === true) ? 'Sí' : 'No';
  if (campo.tipo === 'daterange') {
    try {
      const rng = JSON.parse(v);
      return `${fmtFecha(rng.desde)}  —  ${fmtFecha(rng.hasta)}`;
    } catch { return String(v); }
  }
  if (campo.tipo === 'altura')   return `${v} cm`;
  if (campo.tipo === 'edad')     return `${v} años`;
  if (campo.tipo === 'fecha_nac') return fmtFecha(v);
  return String(v);
}

// ── Generador principal ───────────────────────────────────────────────────────
export function generarPdfInscripcion({ inscripcion, beneficiario, campos, datos, observaciones }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const PW = 210, PH = 297, ML = 13, CW = PW - ML * 2;
  let y = ML;

  // ─── helpers ───────────────────────────────────────────────────────────────

  function pageBreak(needed) {
    if (y + needed > PH - 16) {
      addFooter();
      doc.addPage();
      y = ML;
    }
  }

  function seccion(titulo) {
    pageBreak(12);
    doc.setFillColor(...PURPLE);
    doc.rect(ML, y, CW, 7, 'F');
    doc.setFillColor(...ACCENT);
    doc.rect(ML, y, 3, 7, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo.toUpperCase(), ML + 6, y + 4.8);
    y += 9;
  }

  // pares: [{ etiqueta, valor, flex? }]
  function fila(pares) {
    const totalFlex = pares.reduce((s, p) => s + (p.flex ?? 1), 0);
    const anchos    = pares.map(p => CW * (p.flex ?? 1) / totalFlex);

    // Calcular líneas de cada campo para determinar altura de fila
    doc.setFontSize(8.5);
    const lineas = pares.map((p, i) =>
      doc.splitTextToSize(String(p.valor ?? '—'), anchos[i] - 5)
    );
    const maxL  = Math.max(...lineas.map(l => l.length));
    const altFila = Math.max(11, 5.5 + maxL * 4.5);

    pageBreak(altFila);

    doc.setFillColor(...LPURPLE);
    doc.rect(ML, y, CW, altFila, 'F');
    doc.setDrawColor(...BORDER);
    doc.rect(ML, y, CW, altFila, 'S');

    let x = ML;
    pares.forEach((p, i) => {
      if (i > 0) {
        doc.setDrawColor(...BORDER);
        doc.line(x, y + 1, x, y + altFila - 1);
      }
      // Etiqueta (pequeña, gris)
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      doc.text(String(p.etiqueta).toUpperCase(), x + 3, y + 4.5);
      // Valor (normal; naranja si alerta=true)
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...(p.alerta ? [200, 80, 0] : DARK));
      lineas[i].forEach((l, li) => doc.text(l, x + 3, y + 9 + li * 4.5));
      doc.setTextColor(...DARK);
      x += anchos[i];
    });
    y += altFila;
  }

  function esp(h = 3) { y += h; }

  // ─── Encabezado ────────────────────────────────────────────────────────────
  doc.setFillColor(...PURPLE);
  doc.rect(ML, y, CW, 33, 'F');
  doc.setFillColor(...ACCENT);
  doc.rect(ML, y + 29, CW, 4, 'F');

  doc.setTextColor(...WHITE);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Fundación Panorama de Colores  ·  Formulario de Inscripción', ML + 5, y + 8);

  // Nombre del programa — título grande
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const nombreProg = inscripcion.nombrePrograma ?? '';
  const lineasProg = doc.splitTextToSize(nombreProg, CW - 10);
  doc.text(lineasProg[0], ML + 5, y + 18);
  if (lineasProg[1]) doc.text(lineasProg[1], ML + 5, y + 25);

  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(hoy, ML + CW - 3, y + 8, { align: 'right' });
  y += 37;

  // ─── Datos del beneficiario ─────────────────────────────────────────────────
  seccion('Datos del Beneficiario');
  const edad = calcEdad(beneficiario.fechaNacimiento);
  fila([
    { etiqueta: 'Nombre completo', valor: beneficiario.nombreMenor, flex: 3 },
    { etiqueta: 'Fecha de nacimiento', valor: fmtFecha(beneficiario.fechaNacimiento), flex: 2 },
    { etiqueta: 'Edad', valor: edad != null ? `${edad} años` : '—', flex: 1 },
  ]);
  fila([
    { etiqueta: 'Tipo de documento', valor: beneficiario.tipoDocumento, flex: 1 },
    { etiqueta: 'Número de documento', valor: beneficiario.numeroDocumento, flex: 1 },
    { etiqueta: 'Estado', valor: beneficiario.activo ? 'Activo' : 'Dado de baja', flex: 1 },
  ]);
  esp(2);

  // ─── Acudiente ──────────────────────────────────────────────────────────────
  seccion('Datos del Acudiente / Responsable');
  fila([
    { etiqueta: 'Nombre del acudiente', valor: beneficiario.nombreAcudiente, flex: 3 },
    { etiqueta: 'Parentesco', valor: beneficiario.parentesco, flex: 1 },
    { etiqueta: 'WhatsApp / Teléfono', valor: beneficiario.whatsapp, flex: 1 },
  ]);
  fila([{ etiqueta: 'Dirección', valor: beneficiario.direccion, flex: 1 }]);
  esp(2);

  // ─── Salud y tallas ─────────────────────────────────────────────────────────
  seccion('Información de Salud y Tallas');
  fila([
    { etiqueta: 'EPS / Aseguradora', valor: beneficiario.eps, flex: 2 },
    { etiqueta: 'Tiene alergia', valor: beneficiario.tieneAlergia === 'si' ? 'Sí' : 'No', flex: 1 },
    { etiqueta: 'Talla camisa', valor: beneficiario.tallaCamisa, flex: 1 },
    { etiqueta: 'Talla pantalón', valor: beneficiario.tallaPantalon, flex: 1 },
    { etiqueta: 'Talla zapatos', valor: beneficiario.tallaZapatos, flex: 1 },
  ]);
  if (beneficiario.tieneAlergia === 'si' && beneficiario.descripcionAlergia) {
    fila([{ etiqueta: 'Descripción de alergia', valor: beneficiario.descripcionAlergia }]);
  }
  if (beneficiario.observacionesSalud) {
    fila([{ etiqueta: 'Observaciones de salud', valor: beneficiario.observacionesSalud }]);
  }
  esp(2);

  // ─── Programa / inscripción ─────────────────────────────────────────────────
  seccion('Programa de Inscripción');
  fila([
    { etiqueta: 'Programa', valor: inscripcion.nombrePrograma, flex: 2 },
    { etiqueta: 'Sede', valor: inscripcion.nombreSede, flex: 2 },
    { etiqueta: 'Estado', valor: ESTADOS_LABEL[inscripcion.estado] ?? inscripcion.estado, flex: 1 },
  ]);
  fila([
    { etiqueta: 'Fecha de inscripción', valor: new Date(inscripcion.fechaInscripcion).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }), flex: 1 },
  ]);
  esp(2);

  // ─── Formulario dinámico del programa ───────────────────────────────────────
  if (campos.length > 0) {
    seccion('Formulario del Programa');

    // Agrupar campos consecutivos por sección
    const grupos = [];
    for (const c of campos) {
      const sec  = c.seccion?.trim() || '';
      const last = grupos[grupos.length - 1];
      if (!last || last.sec !== sec) grupos.push({ sec, items: [c] });
      else last.items.push(c);
    }

    for (const { sec, items } of grupos) {
      // Sub-encabezado de sección
      if (sec) {
        pageBreak(9);
        doc.setFillColor(220, 210, 240);
        doc.rect(ML, y, CW, 6.5, 'F');
        doc.setDrawColor(...BORDER);
        doc.rect(ML, y, CW, 6.5, 'S');
        doc.setTextColor(...PURPLE);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(sec.toUpperCase(), ML + 4, y + 4.5);
        y += 8;
        doc.setTextColor(...DARK);
      }

      let i = 0;
      while (i < items.length) {
        const c1      = items[i];
        const esAncho1 = c1.tipo === 'document' || c1.tipo === 'daterange';
        const c2      = items[i + 1];
        const esAncho2 = c2 && (c2.tipo === 'document' || c2.tipo === 'daterange');
        const esDoc1   = c1.tipo === 'document';

        if (esAncho1 || !c2 || esAncho2) {
          fila([{ etiqueta: c1.etiqueta + (c1.obligatorio ? ' *' : ''), valor: valorCampo(c1, datos),
                  alerta: esDoc1 && !datos[c1.id] }]);
          i++;
        } else {
          fila([
            { etiqueta: c1.etiqueta + (c1.obligatorio ? ' *' : ''), valor: valorCampo(c1, datos), flex: 1 },
            { etiqueta: c2.etiqueta + (c2.obligatorio ? ' *' : ''), valor: valorCampo(c2, datos), flex: 1 },
          ]);
          i += 2;
        }
      }
    }
    esp(2);
  }

  // ─── Observaciones ──────────────────────────────────────────────────────────
  if (observaciones) {
    seccion('Observaciones');
    fila([{ etiqueta: 'Observaciones de la inscripción', valor: observaciones }]);
    esp(2);
  }

  // ─── Firmas ─────────────────────────────────────────────────────────────────
  pageBreak(30);
  esp(8);
  const mid   = ML + CW / 2;
  const lineY = y + 16;
  doc.setDrawColor(...BORDER);
  doc.line(ML + 8,      lineY, mid - 8,      lineY);
  doc.line(mid + 8,     lineY, ML + CW - 8,  lineY);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('Firma del Acudiente / Responsable',          ML + 8,     lineY + 4);
  doc.text('Firma Fundación Panorama de Colores',        mid + 8,    lineY + 4);
  doc.text(`CC / Documento: ________________________`,   ML + 8,     lineY + 9);
  doc.text(`Cargo: _________________________________`,   mid + 8,    lineY + 9);
  y = lineY + 14;

  // ─── Pie de página (todas las páginas) ─────────────────────────────────────
  addFooter();

  function addFooter() {
    const total = doc.internal.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      doc.setFillColor(248, 246, 255);
      doc.rect(0, PH - 11, PW, 11, 'F');
      doc.setDrawColor(...BORDER);
      doc.line(ML, PH - 11, PW - ML, PH - 11);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      doc.text('Fundación Panorama de Colores  ·  Documento generado automáticamente', ML, PH - 5);
      doc.text(`Pág. ${p} / ${total}`, PW - ML, PH - 5, { align: 'right' });
    }
  }

  return doc;
}
