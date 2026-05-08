// Genera la hoja de vida del beneficiario como HTML y la abre en una nueva
// pestaña para impresión. Usa window.open para evitar depender de jsPDF.
export function abrirHojaDeVida(ins, edad) {
  const fechaInsc = ins.createdAt
    ? new Date(ins.createdAt).toLocaleDateString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—';

  // ── IMC ──────────────────────────────────────────────────────────────────
  let imc = null;
  if (ins.pesoKg && ins.tallaCm) {
    const tallam = ins.tallaCm / 100;
    const val    = ins.pesoKg / (tallam * tallam);
    let label, color;
    let edadAnios = 0;
    if (ins.fechaNacimiento) {
      const hoy = new Date();
      const nac = new Date(ins.fechaNacimiento);
      edadAnios = hoy.getFullYear() - nac.getFullYear();
      if (hoy < new Date(nac.setFullYear(hoy.getFullYear()))) edadAnios--;
    }
    if (edadAnios < 18) {
      if      (val < 14)   { label = 'Bajo peso severo'; color = '#c62828'; }
      else if (val < 16)   { label = 'Bajo peso';        color = '#ef6c00'; }
      else if (val < 18.5) { label = 'Bajo peso leve';   color = '#f9a825'; }
      else if (val < 25)   { label = 'Peso adecuado';    color = '#2e7d32'; }
      else if (val < 30)   { label = 'Sobrepeso';        color = '#ef6c00'; }
      else                 { label = 'Obesidad';          color = '#c62828'; }
    } else {
      if      (val < 18.5) { label = 'Bajo peso';  color = '#ef6c00'; }
      else if (val < 25)   { label = 'Normal';      color = '#2e7d32'; }
      else if (val < 30)   { label = 'Sobrepeso';   color = '#ef6c00'; }
      else                 { label = 'Obesidad';     color = '#c62828'; }
    }
    imc = { valor: val.toFixed(1), label, color };
  }

  // ── helpers ───────────────────────────────────────────────────────────────
  const item = (label, valor, full = false) =>
    `<div class="item${full ? ' full' : ''}"><div class="label">${label}</div><div class="valor">${valor || '—'}</div></div>`;

  const lugarNac = [ins.ciudadNacimiento, ins.departamentoNacimiento, ins.paisNacimiento]
    .filter(Boolean).join(', ');

  const viveConNinoTxt = ins.viveConNino === true ? 'Sí'
    : ins.viveConNino === false ? 'No' : '—';

  const ventana = window.open('', '_blank');
  if (!ventana) return;

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
    .chip-naranja{background:rgba(239,108,0,.3)}
    .contenido{padding:1.5rem 2.5rem}
    .seccion{margin-bottom:1.5rem}
    .sec-titulo{
      color:#4E1B95;font-weight:800;font-size:.95rem;
      border-left:5px solid #4E1B95;background:rgba(78,27,149,0.07);
      padding:.45rem .9rem;border-radius:0 8px 8px 0;margin-bottom:.9rem;
    }
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
    .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.7rem}
    .item{background:#fdfbff;border:1px solid #f0eaff;border-radius:8px;padding:.6rem .9rem}
    .full{grid-column:1/-1}
    .label{font-size:.66rem;font-weight:800;color:#4E1B95;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.15rem}
    .valor{font-size:.88rem;font-weight:600}
    .tallas{display:flex;gap:.8rem;flex-wrap:wrap}
    .talla{flex:1;min-width:70px;text-align:center;background:#fdfbff;border:1px solid #f0eaff;border-radius:10px;padding:.8rem .5rem}
    .talla-num{font-size:1.4rem;font-weight:800;color:#4E1B95}
    .talla-etiq{font-size:.65rem;color:#6A6A6A;font-weight:700;text-transform:uppercase;margin-top:.15rem}
    .imc-badge{display:inline-block;border-radius:50px;padding:.25rem .9rem;font-size:.8rem;font-weight:800;color:#fff}
    .alerta-roja{background:#fff5f5;border:1.5px solid #fed7d7;border-radius:8px;padding:.6rem .9rem;color:#c53030;font-weight:700;font-size:.85rem}
    .alerta-amarilla{background:#fffde7;border:1.5px solid #ffe082;border-radius:8px;padding:.6rem .9rem;font-size:.85rem}
    .autorizacion-ok{color:#2e7d32;font-weight:800;font-size:.88rem}
    .autorizacion-no{color:#c62828;font-weight:800;font-size:.88rem}
    .pie{text-align:center;font-size:.7rem;color:#aaa;margin-top:1.5rem;border-top:1px solid #f0eaff;padding-top:.8rem}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style>
</head>
<body>

<!-- ── PORTADA ──────────────────────────────────────────────────────────── -->
<div class="portada">
  ${ins.fotoMenorUrl
    ? `<img src="${ins.fotoMenorUrl}" class="avatar" alt="${ins.nombreMenor}">`
    : `<div class="avatar-placeholder">${(ins.nombreMenor || '??').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</div>`}
  <div>
    <div style="font-size:.8rem;opacity:.75;margin-bottom:.2rem">Fundación Panorama de Colores · ${new Date().getFullYear()}</div>
    <h1>${ins.nombreMenor || '—'}</h1>
    <div style="font-size:.88rem;opacity:.85">${ins.tipoDocumento} · ${ins.numeroDocumento || 'Sin documento'} · ${edad}</div>
    <div class="chips">
      ${ins.tieneAlergia === 'si'
        ? '<span class="chip chip-rojo">⚠️ Tiene alergia</span>'
        : '<span class="chip chip-verde">✓ Sin alergia</span>'}
      ${ins.tieneDiscapacidad
        ? '<span class="chip chip-naranja">⚠️ Discapacidad / condición</span>'
        : ''}
      ${ins.autorizacion
        ? '<span class="chip chip-verde">✓ Autorizado</span>'
        : '<span class="chip chip-rojo">✗ Sin autorización</span>'}
      <span class="chip">📅 ${fechaInsc}</span>
      ${ins.eps ? `<span class="chip">🏥 ${ins.eps}</span>` : ''}
    </div>
  </div>
</div>

<div class="contenido">

  <!-- ── DATOS DEL MENOR ─────────────────────────────────────────────────── -->
  <div class="seccion">
    <div class="sec-titulo">👤 Datos del menor</div>
    <div class="grid">
      ${item('Fecha de nacimiento', ins.fechaNacimiento)}
      ${item('Edad', edad)}
      ${item('Tipo documento', ins.tipoDocumento)}
      ${item('Número documento', ins.numeroDocumento)}
      ${lugarNac ? item('Lugar de nacimiento', lugarNac, true) : ''}
      ${ins.barrio   ? item('Barrio',    ins.barrio)   : ''}
      ${ins.direccion ? item('Dirección', ins.direccion, !ins.barrio) : ''}
      ${ins.numPersonasVive != null ? item('Personas con quienes vive', ins.numPersonasVive) : ''}
      ${ins.numHermanos     != null ? item('Número de hermanos',         ins.numHermanos)     : ''}
    </div>
  </div>

  <!-- ── TALLAS ──────────────────────────────────────────────────────────── -->
  <div class="seccion">
    <div class="sec-titulo">👕 Tallas</div>
    <div class="tallas">
      <div class="talla"><div class="talla-num">${ins.tallaCamisa   || '—'}</div><div class="talla-etiq">Camisa</div></div>
      <div class="talla"><div class="talla-num">${ins.tallaPantalon || '—'}</div><div class="talla-etiq">Pantalón</div></div>
      <div class="talla"><div class="talla-num">${ins.tallaZapatos  || '—'}</div><div class="talla-etiq">Zapatos</div></div>
      <div class="talla"><div class="talla-num">${ins.pesoKg != null ? ins.pesoKg + ' kg' : '—'}</div><div class="talla-etiq">Peso</div></div>
      <div class="talla"><div class="talla-num">${ins.tallaCm != null ? ins.tallaCm + ' cm' : '—'}</div><div class="talla-etiq">Altura</div></div>
    </div>
    ${imc ? `
    <div style="margin-top:.9rem;display:flex;align-items:center;gap:.7rem">
      <span style="font-size:.72rem;font-weight:800;color:#4E1B95;text-transform:uppercase;letter-spacing:.05em">IMC:</span>
      <span class="imc-badge" style="background:${imc.color}">${imc.valor} kg/m²</span>
      <span style="font-size:.78rem;font-weight:800;color:${imc.color}">${imc.label}</span>
    </div>` : ''}
  </div>

  <!-- ── SALUD ───────────────────────────────────────────────────────────── -->
  <div class="seccion">
    <div class="sec-titulo">❤️ Salud</div>
    <div class="grid">
      ${item('EPS', ins.eps)}
      <div class="item"><div class="label">¿Tiene alergia?</div>
        <div class="valor" style="color:${ins.tieneAlergia === 'si' ? '#e53e3e' : '#2D984F'};font-weight:800">
          ${ins.tieneAlergia === 'si' ? '⚠️ Sí' : '✓ No'}
        </div>
      </div>
      ${ins.tieneAlergia === 'si'
        ? `<div class="item full"><div class="label">Descripción de la alergia</div><div class="alerta-roja">${ins.descripcionAlergia || '—'}</div></div>`
        : ''}
      ${ins.observacionesSalud
        ? `<div class="item full"><div class="label">Observaciones de salud</div><div class="valor">${ins.observacionesSalud}</div></div>`
        : ''}
      <div class="item ${ins.tieneDiscapacidad && ins.descripcionDiscapacidad ? '' : 'full'}">
        <div class="label">Discapacidad / condición especial</div>
        <div class="valor" style="color:${ins.tieneDiscapacidad ? '#e53e3e' : '#2D984F'};font-weight:800">
          ${ins.tieneDiscapacidad ? '⚠️ Sí' : '✓ No'}
        </div>
      </div>
      ${ins.tieneDiscapacidad && ins.descripcionDiscapacidad
        ? `<div class="item"><div class="label">Descripción</div><div class="alerta-amarilla">${ins.descripcionDiscapacidad}</div></div>`
        : ''}
    </div>
  </div>

  <!-- ── EDUCACIÓN ───────────────────────────────────────────────────────── -->
  ${(ins.nombreColegio || ins.gradoEscolar) ? `
  <div class="seccion">
    <div class="sec-titulo">🎓 Educación</div>
    <div class="grid">
      ${ins.nombreColegio ? item('Colegio', ins.nombreColegio, !ins.gradoEscolar) : ''}
      ${ins.gradoEscolar  ? item('Grado',   ins.gradoEscolar)  : ''}
    </div>
  </div>` : ''}

  <!-- ── ACUDIENTE ───────────────────────────────────────────────────────── -->
  <div class="seccion">
    <div class="sec-titulo">👨‍👩‍👦 Acudiente</div>
    <div class="grid">
      ${item('Nombre',    ins.nombreAcudiente)}
      ${item('Parentesco', ins.parentesco)}
      ${item('WhatsApp',  ins.whatsapp)}
      ${item('¿Vive con el niño?', viveConNinoTxt)}
    </div>
  </div>

  <!-- ── AUTORIZACIÓN ────────────────────────────────────────────────────── -->
  <div class="seccion">
    <div class="sec-titulo">✅ Autorización</div>
    <div class="item full">
      <div class="${ins.autorizacion ? 'autorizacion-ok' : 'autorizacion-no'}">
        ${ins.autorizacion
          ? '✓ El acudiente autorizó la inscripción del menor y el uso de sus datos con fines institucionales.'
          : '✗ Sin autorización registrada.'}
      </div>
    </div>
  </div>

  <!-- ── DOCUMENTO ───────────────────────────────────────────────────────── -->
  ${ins.fotoDocumentoUrl ? `
  <div class="seccion">
    <div class="sec-titulo">🪪 Documento de identidad</div>
    <div class="item full"><div class="label">Estado</div><div class="valor">Documento PDF disponible para descarga desde el panel administrativo.</div></div>
  </div>` : ''}

  <div class="pie">Generado por Panel Admin · Fundación Panorama de Colores · ${new Date().toLocaleDateString('es-CO')}</div>
</div>
<script>window.onload=()=>window.print()<\/script>
</body></html>`);

  ventana.document.close();
}
