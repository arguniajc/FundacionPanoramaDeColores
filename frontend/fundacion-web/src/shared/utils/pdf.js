// Genera la hoja de vida del beneficiario como HTML y la abre en una nueva
// pestaña para impresión. Usa window.open para evitar depender de jsPDF.
export function abrirHojaDeVida(ins, edad) {
  const fechaInsc = ins.createdAt
    ? new Date(ins.createdAt).toLocaleDateString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—';

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
}
