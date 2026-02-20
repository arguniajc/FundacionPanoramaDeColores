// ── admin.js ── Panel Administrativo Fundación Panorama de Colores

const SUPABASE_URL = 'https://hfitfoevyqbhkqjeaegs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmaXRmb2V2eXFiaGtxamVhZWdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MzQwNjgsImV4cCI6MjA4NzExMDA2OH0.rcTZdY7Av2YVU4FMvbbjqOPv76FC5xW9Cs14Gj2Dzmg';

// Emails autorizados para acceder al panel
const EMAILS_AUTORIZADOS = [
    'panoramadecolores@gmail.com',
    'diegonandosalazar@gmail.com'
];

// Inicializar Supabase
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables globales
let inscripciones = [];
let inscripcionActual = null;

// ══ 1. AUTENTICACIÓN ══
async function iniciar() {
    // Escuchar cambios de sesión
    db.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            const email = session.user.email;
            // Verificar que el email esté autorizado
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
    document.getElementById('adminPanel').style.display = 'none';
}

function mostrarPanel(user) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'grid';

    // Mostrar datos del usuario en sidebar
    document.getElementById('userName').textContent = user.user_metadata?.full_name || 'Admin';
    document.getElementById('userEmail').textContent = user.email;
    const avatar = user.user_metadata?.avatar_url;
    if (avatar) {
        document.getElementById('userAvatar').src = avatar;
    } else {
        document.getElementById('userAvatar').src = '../images/logo.png';
    }
}

// Login con Google
document.getElementById('btnGoogle').addEventListener('click', async () => {
    const { error } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.href
        }
    });
    if (error) {
        alert('Error al iniciar sesión: ' + error.message);
    }
});

// Cerrar sesión
document.getElementById('btnLogout').addEventListener('click', async () => {
    await db.auth.signOut();
});

// ══ 2. CARGAR INSCRIPCIONES ══
async function cargarInscripciones() {
    const tbody = document.getElementById('tablaBody');
    tbody.innerHTML = `<tr><td colspan="8" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Cargando inscripciones...</td></tr>`;

    const { data, error } = await db
        .from('inscripciones')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-row">❌ Error al cargar datos: ${error.message}</td></tr>`;
        return;
    }

    inscripciones = data || [];
    renderTabla(inscripciones);
    actualizarContadores(inscripciones);
}

