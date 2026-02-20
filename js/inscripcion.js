// ── inscripcion.js ── Fundación Panorama de Colores
// Versión corregida: validación BD en tiempo real + fotos robustas

const SUPABASE_URL = 'https://hfitfoevyqbhkqjeaegs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmaXRmb2V2eXFiaGtxamVhZWdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MzQwNjgsImV4cCI6MjA4NzExMDA2OH0.rcTZdY7Av2YVU4FMvbbjqOPv76FC5xW9Cs14Gj2Dzmg';

document.addEventListener('DOMContentLoaded', function () {

    // ══════════════════════════════════════════════════════
    // ESTADO GLOBAL
    // ══════════════════════════════════════════════════════
    let capturedBlobs  = { menor: null, doc: null };

    // ══════════════════════════════════════════════════════
    // 1. MOSTRAR/OCULTAR CAMPO DE ALERGIA
    // ══════════════════════════════════════════════════════
    const radiosAlergia = document.querySelectorAll('input[name="tiene_alergia"]');
    const campoAlergia  = document.getElementById('campo_alergia');
    const descAlergia   = document.getElementById('descripcion_alergia');

    radiosAlergia.forEach(radio => {
        radio.addEventListener('change', function () {
            if (this.value === 'si') {
                campoAlergia.classList.add('visible');
                descAlergia.setAttribute('required', 'required');
            } else {
                campoAlergia.classList.remove('visible');
                descAlergia.removeAttribute('required');
                descAlergia.value = '';
            }
        });
    });

    // ══════════════════════════════════════════════════════
    // 2. VARIABLES DE DOCUMENTO
    //    La validación ocurre SOLO al enviar el formulario
    // ══════════════════════════════════════════════════════
    const inputDoc    = document.getElementById('numero_documento');
    const selectTipo  = document.getElementById('tipo_documento');
    const docFeedback = document.getElementById('doc-feedback');

    function esSinDocumento(valor) {
        if (!valor || valor.trim() === '') return true;
        return valor.trim().toLowerCase() === 'sin documento';
    }

    // ══════════════════════════════════════════════════════
    // 3. PREVIEW DE IMÁGENES (galería)
    // ══════════════════════════════════════════════════════
    function setupPreview(inputId, previewId, uploadAreaId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        input.addEventListener('change', function () {
            const file = this.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                alert('La imagen es muy grande. Máximo 5MB.');
                this.value = '';
                return;
            }
            if (!file.type.startsWith('image/')) {
                alert('El archivo debe ser una imagen (JPG, PNG).');
                this.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = e => mostrarPreview(previewId, uploadAreaId, e.target.result);
            reader.readAsDataURL(file);
        });
    }

    function mostrarPreview(previewId, uploadAreaId, dataUrl) {
        const preview    = document.getElementById(previewId);
        const uploadArea = document.getElementById(uploadAreaId);
        if (preview)    preview.innerHTML = `<img src="${dataUrl}" alt="Vista previa">`;
        if (uploadArea) {
            uploadArea.classList.add('uploaded');
            const icon = uploadArea.querySelector('.upload-icon');
            const text = uploadArea.querySelector('.upload-text');
            if (icon) icon.style.color = '#2D984F';
            if (text) text.textContent  = '✓ Imagen cargada';
        }
    }

    setupPreview('foto_menor',     'preview-menor', 'upload-menor');
    setupPreview('foto_documento', 'preview-doc',   'upload-doc');

    // ══════════════════════════════════════════════════════
    // 4. CÁMARA INTEGRADA
    // ══════════════════════════════════════════════════════
    let streamActivo  = null;
    let targetCamara  = null;
    let usandoFrontal = true;

    const cameraOverlay = document.getElementById('cameraOverlay');
    const cameraVideo   = document.getElementById('cameraVideo');
    const cameraCanvas  = document.getElementById('cameraCanvas');

    async function abrirCamara(target) {
        targetCamara  = target;
        usandoFrontal = true;
        const label   = document.getElementById('cameraLabel');
        if (label) label.textContent = target === 'menor' ? '📷 Foto del menor' : '📄 Foto del documento';

        try {
            await iniciarStream(true);
            cameraOverlay.classList.add('show');
        } catch (err) {
            console.error('Cámara:', err);
            alert('No se pudo acceder a la cámara. Usa la opción Galería.');
        }
    }

    async function iniciarStream(frontal) {
        if (streamActivo) streamActivo.getTracks().forEach(t => t.stop());
        streamActivo = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: frontal ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });
        cameraVideo.srcObject = streamActivo;
        await cameraVideo.play();
    }

    document.getElementById('btnCapturar')?.addEventListener('click', () => {
        if (!streamActivo || !cameraVideo.videoWidth) return;
        const ctx = cameraCanvas.getContext('2d');
        cameraCanvas.width  = cameraVideo.videoWidth;
        cameraCanvas.height = cameraVideo.videoHeight;
        ctx.drawImage(cameraVideo, 0, 0);
        cameraCanvas.toBlob(blob => {
            if (!blob) return;
            capturedBlobs[targetCamara] = blob;
            const pId = targetCamara === 'menor' ? 'preview-menor' : 'preview-doc';
            const uId = targetCamara === 'menor' ? 'upload-menor'  : 'upload-doc';
            mostrarPreview(pId, uId, URL.createObjectURL(blob));
            cerrarCamara();
            mostrarFlash('📸 ¡Foto tomada!');
        }, 'image/jpeg', 0.92);
    });

    document.getElementById('btnFlip')?.addEventListener('click', async () => {
        usandoFrontal = !usandoFrontal;
        try { await iniciarStream(!usandoFrontal); }
        catch { alert('No se pudo cambiar de cámara.'); }
    });

    document.getElementById('btnCerrarCam')?.addEventListener('click', cerrarCamara);
    cameraOverlay?.addEventListener('click', e => { if (e.target === cameraOverlay) cerrarCamara(); });

    function cerrarCamara() {
        if (streamActivo) { streamActivo.getTracks().forEach(t => t.stop()); streamActivo = null; }
        cameraOverlay?.classList.remove('show');
    }

    document.getElementById('btnCamaraMenor')?.addEventListener('click', () => abrirCamara('menor'));
    document.getElementById('btnCamaraDoc')?.addEventListener('click',   () => abrirCamara('doc'));

    // ══════════════════════════════════════════════════════
    // 5. CHECKBOXES DE DECLARACIONES
    // ══════════════════════════════════════════════════════
    const declaraciones = [
        { check: 'auth_participacion',   bloque: 'decl1' },
        { check: 'auth_responsabilidad', bloque: 'decl2' },
        { check: 'auth_datos',           bloque: 'decl3' },
    ];

    declaraciones.forEach(({ check, bloque }) => {
        const el     = document.getElementById(check);
        const bloqEl = document.getElementById(bloque);
        if (!el) return;
        el.addEventListener('change', function () {
            bloqEl.classList.toggle('error', !this.checked);
            bloqEl.classList.toggle('ok',    this.checked);
        });
    });

    // ══════════════════════════════════════════════════════
    // 6. SUBIR FOTO A SUPABASE STORAGE
    //    Prioridad: Blob de cámara > File de galería
    //    Retorna URL pública o '' si no hay foto o falla
    // ══════════════════════════════════════════════════════
    function limpiarNombre(txt) {
        return (txt || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .substring(0, 20);
    }

    async function subirFoto(inputId, carpeta, tipoDoc, numDoc, nombreMenor, blobOverride) {
        let file = blobOverride || null;

        if (!file) {
            const input = document.getElementById(inputId);
            if (input && input.files && input.files.length > 0) {
                file = input.files[0];
            }
        }

        if (!file) {
            console.warn(`subirFoto: sin archivo para "${inputId}"`);
            return '';
        }

        // Extensión
        let ext = 'jpg';
        if (file.type === 'image/png') ext = 'png';
        else if (file.type === 'image/webp') ext = 'webp';

        // Nombre único para evitar colisiones
        const ts     = Date.now();
        const nombre = `${limpiarNombre(tipoDoc)}_${limpiarNombre(numDoc)}_${limpiarNombre(nombreMenor)}_${ts}.${ext}`;
        const ruta   = `${carpeta}/${nombre}`;

        console.info(`⬆ Subiendo [${carpeta}]: ${nombre} (${(file.size/1024).toFixed(1)} KB)`);

        const headers = {
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type':  file.type || 'image/jpeg',
            'x-upsert':      'true'
        };

        // Intentar POST primero
        let res = await fetch(
            `${SUPABASE_URL}/storage/v1/object/fotos-inscripciones/${ruta}`,
            { method: 'POST', headers, body: file }
        );

        // Fallback a PUT si POST falla
        if (!res.ok) {
            console.warn(`POST falló (${res.status}), intentando PUT...`);
            res = await fetch(
                `${SUPABASE_URL}/storage/v1/object/fotos-inscripciones/${ruta}`,
                { method: 'PUT', headers, body: file }
            );
        }

        if (!res.ok) {
            const err = await res.text();
            console.error(`Error al subir ${carpeta}:`, err);
            return '';
        }

        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/fotos-inscripciones/${ruta}`;
        console.info(`✅ Subida OK: ${publicUrl}`);
        return publicUrl;
    }

    // ══════════════════════════════════════════════════════
    // 7. ENVÍO DEL FORMULARIO
    // ══════════════════════════════════════════════════════
    const form    = document.getElementById('inscripcionForm');
    const overlay = document.getElementById('successOverlay');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // ── A. Campos HTML requeridos ──
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // ── B. Checkboxes de declaraciones ──
        let checkOk = true, primerError = null;
        declaraciones.forEach(({ check, bloque }) => {
            const el     = document.getElementById(check);
            const bloqEl = document.getElementById(bloque);
            if (!el.checked) {
                checkOk = false;
                bloqEl.classList.add('error');
                if (!primerError) primerError = bloqEl;
            }
        });
        if (!checkOk) {
            primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        const num  = inputDoc.value.trim();
        const tipo = selectTipo.value;

        // ── C. Verificación OBLIGATORIA en BD al registrar ──
        // Sin importar el estado del tiempo real, siempre consulta la BD
        // antes de guardar. Esta es la barrera definitiva contra duplicados.
        if (!esSinDocumento(num)) {
            btnSubmit.disabled  = true;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Verificando documento...</span>';

            try {
                const url = `${SUPABASE_URL}/rest/v1/inscripciones`
                    + `?numero_documento=eq.${encodeURIComponent(num)}`
                    + `&select=id&limit=1`;

                const chkRes  = await fetch(url, {
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                });

                if (!chkRes.ok) throw new Error(`HTTP ${chkRes.status}`);

                const chkData = await chkRes.json();

                if (Array.isArray(chkData) && chkData.length > 0) {
                    // ❌ DUPLICADO — detener y mostrar error
                    docFeedback.textContent = '❌ Este número de documento ya está inscrito. No se puede registrar de nuevo.';
                    docFeedback.className   = 'doc-feedback error';
                    inputDoc.classList.add('input-error');
                    inputDoc.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    btnSubmit.disabled  = false;
                    btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> <span>Enviar Inscripción</span>';
                    return;
                }

                // ✅ Disponible
                docFeedback.textContent = '✅ Documento disponible — puedes continuar.';
                docFeedback.className   = 'doc-feedback ok';
                inputDoc.classList.remove('input-error');

            } catch (err) {
                // Si la BD no responde, NO permitir el registro (fail-safe)
                console.error('Error verificando duplicado en BD:', err);
                btnSubmit.disabled  = false;
                btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> <span>Enviar Inscripción</span>';
                alert('No se pudo verificar el documento. Comprueba tu conexión e intenta de nuevo.');
                return;
            }
        }

        // ── D. Subir fotos y registrar ──
        btnSubmit.disabled  = true;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Enviando inscripción...</span>';

        try {
            const tipoDoc     = tipo;
            const numDoc      = num;
            const nombreMenor = document.getElementById('nombre_menor').value.trim();

            // Subir fotos en paralelo
            const [urlFotoMenor, urlFotoDocumento] = await Promise.all([
                subirFoto('foto_menor',     'fotos',      tipoDoc, numDoc, nombreMenor, capturedBlobs.menor),
                subirFoto('foto_documento', 'documentos', tipoDoc, numDoc, nombreMenor, capturedBlobs.doc)
            ]);

            const datos = {
                nombre_menor:        nombreMenor,
                fecha_nacimiento:    document.getElementById('fecha_nacimiento').value,
                tipo_documento:      tipoDoc,
                numero_documento:    numDoc || null,
                eps:                 document.getElementById('eps').value.trim(),
                talla_camisa:        document.getElementById('talla_camisa').value,
                talla_pantalon:      document.getElementById('talla_pantalon').value,
                talla_zapatos:       document.getElementById('talla_zapatos').value.trim(),
                tiene_alergia:       document.querySelector('input[name="tiene_alergia"]:checked')?.value || 'no',
                descripcion_alergia: document.getElementById('descripcion_alergia').value.trim(),
                observaciones_salud: document.getElementById('observaciones_salud').value.trim(),
                nombre_acudiente:    document.getElementById('nombre_acudiente').value.trim(),
                parentesco:          document.getElementById('parentesco').value,
                whatsapp:            document.getElementById('whatsapp').value.trim(),
                direccion:           document.getElementById('direccion').value.trim(),
                foto_menor_url:      urlFotoMenor,
                foto_documento_url:  urlFotoDocumento
            };

            const respuesta = await fetch(`${SUPABASE_URL}/rest/v1/inscripciones`, {
                method: 'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'apikey':        SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Prefer':        'return=minimal'
                },
                body: JSON.stringify(datos)
            });

            if (!respuesta.ok) {
                const txt = await respuesta.text();
                console.error('Error Supabase INSERT:', txt);

                // Constraint de unicidad de Postgres
                if (txt.includes('23505') || txt.toLowerCase().includes('duplicate') || txt.toLowerCase().includes('unique')) {
                    docFeedback.textContent = '❌ Este número de documento ya está inscrito. No se puede duplicar la inscripción.';
                    docFeedback.className   = 'doc-feedback error';
                    inputDoc.classList.add('input-error');
                    inputDoc.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    btnSubmit.disabled  = false;
                    btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> <span>Enviar Inscripción</span>';
                    return;
                }
                throw new Error(txt);
            }

            // ✅ ÉXITO
            overlay.classList.add('show');
            limpiarFormulario();

        } catch (err) {
            console.error('Error al enviar inscripción:', err);
            alert('Hubo un error al enviar. Por favor intenta de nuevo o contáctanos por WhatsApp al +57 322 601 2056.');
            btnSubmit.disabled  = false;
            btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> <span>Enviar Inscripción</span>';
        }
    });

    // ══════════════════════════════════════════════════════
    // 8. LIMPIAR FORMULARIO DESPUÉS DEL ÉXITO
    // ══════════════════════════════════════════════════════
    function limpiarFormulario() {
        form.reset();
        capturedBlobs = { menor: null, doc: null };

        ['preview-menor', 'preview-doc'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });

        [
            { id: 'upload-menor', texto: 'Clic para subir foto' },
            { id: 'upload-doc',   texto: 'Clic para subir documento' }
        ].forEach(({ id, texto }) => {
            const area = document.getElementById(id);
            if (!area) return;
            area.classList.remove('uploaded');
            const icon = area.querySelector('.upload-icon');
            const text = area.querySelector('.upload-text');
            if (icon) icon.style.color = '';
            if (text) text.textContent  = texto;
        });

        campoAlergia.classList.remove('visible');
        declaraciones.forEach(({ bloque }) => {
            document.getElementById(bloque)?.classList.remove('error', 'ok');
        });

        docFeedback.textContent = '';
        docFeedback.className   = 'doc-feedback';
        inputDoc.classList.remove('input-error');
        btnSubmit.disabled  = false;
        btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> <span>Enviar Inscripción</span>';
    }

    // ══════════════════════════════════════════════════════
    // 9. CERRAR OVERLAY DE ÉXITO
    // ══════════════════════════════════════════════════════
    overlay?.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('show');
    });

    // ══════════════════════════════════════════════════════
    // 10. FLASH DE CONFIRMACIÓN
    // ══════════════════════════════════════════════════════
    function mostrarFlash(msg) {
        document.querySelector('.flash-msg')?.remove();
        const flash = document.createElement('div');
        flash.className = 'flash-msg';
        flash.style.cssText = `
            position:fixed; bottom:2rem; left:50%; transform:translateX(-50%);
            background:#2D984F; color:white; padding:0.75rem 1.75rem;
            border-radius:50px; font-family:'Nunito',sans-serif; font-weight:700;
            font-size:0.95rem; box-shadow:0 8px 24px rgba(45,152,79,0.4);
            z-index:99999; white-space:nowrap; pointer-events:none;
        `;
        flash.textContent = msg;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 3000);
    }

}); 