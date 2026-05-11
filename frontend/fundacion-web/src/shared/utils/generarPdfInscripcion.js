import jsPDF from 'jspdf';

// Carga una imagen desde URL y devuelve un JPEG con fondo morado, aro blanco y foto circular recortada.
// Usar JPEG (sin transparencia) garantiza que jsPDF renderice correctamente sobre cualquier fondo.
async function cargarImagenCircular(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const px   = 320;
        const bord = 4; // ancho del aro en píxeles (delgado)
        const canvas = document.createElement('canvas');
        canvas.width  = px;
        canvas.height = px;
        const ctx = canvas.getContext('2d');
        // Fondo morado (igual que el banner del PDF)
        ctx.fillStyle = 'rgb(78,27,149)';
        ctx.fillRect(0, 0, px, px);
        // Aro color secundario (lila claro)
        ctx.beginPath();
        ctx.arc(px / 2, px / 2, px / 2 - 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(200,185,235)';
        ctx.fill();
        // Clip circular para la foto
        ctx.save();
        ctx.beginPath();
        ctx.arc(px / 2, px / 2, px / 2 - bord, 0, Math.PI * 2);
        ctx.clip();
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx   = (img.naturalWidth  - side) / 2; // centrar horizontalmente
        const sy   = 0;                               // empezar desde arriba para no cortar la cara
        ctx.drawImage(img, sx, sy, side, side, 0, 0, px, px);
        ctx.restore();
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

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
  if (campo.tipo === 'firma')    return v ? '✓  Firma capturada' : '☐  Sin firma';
  if (campo.tipo === 'document') return v ? '✓  Entregado' : '☐  PENDIENTE — no entregado';
  if (campo.tipo === 'documento_id') {
    if (!v) return '—';
    try { const d = JSON.parse(v); return `${d.tipo || '—'}  ${d.numero || '—'}`; } catch { return String(v); }
  }
  if (campo.tipo === 'peso') return v ? `${v} kg` : '—';
  if (campo.tipo === 'grado_escolar') {
    if (!v) return '—';
    try {
      const ge = JSON.parse(v);
      return [ge.grado, ge.jornada ? `Jornada ${ge.jornada}` : null].filter(Boolean).join(' — ') || '—';
    } catch { return String(v); }
  }
  if (v === undefined || v === null || v === '') return '—';
  if (campo.tipo === 'boolean') return (v === 'true' || v === true) ? 'Sí' : 'No';
  if (campo.tipo === 'daterange') {
    try {
      const rng = JSON.parse(v);
      return `${fmtFecha(rng.desde)}  —  ${fmtFecha(rng.hasta)}`;
    } catch { return String(v); }
  }
  if (campo.tipo === 'talla' || campo.tipo === 'altura') return `${v} cm`;
  if (campo.tipo === 'edad')     return `${v} años`;
  if (campo.tipo === 'fecha_nac') return fmtFecha(v);
  return String(v);
}

// ── Generador principal ───────────────────────────────────────────────────────
export async function generarPdfInscripcion({ inscripcion, beneficiario, campos, datos, observaciones, conTercero = false, nombreTercero = '' }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const PW = 210, PH = 297, ML = 13, CW = PW - ML * 2;
  let y = ML;

  // Cargar y recortar la foto del beneficiario en círculo antes de generar el PDF
  const fotoDataUrl = beneficiario.fotoMenorUrl
    ? await cargarImagenCircular(beneficiario.fotoMenorUrl)
    : null;

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
  const D      = 20;   // diámetro visible de la foto en mm (+20 %)
  const BORD   = 0.8;  // grosor del aro en mm (delgado)
  const cx     = ML + CW - D / 2 - BORD - 3;   // centro X (3 mm margen derecho)
  const cy     = y + 33 / 2;                     // centro Y (centrado en banner)

  doc.setFillColor(...PURPLE);
  doc.rect(ML, y, CW, 33, 'F');
  doc.setFillColor(...ACCENT);
  doc.rect(ML, y + 29, CW, 4, 'F');

  // Foto circular del beneficiario — dentro del banner; el JPEG ya incluye fondo morado + aro blanco
  if (fotoDataUrl) {
    const TOTAL = D + BORD * 2;
    doc.addImage(fotoDataUrl, 'JPEG', cx - TOTAL / 2, cy - TOTAL / 2, TOTAL, TOTAL);
  } else {
    doc.setFillColor(...WHITE);
    doc.circle(cx, cy, D / 2 + BORD, 'F');
    doc.setFillColor(100, 60, 170);
    doc.circle(cx, cy, D / 2, 'F');
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 185, 235);
    doc.text('SIN',  cx, cy - 1.5, { align: 'center' });
    doc.text('FOTO', cx, cy + 2.5, { align: 'center' });
  }

  // Texto del encabezado — ancho ajustado para no solapar la foto circular
  const textW = CW - D - BORD * 2 - 10;
  doc.setTextColor(...WHITE);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Fundación Panorama de Colores  ·  Formulario de Inscripción', ML + 5, y + 7);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const nombreProg = inscripcion.nombrePrograma ?? '';
  const lineasProg = doc.splitTextToSize(nombreProg, textW);
  doc.text(lineasProg[0], ML + 5, y + 17);
  if (lineasProg[1]) doc.text(lineasProg[1], ML + 5, y + 24);

  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(hoy, ML + 5, y + 28);
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

    // Agrupar todos los campos de la misma sección juntos (tolerante a orden no consecutivo)
    const grupoOrden = [];
    const grupoMapa  = new Map();
    for (const c of campos) {
      const sec = c.seccion?.trim() || '';
      if (!grupoMapa.has(sec)) { grupoMapa.set(sec, []); grupoOrden.push(sec); }
      grupoMapa.get(sec).push(c);
    }
    const grupos = grupoOrden.map(sec => ({ sec, items: grupoMapa.get(sec) }));

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
        const c1       = items[i];
        const c2       = items[i + 1];
        const esPanel1 = c1.tipo === 'datos_padre' || c1.tipo === 'datos_madre';
        const esAncho1 = esPanel1 || c1.tipo === 'document' || c1.tipo === 'daterange' || c1.tipo === 'firma';
        const esAncho2 = c2 && (c2.tipo === 'document' || c2.tipo === 'daterange' || c2.tipo === 'firma' || c2.tipo === 'datos_padre' || c2.tipo === 'datos_madre');
        const esDoc1   = c1.tipo === 'document';

        // Panel de datos de padre/madre: sub-sección con todos sus campos
        if (esPanel1) {
          const v = datos[c1.id];
          let d = {};
          try { if (v) d = JSON.parse(v); } catch {}
          const nd = (val) => val || '—';
          const titulo = c1.tipo === 'datos_padre' ? 'DATOS DEL PADRE / ACUDIENTE' : 'DATOS DE LA MADRE';
          pageBreak(9);
          doc.setFillColor(200, 185, 235);
          doc.rect(ML, y, CW, 6.5, 'F');
          doc.setDrawColor(...BORDER);
          doc.rect(ML, y, CW, 6.5, 'S');
          doc.setTextColor(...PURPLE);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(`${titulo}  —  ${c1.etiqueta}`, ML + 4, y + 4.5);
          y += 8;
          doc.setTextColor(...DARK);
          fila([
            { etiqueta: 'Fecha de nacimiento', valor: d.fechaNac ? fmtFecha(d.fechaNac) : '—', flex: 1 },
            { etiqueta: 'País',                valor: nd(d.pais),   flex: 1 },
          ]);
          fila([
            { etiqueta: 'Departamento', valor: nd(d.departamento), flex: 1 },
            { etiqueta: 'Ciudad',       valor: nd(d.ciudad),       flex: 1 },
          ]);
          fila([
            { etiqueta: 'Tipo de documento',   valor: nd(d.tipoDoc), flex: 1 },
            { etiqueta: 'Número de documento', valor: nd(d.numDoc),  flex: 2 },
          ]);
          fila([
            { etiqueta: 'Dirección', valor: nd(d.direccion), flex: 2 },
            { etiqueta: 'Barrio',    valor: nd(d.barrio),    flex: 1 },
          ]);
          fila([
            { etiqueta: 'EPS / Aseguradora', valor: nd(d.eps),    flex: 1 },
            { etiqueta: 'Celular',           valor: nd(d.celular), flex: 1 },
          ]);
          fila([
            { etiqueta: 'Nivel de escolaridad', valor: nd(d.escolaridad), flex: 1 },
            { etiqueta: 'Ocupación',            valor: nd(d.ocupacion),   flex: 1 },
          ]);
          if (d.empresa) fila([{ etiqueta: 'Empresa / Lugar de trabajo', valor: d.empresa }]);
          if (d.autoidentificacion) fila([{ etiqueta: 'Autoidentificación étnica', valor: d.autoidentificacion }]);
          i++;
          continue;
        }

        // Firma: renderizar imagen de la firma en el PDF
        if (c1.tipo === 'firma') {
          const v = datos[c1.id];
          const LABEL_H = 7, IMG_H = 22;
          pageBreak(LABEL_H + IMG_H + 1);
          doc.setFillColor(...LPURPLE);
          doc.rect(ML, y, CW, LABEL_H, 'F');
          doc.setDrawColor(...BORDER);
          doc.rect(ML, y, CW, LABEL_H, 'S');
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...GRAY);
          doc.text((c1.etiqueta + (c1.obligatorio ? ' *' : '')).toUpperCase(), ML + 3, y + 4.8);
          y += LABEL_H;
          doc.setFillColor(255, 255, 255);
          doc.rect(ML, y, CW, IMG_H, 'F');
          doc.setDrawColor(...BORDER);
          doc.rect(ML, y, CW, IMG_H, 'S');
          if (v && v.startsWith('data:image')) {
            try { doc.addImage(v, 'PNG', ML + 5, y + 2, 65, IMG_H - 4); } catch {}
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...GRAY);
            doc.text('✓ Firma capturada digitalmente', ML + 75, y + IMG_H / 2 + 1);
          } else {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(200, 80, 0);
            doc.text('— Sin firma', ML + 4, y + IMG_H / 2 + 1.5);
          }
          y += IMG_H;
          i++;
          continue;
        }

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
  const firmaPadre = datos.__firma_padre__;
  const FIRMA_H = firmaPadre ? 48 : 35; // más alto si hay imagen
  pageBreak(conTercero ? FIRMA_H + 15 : FIRMA_H);
  esp(6);

  // Encabezado de la sección de firmas
  doc.setFillColor(...PURPLE);
  doc.rect(ML, y, CW, 7, 'F');
  doc.setFillColor(...ACCENT);
  doc.rect(ML, y, 3, 7, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('FIRMAS Y AUTORIZACIONES', ML + 6, y + 4.8);
  y += 10;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);

  if (conTercero) {
    // ── 3 firmantes: Acudiente | Fundación | Entidad ejecutora ──────────────
    const col  = CW / 3;
    const sigH = firmaPadre ? 22 : 0; // altura reservada para imagen de firma
    const lineY = y + (firmaPadre ? sigH + 4 : 18);
    doc.setDrawColor(...BORDER);

    if (firmaPadre) {
      // Imagen digital de la firma del padre en col 1
      try { doc.addImage(firmaPadre, 'PNG', ML + 4, y + 1, 50, sigH - 2); } catch {}
      doc.setFontSize(6);
      doc.setTextColor(...GRAY);
      doc.text('✓ Firma digital capturada', ML + 4, y + sigH + 2);
    }
    doc.line(ML + 4,           lineY, ML + col - 4,       lineY);
    doc.line(ML + col + 4,     lineY, ML + col * 2 - 4,   lineY);
    doc.line(ML + col * 2 + 4, lineY, ML + CW - 4,        lineY);

    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    // Col 1 — Acudiente
    doc.text('Firma del Acudiente / Responsable', ML + 4,          lineY + 4);
    doc.text('CC / Documento: ________________',  ML + 4,          lineY + 9);
    doc.text('Fecha: _________________________',  ML + 4,          lineY + 14);
    // Col 2 — Fundación
    doc.text('Firma Fundación Panorama de Colores', ML + col + 4,  lineY + 4);
    doc.text('Cargo: ________________________',     ML + col + 4,  lineY + 9);
    doc.text('Fecha: ________________________',     ML + col + 4,  lineY + 14);
    // Col 3 — Tercero
    const etTercero = (nombreTercero || 'Entidad Ejecutora').slice(0, 28);
    doc.text(`Firma: ${etTercero}`,             ML + col * 2 + 4,  lineY + 4);
    doc.text('Cargo: ________________________', ML + col * 2 + 4,  lineY + 9);
    doc.text('Fecha: ________________________', ML + col * 2 + 4,  lineY + 14);

    y = lineY + 19;
  } else {
    // ── 2 firmantes: Acudiente | Fundación ──────────────────────────────────
    const mid  = ML + CW / 2;
    const sigH = firmaPadre ? 22 : 0;
    const lineY = y + (firmaPadre ? sigH + 4 : 18);
    doc.setDrawColor(...BORDER);

    if (firmaPadre) {
      // Imagen digital de la firma del padre
      try { doc.addImage(firmaPadre, 'PNG', ML + 8, y + 1, 60, sigH - 2); } catch {}
      doc.setFontSize(6);
      doc.setTextColor(...GRAY);
      doc.text('✓ Firma digital capturada', ML + 8, y + sigH + 2);
    }
    doc.line(ML + 8,  lineY, mid - 8,     lineY);
    doc.line(mid + 8, lineY, ML + CW - 8, lineY);

    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('Firma del Acudiente / Responsable',         ML + 8,  lineY + 4);
    doc.text('Firma Fundación Panorama de Colores',       mid + 8, lineY + 4);
    doc.text('CC / Documento: ________________________',  ML + 8,  lineY + 9);
    doc.text('Cargo: _________________________________',  mid + 8, lineY + 9);
    doc.text('Fecha: _________________________________',  ML + 8,  lineY + 14);
    doc.text('Fecha: _________________________________',  mid + 8, lineY + 14);

    y = lineY + 19;
  }

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