// ══ 3. RENDERIZAR TABLA ══
function renderTabla(datos) {
    const tbody = document.getElementById('tablaBody');

    if (!datos.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-row"><i class="fas fa-inbox"></i><br>No hay inscripciones registradas</td></tr>`;
        return;
    }

    tbody.innerHTML = datos.map(ins => {
        const iniciales = ins.nombre_menor
            ? ins.nombre_menor.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
            : '??';

        const fotoPerfil = ins.foto_menor_url
            ? `<img src="${ins.foto_menor_url}" class="foto-perfil" alt="${ins.nombre_menor}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : '';

        const placeholder = `<div class="foto-placeholder" ${ins.foto_menor_url ? 'style="display:none"' : ''}>${iniciales}</div>`;

        const alergiaBadge = ins.tiene_alergia === 'si'
            ? `<span class="badge-alergia"><i class="fas fa-exclamation-circle"></i> Sí</span>`
            : `<span class="badge-ok">✓ No</span>`;

        const edad = ins.fecha_nacimiento ? calcularEdad(ins.fecha_nacimiento) : '—';

        return `
            <tr onclick="verDetalle('${ins.id}')">
                <td>
                    ${fotoPerfil}
                    ${placeholder}
                </td>
                <td><strong>${ins.nombre_menor || '—'}</strong></td>
                <td>${ins.tipo_documento || ''} ${ins.numero_documento || '—'}</td>
                <td>${edad}</td>
                <td>${ins.nombre_acudiente || '—'}</td>
                <td>
                    ${ins.whatsapp
                        ? `<a href="https://wa.me/${ins.whatsapp.replace(/\D/g,'')}" target="_blank" onclick="event.stopPropagation()" style="color:var(--primary-green);font-weight:700;">${ins.whatsapp}</a>`
                        : '—'
                    }
                </td>
                <td>${alergiaBadge}</td>
                <td>
                    <div class="acciones" onclick="event.stopPropagation()">
                        <button class="btn-ver" onclick="verDetalle('${ins.id}')"><i class="fas fa-eye"></i></button>
                        <button class="btn-editar-sm" onclick="abrirEditar('${ins.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-eliminar-sm" onclick="confirmarEliminar('${ins.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ══ 4. CONTADORES ══
function actualizarContadores(datos) {
    const total     = datos.length;
    const alergias  = datos.filter(i => i.tiene_alergia === 'si').length;
    const conDoc    = datos.filter(i => i.numero_documento && i.numero_documento !== 'Sin documento').length;
    const venezolanos = datos.filter(i => ['PPT','Pasaporte','RAMV'].includes(i.tipo_documento)).length;

    document.getElementById('totalInscritos').textContent  = total;
    document.getElementById('totalAlergias').textContent   = alergias;
    document.getElementById('statTotal').textContent       = total;
    document.getElementById('statAlergiasCard').textContent = alergias;
    document.getElementById('statConDoc').textContent      = conDoc;
    document.getElementById('statVenezolanos').textContent = venezolanos;
}

// ══ 5. BÚSQUEDA Y FILTRO ══
document.getElementById('searchInput').addEventListener('input', filtrar);
document.getElementById('filterCombo').addEventListener('change', filtrar);

function filtrar() {
    const texto  = document.getElementById('searchInput').value.toLowerCase().trim();
    const filtro = document.getElementById('filterCombo').value;

    let resultado = inscripciones;

    if (filtro === 'alergia') {
        resultado = resultado.filter(i => i.tiene_alergia === 'si');
    }

    if (texto) {
        resultado = resultado.filter(i => {
            if (filtro === 'documento') {
                return (i.numero_documento || '').toLowerCase().includes(texto) ||
                       (i.tipo_documento  || '').toLowerCase().includes(texto);
            }
            // Por defecto busca en nombre y documento
            return (i.nombre_menor      || '').toLowerCase().includes(texto) ||
                   (i.numero_documento  || '').toLowerCase().includes(texto) ||
                   (i.nombre_acudiente  || '').toLowerCase().includes(texto);
        });
    }

    renderTabla(resultado);
}

// ══ 6. VER DETALLE ══
function verDetalle(id) {
    inscripcionActual = inscripciones.find(i => i.id === id);
    if (!inscripcionActual) return;

    const ins = inscripcionActual;
    const iniciales = (ins.nombre_menor || '??').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const edad = ins.fecha_nacimiento ? calcularEdad(ins.fecha_nacimiento) : '—';

    document.getElementById('modalTitulo').textContent = ins.nombre_menor || 'Detalle';

    document.getElementById('modalBody').innerHTML = `
        <div class="detalle-perfil">
            ${ins.foto_menor_url
                ? `<img src="${ins.foto_menor_url}" class="detalle-foto" alt="${ins.nombre_menor}">`
                : `<div class="detalle-foto-placeholder">${iniciales}</div>`
            }
            <div>
                <div class="detalle-nombre">${ins.nombre_menor || '—'}</div>
                <div class="detalle-doc">${ins.tipo_documento || ''} · ${ins.numero_documento || '—'}</div>
                <div style="font-size:0.82rem;color:var(--neutral-gray);">
                    Inscrito: ${ins.created_at ? new Date(ins.created_at).toLocaleDateString('es-CO') : '—'}
                </div>
            </div>
        </div>

        <div class="detalle-grid">
            <div class="detalle-item">
                <div class="detalle-label">Fecha de nacimiento</div>
                <div class="detalle-valor">${ins.fecha_nacimiento || '—'} (${edad})</div>
            </div>
            <div class="detalle-item">
                <div class="detalle-label">EPS</div>
                <div class="detalle-valor">${ins.eps || '—'}</div>
            </div>
            <div class="detalle-item">
                <div class="detalle-label">Talla camisa</div>
                <div class="detalle-valor">${ins.talla_camisa || '—'}</div>
            </div>
            <div class="detalle-item">
                <div class="detalle-label">Talla pantalón</div>
                <div class="detalle-valor">${ins.talla_pantalon || '—'}</div>
            </div>
            <div class="detalle-item">
                <div class="detalle-label">Talla zapatos</div>
                <div class="detalle-valor">${ins.talla_zapatos || '—'}</div>
            </div>
            <div class="detalle-item">
                <div class="detalle-label">¿Tiene alergia?</div>
                <div class="detalle-valor" style="color:${ins.tiene_alergia === 'si' ? '#e53e3e' : 'var(--primary-green)'}">
                    ${ins.tiene_alergia === 'si' ? '⚠️ Sí' : '✓ No'}
                </div>
            </div>
            ${ins.tiene_alergia === 'si' ? `
            <div class="detalle-item detalle-item-full">
                <div class="detalle-label">Descripción de la alergia</div>
                <div class="detalle-valor">${ins.descripcion_alergia || '—'}</div>
            </div>` : ''}
            ${ins.observaciones_salud ? `
            <div class="detalle-item detalle-item-full">
                <div class="detalle-label">Observaciones de salud</div>
                <div class="detalle-valor">${ins.observaciones_salud}</div>
            </div>` : ''}
            <div class="detalle-item">
                <div class="detalle-label">Acudiente</div>
                <div class="detalle-valor">${ins.nombre_acudiente || '—'}</div>
            </div>
            <div class="detalle-item">
                <div class="detalle-label">Parentesco</div>
                <div class="detalle-valor">${ins.parentesco || '—'}</div>
            </div>
            <div class="detalle-item">
                <div class="detalle-label">WhatsApp</div>
                <div class="detalle-valor">
                    ${ins.whatsapp
                        ? `<a href="https://wa.me/${ins.whatsapp.replace(/\D/g,'')}" target="_blank" style="color:var(--primary-green);font-weight:700;">${ins.whatsapp}</a>`
                        : '—'
                    }
                </div>
            </div>
            <div class="detalle-item detalle-item-full">
                <div class="detalle-label">Dirección</div>
                <div class="detalle-valor">${ins.direccion || '—'}</div>
            </div>
        </div>

        ${ins.foto_documento_url ? `
        <a href="${ins.foto_documento_url}" download target="_blank" class="btn-descargar-doc">
            <i class="fas fa-download"></i> Descargar foto del documento
        </a>` : '<p style="color:var(--neutral-gray);font-size:0.85rem;margin-top:1rem;"><i class="fas fa-image"></i> Sin foto de documento adjunta</p>'}
    `;

    document.getElementById('modalDetalle').style.display = 'flex';

    // Botones del footer del modal
    document.getElementById('btnEditarModal').onclick = () => {
        cerrarModal('modalDetalle');
        abrirEditar(id);
    };
    document.getElementById('btnEliminarModal').onclick = () => {
        cerrarModal('modalDetalle');
        confirmarEliminar(id);
    };
}

// ══ 7. EDITAR ══
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

    const { error } = await db
        .from('inscripciones')
        .update(datosActualizados)
        .eq('id', id);

    if (error) {
        alert('Error al actualizar: ' + error.message);
        return;
    }

    cerrarModal('modalEditar');
    cargarInscripciones();
    mostrarToast('✅ Inscripción actualizada correctamente');
});

// ══ 8. ELIMINAR ══
let idParaEliminar = null;

function confirmarEliminar(id) {
    idParaEliminar = id;
    document.getElementById('modalConfirmar').style.display = 'flex';
}

document.getElementById('btnConfirmarEliminar').addEventListener('click', async () => {
    if (!idParaEliminar) return;

    const { error } = await db
        .from('inscripciones')
        .delete()
        .eq('id', idParaEliminar);

    if (error) {
        alert('Error al eliminar: ' + error.message);
        return;
    }

    cerrarModal('modalConfirmar');
    idParaEliminar = null;
    cargarInscripciones();
    mostrarToast('🗑️ Inscripción eliminada');
});

// ══ 9. NAVEGACIÓN SIDEBAR ══
document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;

        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        if (section === 'inscripciones') {
            document.getElementById('secInscripciones').style.display = 'block';
            document.getElementById('secEstadisticas').style.display  = 'none';
            document.getElementById('sectionTitle').textContent    = 'Inscripciones 2026';
            document.getElementById('sectionSubtitle').textContent = 'Gestión de beneficiarios registrados';
        } else if (section === 'estadisticas') {
            document.getElementById('secInscripciones').style.display = 'none';
            document.getElementById('secEstadisticas').style.display  = 'block';
            document.getElementById('sectionTitle').textContent    = 'Estadísticas';
            document.getElementById('sectionSubtitle').textContent = 'Resumen de inscripciones';
        }
    });
});

