// ── admin.js ── Panel Administrativo Fundación Panorama de Colores

const SUPABASE_URL = 'https://hfitfoevyqbhkqjeaegs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmaXRmb2V2eXFiaGtxamVhZWdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MzQwNjgsImV4cCI6MjA4NzExMDA2OH0.rcTZdY7Av2YVU4FMvbbjqOPv76FC5xW9Cs14Gj2Dzmg';

const EMAILS_AUTORIZADOS = [
    'panoramadecolores@gmail.com',
    'diegonandosalazar@gmail.com'
];

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ══ VARIABLES GLOBALES ══
let inscripciones          = [];
let inscripcionesFiltradas = [];
let inscripcionActual      = null;
let idParaEliminar         = null;

const POR_PAGINA = 10;
let paginaActual = 1;

// ══ DATOS DE PRUEBA ══
const USUARIO_PRUEBA = {
    id: 'test-001',
    nombre_menor: 'Juan David Salazar',
    fecha_nacimiento: '2015-03-22',
    tipo_documento: 'TI',
    numero_documento: '1118305449',
    eps: 'Sura',
    talla_camisa: 'M',
    talla_pantalon: '28',
    talla_zapatos: '36',
    tiene_alergia: 'si',
    descripcion_alergia: 'Alergia al maní y al polvo',
    observaciones_salud: 'Usa inhalador ocasionalmente',
    nombre_acudiente: 'María Salazar',
    parentesco: 'Madre',
    whatsapp: '3226012056',
    direccion: 'Cra 7F #16H-10 Barrio Panorama, Yumbo',
    foto_menor_url: null,
    foto_documento_url: null,
    created_at: new Date().toISOString()
};

// ══════════════════════════════════════════════
// 1. AUTENTICACIÓN
// ══════════════════════════════════════════════

/**
 * Detecta automáticamente la URL de redirect según el entorno:
 * - Local (127.0.0.1 o localhost) → usa la URL local de Live Server
 * - Producción → usa el dominio real de la fundación
 */
function getRedirectUrl() {
    const hostname = window.location.hostname;
    const esLocal  = hostname === '127.0.0.1' || hostname === 'localhost';
    return esLocal
        ? 'http://127.0.0.1:5500/html/admin.html'
        : 'https://fundacionpanoramadecolores.org/html/admin.html';
}

async function iniciar() {
    db.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            const email = session.user.email;
            if (!EMAILS_AUTORIZADOS.includes(email)) {
                await db.auth.signOut();
                alert('❌ Acceso no autorizado. Tu correo no tiene permisos para este panel.');
                mostrarLogin();
                return;
            }
            mostrarPanel(session.user);
            cargarInscripciones();
        } else {
            mostrarLogin();
        }
    });
}

function mostrarLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminPanel').style.display  = 'none';
}

function mostrarPanel(user) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display  = 'block';
    document.getElementById('userName').textContent  = user.user_metadata?.full_name || 'Admin';
    document.getElementById('userEmail').textContent = user.email;
    const avatar = user.user_metadata?.avatar_url;
    document.getElementById('userAvatar').src = avatar || '../images/logo.png';
}

document.getElementById('btnGoogle').addEventListener('click', async () => {
    const { error } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: getRedirectUrl()   // ← URL dinámica según entorno
        }
    });
    if (error) alert('Error al iniciar sesión: ' + error.message);
});

document.getElementById('btnLogout').addEventListener('click', async () => {
    await db.auth.signOut();
});

// ══════════════════════════════════════════════
// 2. CARGAR INSCRIPCIONES
// ══════════════════════════════════════════════
async function cargarInscripciones() {
    mostrarCargando();

    const { data, error } = await db
        .from('inscripciones')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        document.getElementById('tablaBody').innerHTML =
            `<tr><td colspan="9" class="empty-row">❌ Error al cargar datos: ${error.message}</td></tr>`;
        return;
    }

    inscripciones          = [USUARIO_PRUEBA, ...(data || [])];
    inscripcionesFiltradas = [...inscripciones];
    paginaActual           = 1;
    renderTabla();
    actualizarContadores(inscripciones);
}

function mostrarCargando() {
    document.getElementById('tablaBody').innerHTML =
        `<tr><td colspan="9" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Cargando inscripciones...</td></tr>`;
}

// ══════════════════════════════════════════════
// 3. RENDERIZAR TABLA CON PAGINACIÓN
// ══════════════════════════════════════════════
function renderTabla() {
    const tbody = document.getElementById('tablaBody');

    if (!inscripcionesFiltradas.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-row"><i class="fas fa-inbox"></i><br>No hay inscripciones que coincidan</td></tr>`;
        renderPaginacion(0);
        return;
    }

    const totalPaginas = Math.ceil(inscripcionesFiltradas.length / POR_PAGINA);
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    const inicio = (paginaActual - 1) * POR_PAGINA;
    const fin    = inicio + POR_PAGINA;
    const pagina = inscripcionesFiltradas.slice(inicio, fin);

    tbody.innerHTML = pagina.map((ins, idx) => {
        const iniciales = (ins.nombre_menor || '??')
            .split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        const fotoPerfil = ins.foto_menor_url
            ? `<img src="${ins.foto_menor_url}" class="foto-perfil" alt="${ins.nombre_menor}"
                   onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : '';

        const placeholder = `<div class="foto-placeholder" ${ins.foto_menor_url ? 'style="display:none"' : ''}>${iniciales}</div>`;

        const alergiaBadge = ins.tiene_alergia === 'si'
            ? `<span class="badge-alergia"><i class="fas fa-exclamation-circle"></i> Sí</span>`
            : `<span class="badge-ok">✓ No</span>`;

        const edad   = ins.fecha_nacimiento ? calcularEdad(ins.fecha_nacimiento) : '—';
        const numFila = inicio + idx + 1;

        return `
            <tr onclick="verDetalle('${ins.id}')" class="fila-inscripcion">
                <td class="td-num">${numFila}</td>
                <td>
                    <div style="position:relative;">
                        ${fotoPerfil}
                        ${placeholder}
                    </div>
                </td>
                <td><strong>${ins.nombre_menor || '—'}</strong></td>
                <td class="td-doc">${ins.tipo_documento || ''} ${ins.numero_documento || '—'}</td>
                <td>${edad}</td>
                <td>${ins.nombre_acudiente || '—'}</td>
                <td>
                    ${ins.whatsapp
                        ? `<a href="https://wa.me/${ins.whatsapp.replace(/\D/g,'')}" target="_blank"
                              onclick="event.stopPropagation()"
                              class="link-whatsapp"><i class="fab fa-whatsapp"></i> ${ins.whatsapp}</a>`
                        : '—'}
                </td>
                <td>${alergiaBadge}</td>
                <td>
                    <div class="acciones" onclick="event.stopPropagation()">
                        <button class="btn-ver"         title="Ver detalle" onclick="verDetalle('${ins.id}')"><i class="fas fa-eye"></i></button>
                        <button class="btn-editar-sm"   title="Editar"      onclick="abrirEditar('${ins.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-eliminar-sm" title="Eliminar"    onclick="confirmarEliminar('${ins.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    renderPaginacion(totalPaginas);
}

// ══════════════════════════════════════════════
// 4. PAGINACIÓN
// ══════════════════════════════════════════════
function renderPaginacion(totalPaginas) {
    const contenedor = document.getElementById('paginacionContenedor');
    if (!contenedor) return;

    if (totalPaginas <= 1) { contenedor.innerHTML = ''; return; }

    const inicio = (paginaActual - 1) * POR_PAGINA + 1;
    const fin    = Math.min(paginaActual * POR_PAGINA, inscripcionesFiltradas.length);

    let html = `
        <div class="paginacion-info">Mostrando ${inicio}–${fin} de ${inscripcionesFiltradas.length}</div>
        <div class="paginacion-botones">`;

    html += `<button class="btn-pag" onclick="irPagina(${paginaActual - 1})" ${paginaActual === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
             </button>`;

    for (let i = 1; i <= totalPaginas; i++) {
        if (i === 1 || i === totalPaginas || (i >= paginaActual - 1 && i <= paginaActual + 1)) {
            html += `<button class="btn-pag ${i === paginaActual ? 'activo' : ''}" onclick="irPagina(${i})">${i}</button>`;
        } else if (i === paginaActual - 2 || i === paginaActual + 2) {
            html += `<span class="pag-dots">…</span>`;
        }
    }

    html += `<button class="btn-pag" onclick="irPagina(${paginaActual + 1})" ${paginaActual === totalPaginas ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
             </button>
        </div>`;

    contenedor.innerHTML = html;
}

function irPagina(n) {
    const total = Math.ceil(inscripcionesFiltradas.length / POR_PAGINA);
    if (n < 1 || n > total) return;
    paginaActual = n;
    renderTabla();
    document.querySelector('.table-wrapper')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ══════════════════════════════════════════════
// 5. CONTADORES
// ══════════════════════════════════════════════
function actualizarContadores(datos) {
    const total       = datos.length;
    const alergias    = datos.filter(i => i.tiene_alergia === 'si').length;
    const conDoc      = datos.filter(i => i.numero_documento && i.numero_documento !== 'Sin documento').length;
    const venezolanos = datos.filter(i => ['PPT', 'Pasaporte', 'RAMV'].includes(i.tipo_documento)).length;

    document.getElementById('totalInscritos').textContent   = total;
    document.getElementById('totalAlergias').textContent    = alergias;
    document.getElementById('statTotal').textContent        = total;
    document.getElementById('statAlergiasCard').textContent = alergias;
    document.getElementById('statConDoc').textContent       = conDoc;
    document.getElementById('statVenezolanos').textContent  = venezolanos;
}

// ══════════════════════════════════════════════
// 6. BÚSQUEDA Y FILTRO
// ══════════════════════════════════════════════
document.getElementById('searchInput').addEventListener('input', filtrar);
document.getElementById('filterCombo').addEventListener('change', filtrar);

function filtrar() {
    const texto  = document.getElementById('searchInput').value.toLowerCase().trim();
    const filtro = document.getElementById('filterCombo').value;

    let resultado = [...inscripciones];

    if (filtro === 'alergia') {
        resultado = resultado.filter(i => i.tiene_alergia === 'si');
    }

    if (texto) {
        resultado = resultado.filter(i => {
            const nombre    = (i.nombre_menor     || '').toLowerCase();
            const doc       = (i.numero_documento || '').toLowerCase();
            const tipoDoc   = (i.tipo_documento   || '').toLowerCase();
            const acudiente = (i.nombre_acudiente || '').toLowerCase();
            const whatsapp  = (i.whatsapp         || '').toLowerCase();

            if (filtro === 'documento') return doc.includes(texto) || tipoDoc.includes(texto);
            if (filtro === 'nombre')    return nombre.includes(texto);
            return nombre.includes(texto) || doc.includes(texto) ||
                   acudiente.includes(texto) || whatsapp.includes(texto);
        });
    }

    inscripcionesFiltradas = resultado;
    paginaActual = 1;
    renderTabla();
}

// ══════════════════════════════════════════════
// 7. VER DETALLE — HOJA DE VIDA
// ══════════════════════════════════════════════
function verDetalle(id) {
    const ins = inscripciones.find(i => i.id === id);
    if (!ins) return;
    inscripcionActual = ins;

    const iniciales = (ins.nombre_menor || '??').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const edad      = ins.fecha_nacimiento ? calcularEdad(ins.fecha_nacimiento) : '—';
    const fechaInsc = ins.created_at
        ? new Date(ins.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
        : '—';

    document.getElementById('modalTitulo').textContent = ins.nombre_menor || 'Detalle';

    document.getElementById('modalBody').innerHTML = `
        <div class="hv-cabecera">
            <div class="hv-foto-wrap">
                ${ins.foto_menor_url
                    ? `<img src="${ins.foto_menor_url}" class="hv-foto" alt="${ins.nombre_menor}">`
                    : `<div class="hv-foto-placeholder">${iniciales}</div>`}
                <div class="hv-badge-inscrito">Inscrito</div>
            </div>
            <div class="hv-info-principal">
                <h2 class="hv-nombre">${ins.nombre_menor || '—'}</h2>
                <div class="hv-meta">
                    <span class="hv-chip"><i class="fas fa-id-card"></i> ${ins.tipo_documento || ''} · ${ins.numero_documento || '—'}</span>
                    <span class="hv-chip"><i class="fas fa-birthday-cake"></i> ${edad}</span>
                    ${ins.tiene_alergia === 'si'
                        ? `<span class="hv-chip hv-chip-rojo"><i class="fas fa-exclamation-triangle"></i> Alergia</span>`
                        : `<span class="hv-chip hv-chip-verde"><i class="fas fa-check-circle"></i> Sin alergia</span>`}
                </div>
                <div class="hv-fecha-insc"><i class="fas fa-calendar-plus"></i> Inscrito el ${fechaInsc}</div>
            </div>
        </div>

        <div class="hv-seccion">
            <div class="hv-seccion-titulo"><i class="fas fa-user"></i> Datos Personales</div>
            <div class="hv-grid">
                <div class="hv-item">
                    <div class="hv-label">Fecha de nacimiento</div>
                    <div class="hv-valor">${ins.fecha_nacimiento || '—'}</div>
                </div>
                <div class="hv-item">
                    <div class="hv-label">Edad</div>
                    <div class="hv-valor">${edad}</div>
                </div>
                <div class="hv-item">
                    <div class="hv-label">Tipo de documento</div>
                    <div class="hv-valor">${ins.tipo_documento || '—'}</div>
                </div>
                <div class="hv-item">
                    <div class="hv-label">Número de documento</div>
                    <div class="hv-valor">${ins.numero_documento || '—'}</div>
                </div>
                <div class="hv-item hv-item-full">
                    <div class="hv-label">Dirección</div>
                    <div class="hv-valor">${ins.direccion || '—'}</div>
                </div>
            </div>
        </div>

        <div class="hv-seccion">
            <div class="hv-seccion-titulo"><i class="fas fa-heartbeat"></i> Salud</div>
            <div class="hv-grid">
                <div class="hv-item">
                    <div class="hv-label">EPS</div>
                    <div class="hv-valor">${ins.eps || '—'}</div>
                </div>
                <div class="hv-item">
                    <div class="hv-label">¿Tiene alergia?</div>
                    <div class="hv-valor" style="color:${ins.tiene_alergia === 'si' ? '#e53e3e' : 'var(--primary-green)'}; font-weight:800;">
                        ${ins.tiene_alergia === 'si' ? '⚠️ Sí' : '✓ No'}
                    </div>
                </div>
                ${ins.tiene_alergia === 'si' ? `
                <div class="hv-item hv-item-full">
                    <div class="hv-label">Descripción de la alergia</div>
                    <div class="hv-valor hv-alerta-box">${ins.descripcion_alergia || '—'}</div>
                </div>` : ''}
                ${ins.observaciones_salud ? `
                <div class="hv-item hv-item-full">
                    <div class="hv-label">Observaciones de salud</div>
                    <div class="hv-valor">${ins.observaciones_salud}</div>
                </div>` : ''}
            </div>
        </div>

        <div class="hv-seccion">
            <div class="hv-seccion-titulo"><i class="fas fa-tshirt"></i> Tallas</div>
            <div class="hv-grid hv-tallas">
                <div class="hv-talla-card">
                    <div class="hv-talla-icono"><i class="fas fa-tshirt"></i></div>
                    <div class="hv-talla-valor">${ins.talla_camisa || '—'}</div>
                    <div class="hv-talla-etiq">Camisa</div>
                </div>
                <div class="hv-talla-card">
                    <div class="hv-talla-icono">👖</div>
                    <div class="hv-talla-valor">${ins.talla_pantalon || '—'}</div>
                    <div class="hv-talla-etiq">Pantalón</div>
                </div>
                <div class="hv-talla-card">
                    <div class="hv-talla-icono">👟</div>
                    <div class="hv-talla-valor">${ins.talla_zapatos || '—'}</div>
                    <div class="hv-talla-etiq">Zapatos</div>
                </div>
            </div>
        </div>

        <div class="hv-seccion">
            <div class="hv-seccion-titulo"><i class="fas fa-users"></i> Acudiente</div>
            <div class="hv-grid">
                <div class="hv-item">
                    <div class="hv-label">Nombre</div>
                    <div class="hv-valor">${ins.nombre_acudiente || '—'}</div>
                </div>
                <div class="hv-item">
                    <div class="hv-label">Parentesco</div>
                    <div class="hv-valor">${ins.parentesco || '—'}</div>
                </div>
                <div class="hv-item">
                    <div class="hv-label">WhatsApp</div>
                    <div class="hv-valor">
                        ${ins.whatsapp
                            ? `<a href="https://wa.me/${ins.whatsapp.replace(/\D/g,'')}" target="_blank" class="link-whatsapp">
                                <i class="fab fa-whatsapp"></i> ${ins.whatsapp}</a>`
                            : '—'}
                    </div>
                </div>
            </div>
        </div>

        <div class="hv-seccion">
            <div class="hv-seccion-titulo"><i class="fas fa-file-image"></i> Documento de Identidad</div>
            ${ins.foto_documento_url
                ? `<div class="doc-preview-wrap">
                        <img src="${ins.foto_documento_url}" class="doc-preview-thumb" alt="Documento"
                             onclick="abrirVistaDocumento('${ins.foto_documento_url}')"
                             title="Clic para ver en grande">
                        <div class="doc-preview-acciones">
                            <button class="btn-doc-ver" onclick="abrirVistaDocumento('${ins.foto_documento_url}')">
                                <i class="fas fa-expand-alt"></i> Ver en grande
                            </button>
                            <a href="${ins.foto_documento_url}" download target="_blank" class="btn-doc-descargar">
                                <i class="fas fa-download"></i> Descargar
                            </a>
                        </div>
                   </div>`
                : `<div class="doc-sin-foto"><i class="fas fa-image"></i> Sin foto de documento adjunta</div>`}
        </div>
    `;

    document.getElementById('modalDetalle').style.display = 'flex';

    document.getElementById('btnEditarModal').onclick = () => {
        cerrarModal('modalDetalle');
        abrirEditar(id);
    };
    document.getElementById('btnEliminarModal').onclick = () => {
        cerrarModal('modalDetalle');
        confirmarEliminar(id);
    };
    document.getElementById('btnDescargarPDF').onclick = () => generarPDF(id);
}

// ══════════════════════════════════════════════
// 8. VISTA PREVIA DE DOCUMENTO
// ══════════════════════════════════════════════
function abrirVistaDocumento(url) {
    let overlay = document.getElementById('overlayDoc');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'overlayDoc';
        overlay.style.cssText = `
            position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;
            display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1rem;
            animation:fadeIn 0.2s ease;
        `;
        overlay.innerHTML = `
            <button id="btnCerrarDoc" style="
                position:absolute;top:1.5rem;right:1.5rem;
                background:rgba(255,255,255,0.15);border:none;color:white;
                font-size:1.5rem;width:48px;height:48px;border-radius:50%;
                cursor:pointer;display:flex;align-items:center;justify-content:center;">
                <i class="fas fa-times"></i>
            </button>
            <img id="imgDocGrande" src="" alt="Documento"
                style="max-width:90vw;max-height:80vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <a id="btnDlDoc" href="" download target="_blank" style="
                background:#2D984F;color:white;padding:0.7rem 1.5rem;
                border-radius:50px;font-weight:700;font-size:0.9rem;text-decoration:none;
                display:flex;align-items:center;gap:0.5rem;">
                <i class="fas fa-download"></i> Descargar documento
            </a>
        `;
        document.body.appendChild(overlay);
        document.getElementById('btnCerrarDoc').onclick = () => overlay.remove();
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    }
    document.getElementById('imgDocGrande').src = url;
    document.getElementById('btnDlDoc').href     = url;
    overlay.style.display = 'flex';
}

// ══════════════════════════════════════════════
// 9. GENERAR PDF
// ══════════════════════════════════════════════
function generarPDF(id) {
    const ins = inscripciones.find(i => i.id === id);
    if (!ins) return;

    const edad      = ins.fecha_nacimiento ? calcularEdad(ins.fecha_nacimiento) : '—';
    const fechaInsc = ins.created_at
        ? new Date(ins.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
        : '—';

    const ventana = window.open('', '_blank');
    ventana.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Hoja de Vida – ${ins.nombre_menor || 'Beneficiario'}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Playfair+Display:wght@700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Nunito',sans-serif; color:#1E1E1E; background:#fff; }
        .portada {
            background: linear-gradient(135deg, #4E1B95 0%, #2D0A6E 60%, #2D984F 100%);
            color:white; padding:2.5rem 3rem; display:flex; align-items:center; gap:2rem;
        }
        .portada-avatar {
            width:110px; height:110px; border-radius:16px; flex-shrink:0;
            background:rgba(255,255,255,0.2); display:flex; align-items:center;
            justify-content:center; font-size:2.5rem; font-weight:800; color:white;
            border:4px solid rgba(255,255,255,0.4);
        }
        .portada-avatar img { width:100%; height:100%; border-radius:12px; object-fit:cover; }
        .portada-info h1 { font-family:'Playfair Display',serif; font-size:1.8rem; margin-bottom:0.4rem; }
        .portada-chips { display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.7rem; }
        .chip { background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.3); border-radius:50px; padding:0.25rem 0.85rem; font-size:0.78rem; font-weight:700; }
        .chip-rojo  { background:rgba(229,62,62,0.3);  border-color:rgba(229,62,62,0.5); }
        .chip-verde { background:rgba(45,152,79,0.3);  border-color:rgba(45,152,79,0.5); }
        .fundacion-nombre { font-size:0.82rem; opacity:0.75; margin-bottom:0.3rem; }
        .contenido { padding:2rem 3rem; }
        .seccion { margin-bottom:1.8rem; }
        .seccion-titulo { font-family:'Playfair Display',serif; font-size:1rem; color:#4E1B95; border-bottom:2px solid #e2d9f3; padding-bottom:0.4rem; margin-bottom:1rem; }
        .grid { display:grid; grid-template-columns:1fr 1fr; gap:0.8rem; }
        .item { background:#fdfbff; border:1px solid #f0eaff; border-radius:8px; padding:0.6rem 0.9rem; }
        .item-full { grid-column:1/-1; }
        .label { font-size:0.68rem; font-weight:800; color:#6A6A6A; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.2rem; }
        .valor { font-size:0.88rem; font-weight:600; }
        .tallas { display:flex; gap:1rem; }
        .talla-card { flex:1; text-align:center; background:#fdfbff; border:1px solid #f0eaff; border-radius:10px; padding:0.8rem 0.5rem; }
        .talla-num  { font-size:1.6rem; font-weight:800; color:#4E1B95; }
        .talla-etiq { font-size:0.72rem; color:#6A6A6A; font-weight:700; margin-top:0.2rem; }
        .alerta-box { background:#fff5f5; border:1.5px solid #fed7d7; border-radius:8px; padding:0.7rem 1rem; color:#c53030; font-weight:700; font-size:0.88rem; }
        .doc-foto   { max-width:260px; border-radius:10px; border:2px solid #e2d9f3; margin-top:0.5rem; }
        .pie        { text-align:center; font-size:0.72rem; color:#aaa; margin-top:2rem; border-top:1px solid #f0eaff; padding-top:1rem; }
        @media print {
            body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        }
    </style>
</head>
<body>
<div class="portada">
    <div class="portada-avatar">
        ${ins.foto_menor_url
            ? `<img src="${ins.foto_menor_url}" alt="${ins.nombre_menor}">`
            : (ins.nombre_menor || '??').split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
    </div>
    <div class="portada-info">
        <div class="fundacion-nombre">Fundación Panorama de Colores · Inscripciones 2026</div>
        <h1>${ins.nombre_menor || '—'}</h1>
        <div style="font-size:0.9rem;opacity:0.85;">${ins.tipo_documento || ''} · ${ins.numero_documento || '—'} · ${edad}</div>
        <div class="portada-chips">
            ${ins.tiene_alergia === 'si'
                ? `<span class="chip chip-rojo">⚠️ Tiene alergia</span>`
                : `<span class="chip chip-verde">✓ Sin alergia</span>`}
            <span class="chip">📅 Inscrito: ${fechaInsc}</span>
            ${ins.eps ? `<span class="chip">🏥 ${ins.eps}</span>` : ''}
        </div>
    </div>
</div>
<div class="contenido">
    <div class="seccion">
        <div class="seccion-titulo">👤 Datos Personales</div>
        <div class="grid">
            <div class="item"><div class="label">Fecha de nacimiento</div><div class="valor">${ins.fecha_nacimiento || '—'}</div></div>
            <div class="item"><div class="label">Edad</div><div class="valor">${edad}</div></div>
            <div class="item"><div class="label">Tipo de documento</div><div class="valor">${ins.tipo_documento || '—'}</div></div>
            <div class="item"><div class="label">Número de documento</div><div class="valor">${ins.numero_documento || '—'}</div></div>
            <div class="item item-full"><div class="label">Dirección</div><div class="valor">${ins.direccion || '—'}</div></div>
        </div>
    </div>
    <div class="seccion">
        <div class="seccion-titulo">❤️ Salud</div>
        <div class="grid">
            <div class="item"><div class="label">EPS</div><div class="valor">${ins.eps || '—'}</div></div>
            <div class="item"><div class="label">¿Tiene alergia?</div>
                <div class="valor" style="color:${ins.tiene_alergia === 'si' ? '#e53e3e' : '#2D984F'};font-weight:800;">
                    ${ins.tiene_alergia === 'si' ? '⚠️ Sí' : '✓ No'}
                </div>
            </div>
            ${ins.tiene_alergia === 'si' ? `
            <div class="item item-full"><div class="label">Descripción de la alergia</div><div class="alerta-box">${ins.descripcion_alergia || '—'}</div></div>` : ''}
            ${ins.observaciones_salud ? `
            <div class="item item-full"><div class="label">Observaciones de salud</div><div class="valor">${ins.observaciones_salud}</div></div>` : ''}
        </div>
    </div>
    <div class="seccion">
        <div class="seccion-titulo">👕 Tallas</div>
        <div class="tallas">
            <div class="talla-card"><div class="talla-num">${ins.talla_camisa || '—'}</div><div class="talla-etiq">CAMISA</div></div>
            <div class="talla-card"><div class="talla-num">${ins.talla_pantalon || '—'}</div><div class="talla-etiq">PANTALÓN</div></div>
            <div class="talla-card"><div class="talla-num">${ins.talla_zapatos || '—'}</div><div class="talla-etiq">ZAPATOS</div></div>
        </div>
    </div>
    <div class="seccion">
        <div class="seccion-titulo">👨‍👩‍👦 Acudiente</div>
        <div class="grid">
            <div class="item"><div class="label">Nombre</div><div class="valor">${ins.nombre_acudiente || '—'}</div></div>
            <div class="item"><div class="label">Parentesco</div><div class="valor">${ins.parentesco || '—'}</div></div>
            <div class="item"><div class="label">WhatsApp</div><div class="valor">${ins.whatsapp || '—'}</div></div>
        </div>
    </div>
    ${ins.foto_documento_url ? `
    <div class="seccion">
        <div class="seccion-titulo">🪪 Documento de Identidad</div>
        <img src="${ins.foto_documento_url}" class="doc-foto" alt="Documento de identidad">
    </div>` : ''}
    <div class="pie">
        Generado por el Panel Administrativo de la Fundación Panorama de Colores · ${new Date().toLocaleDateString('es-CO')}
    </div>
</div>
<script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`);
    ventana.document.close();
}

// ══════════════════════════════════════════════
// 10. EDITAR
// ══════════════════════════════════════════════
function abrirEditar(id) {
    const ins = inscripciones.find(i => i.id === id);
    if (!ins) return;
    inscripcionActual = ins;

    document.getElementById('editId').value            = ins.id;
    document.getElementById('editNombre').value        = ins.nombre_menor        || '';
    document.getElementById('editFechaNac').value      = ins.fecha_nacimiento     || '';
    document.getElementById('editTipoDoc').value       = ins.tipo_documento       || '';
    document.getElementById('editNumDoc').value        = ins.numero_documento     || '';
    document.getElementById('editEps').value           = ins.eps                  || '';
    document.getElementById('editTallaCamisa').value   = ins.talla_camisa         || '';
    document.getElementById('editTallaPantalon').value = ins.talla_pantalon       || '';
    document.getElementById('editTallaZapatos').value  = ins.talla_zapatos        || '';
    document.getElementById('editTieneAlergia').value  = ins.tiene_alergia        || 'no';
    document.getElementById('editDescAlergia').value   = ins.descripcion_alergia  || '';
    document.getElementById('editObsSalud').value      = ins.observaciones_salud  || '';
    document.getElementById('editAcudiente').value     = ins.nombre_acudiente     || '';
    document.getElementById('editParentesco').value    = ins.parentesco           || '';
    document.getElementById('editWhatsapp').value      = ins.whatsapp             || '';
    document.getElementById('editDireccion').value     = ins.direccion            || '';

    document.getElementById('modalEditar').style.display = 'flex';
}

document.getElementById('formEditar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;

    const datosActualizados = {
        nombre_menor:        document.getElementById('editNombre').value.trim(),
        fecha_nacimiento:    document.getElementById('editFechaNac').value,
        tipo_documento:      document.getElementById('editTipoDoc').value,
        numero_documento:    document.getElementById('editNumDoc').value.trim(),
        eps:                 document.getElementById('editEps').value.trim(),
        talla_camisa:        document.getElementById('editTallaCamisa').value.trim(),
        talla_pantalon:      document.getElementById('editTallaPantalon').value.trim(),
        talla_zapatos:       document.getElementById('editTallaZapatos').value.trim(),
        tiene_alergia:       document.getElementById('editTieneAlergia').value,
        descripcion_alergia: document.getElementById('editDescAlergia').value.trim(),
        observaciones_salud: document.getElementById('editObsSalud').value.trim(),
        nombre_acudiente:    document.getElementById('editAcudiente').value.trim(),
        parentesco:          document.getElementById('editParentesco').value.trim(),
        whatsapp:            document.getElementById('editWhatsapp').value.trim(),
        direccion:           document.getElementById('editDireccion').value.trim()
    };

    if (id === 'test-001') {
        const idx = inscripciones.findIndex(i => i.id === 'test-001');
        if (idx !== -1) inscripciones[idx] = { ...inscripciones[idx], ...datosActualizados };
        cerrarModal('modalEditar');
        inscripcionesFiltradas = [...inscripciones];
        renderTabla();
        actualizarContadores(inscripciones);
        mostrarToast('✅ Inscripción de prueba actualizada');
        return;
    }

    const { error } = await db.from('inscripciones').update(datosActualizados).eq('id', id);
    if (error) { alert('Error al actualizar: ' + error.message); return; }

    cerrarModal('modalEditar');
    cargarInscripciones();
    mostrarToast('✅ Inscripción actualizada correctamente');
});

// ══════════════════════════════════════════════
// 11. ELIMINAR
// ══════════════════════════════════════════════
function confirmarEliminar(id) {
    idParaEliminar = id;
    document.getElementById('modalConfirmar').style.display = 'flex';
}

document.getElementById('btnConfirmarEliminar').addEventListener('click', async () => {
    if (!idParaEliminar) return;

    if (idParaEliminar === 'test-001') {
        inscripciones          = inscripciones.filter(i => i.id !== 'test-001');
        inscripcionesFiltradas = [...inscripciones];
        cerrarModal('modalConfirmar');
        idParaEliminar = null;
        renderTabla();
        actualizarContadores(inscripciones);
        mostrarToast('🗑️ Inscripción de prueba eliminada');
        return;
    }

    const { error } = await db.from('inscripciones').delete().eq('id', idParaEliminar);
    if (error) { alert('Error al eliminar: ' + error.message); return; }

    cerrarModal('modalConfirmar');
    idParaEliminar = null;
    cargarInscripciones();
    mostrarToast('🗑️ Inscripción eliminada');
});

// ══════════════════════════════════════════════
// 12. NAVEGACIÓN SIDEBAR
// ══════════════════════════════════════════════
document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Cerrar sidebar en móvil al navegar
        document.querySelector('.sidebar')?.classList.remove('open');
        document.getElementById('sidebarBackdrop')?.classList.remove('active');

        if (section === 'inscripciones') {
            document.getElementById('secInscripciones').style.display = 'block';
            document.getElementById('secEstadisticas').style.display  = 'none';
            document.getElementById('sectionTitle').textContent       = 'Inscripciones 2026';
            document.getElementById('sectionSubtitle').textContent    = 'Gestión de beneficiarios registrados';
        } else if (section === 'estadisticas') {
            document.getElementById('secInscripciones').style.display = 'none';
            document.getElementById('secEstadisticas').style.display  = 'block';
            document.getElementById('sectionTitle').textContent       = 'Estadísticas';
            document.getElementById('sectionSubtitle').textContent    = 'Resumen de inscripciones';
        }
    });
});

// ══════════════════════════════════════════════
// 13. CERRAR MODALES
// ══════════════════════════════════════════════
function cerrarModal(id) {
    document.getElementById(id).style.display = 'none';
}

document.getElementById('btnCerrarModal').addEventListener('click',     () => cerrarModal('modalDetalle'));
document.getElementById('btnCerrarEditar').addEventListener('click',    () => cerrarModal('modalEditar'));
document.getElementById('btnCancelarEditar').addEventListener('click',  () => cerrarModal('modalEditar'));
document.getElementById('btnCancelarEliminar').addEventListener('click',() => cerrarModal('modalConfirmar'));

['modalDetalle', 'modalEditar', 'modalConfirmar'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
        if (e.target.id === id) cerrarModal(id);
    });
});

// ══════════════════════════════════════════════
// 14. TOAST
// ══════════════════════════════════════════════
function mostrarToast(mensaje) {
    // Eliminar toast anterior si existe
    document.querySelector('.toast-msg')?.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.style.cssText = `
        position:fixed; bottom:2rem; right:2rem;
        background:#4E1B95; color:white;
        padding:0.85rem 1.5rem; border-radius:50px;
        font-family:'Nunito',sans-serif; font-weight:700; font-size:0.9rem;
        box-shadow:0 8px 24px rgba(78,27,149,0.35);
        z-index:9999; animation:slideUp 0.3s ease;
        display:flex; align-items:center; gap:0.5rem;
    `;
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ══════════════════════════════════════════════
// 15. TOGGLE SIDEBAR MÓVIL
// ══════════════════════════════════════════════
const sidebarToggle  = document.getElementById('sidebarToggle');
const sidebarEl      = document.querySelector('.sidebar');
const backdropEl     = document.getElementById('sidebarBackdrop');

sidebarToggle?.addEventListener('click', () => {
    sidebarEl.classList.toggle('open');
    backdropEl.classList.toggle('active');
});

backdropEl?.addEventListener('click', () => {
    sidebarEl.classList.remove('open');
    backdropEl.classList.remove('active');
});

// ══════════════════════════════════════════════
// 16. UTILIDADES
// ══════════════════════════════════════════════
function calcularEdad(fechaNac) {
    const hoy  = new Date();
    const nac  = new Date(fechaNac);
    let edad   = hoy.getFullYear() - nac.getFullYear();
    const m    = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return `${edad} años`;
}

// ══ ARRANCAR ══
iniciar();