// ══ 10. CERRAR MODALES ══
function cerrarModal(id) {
    document.getElementById(id).style.display = 'none';
}

document.getElementById('btnCerrarModal').addEventListener('click',   () => cerrarModal('modalDetalle'));
document.getElementById('btnCerrarEditar').addEventListener('click',  () => cerrarModal('modalEditar'));
document.getElementById('btnCancelarEditar').addEventListener('click',() => cerrarModal('modalEditar'));
document.getElementById('btnCancelarEliminar').addEventListener('click',()=> cerrarModal('modalConfirmar'));

// Cerrar al hacer clic fuera
['modalDetalle','modalEditar','modalConfirmar'].forEach(id => {
    document.getElementById(id).addEventListener('click', (e) => {
        if (e.target.id === id) cerrarModal(id);
    });
});

// ══ 11. TOAST NOTIFICACIÓN ══
function mostrarToast(mensaje) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 2rem; right: 2rem;
        background: var(--primary-purple); color: white;
        padding: 0.85rem 1.5rem; border-radius: 50px;
        font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 0.9rem;
        box-shadow: 0 8px 24px rgba(78,27,149,0.35);
        z-index: 9999; animation: slideUp 0.3s ease;
    `;
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ══ 12. UTILIDADES ══
function calcularEdad(fechaNac) {
    const hoy    = new Date();
    const nac    = new Date(fechaNac);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return `${edad} años`;
}

// ══ INICIAR ══
iniciar();