// ── inscripcion.js ── Fundación Panorama de Colores

const SUPABASE_URL = 'https://hfitfoevyqbhkqjeaegs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmaXRmb2V2eXFiaGtxamVhZWdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MzQwNjgsImV4cCI6MjA4NzExMDA2OH0.rcTZdY7Av2YVU4FMvbbjqOPv76FC5xW9Cs14Gj2Dzmg';

document.addEventListener('DOMContentLoaded', function () {

    // ══════════════════════════════════════════════
    // 1. MOSTRAR/OCULTAR CAMPO DE ALERGIA
    // ══════════════════════════════════════════════
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

    // ══════════════════════════════════════════════
    // 2. VALIDACIÓN DOCUMENTO DUPLICADO (en tiempo real)
    // Consulta Supabase cuando el usuario termina de escribir
    // ══════════════════════════════════════════════
    const inputDoc    = document.getElementById('numero_documento');
    const selectTipo  = document.getElementById('tipo_documento');
    const docFeedback = document.getElementById('doc-feedback');
    let   docTimer    = null;
    let   docValido   = true; // bandera global para el submit

    async function verificarDocumento() {
        const num  = inputDoc.value.trim();
        const tipo = selectTipo.value;

        // No validar si está vacío o es "Sin documento"
        if (!num || num.toLowerCase() === 'sin documento' || !tipo) {
            docFeedback.textContent = '';
            docFeedback.className   = 'doc-feedback';
            docValido = true;
            return;
        }

        docFeedback.textContent = '⏳ Verificando...';
        docFeedback.className   = 'doc-feedback checking';

        try {
            const url = `${SUPABASE_URL}/rest/v1/inscripciones?tipo_documento=eq.${encodeURIComponent(tipo)}&numero_documento=eq.${encodeURIComponent(num)}&select=id`;
            const res = await fetch(url, {
                headers: {
                    'apikey':        SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });
            const data = await res.json();

            if (data.length > 0) {
                // Ya existe
                docFeedback.textContent = '❌ Este documento ya está inscrito. Comunícate con la Fundación si es un error.';
                docFeedback.className   = 'doc-feedback error';
                inputDoc.classList.add('input-error');
                docValido = false;
            } else {
                docFeedback.textContent = '✅ Documento disponible';
                docFeedback.className   = 'doc-feedback ok';
                inputDoc.classList.remove('input-error');
                docValido = true;
            }
        } catch (e) {
            // Si falla la consulta, permitir continuar (se valida igual en el servidor)
            docFeedback.textContent = '';
            docFeedback.className   = 'doc-feedback';
            docValido = true;
        }
    }

    // Verificar al salir del campo o al cambiar tipo de documento
    inputDoc.addEventListener('blur', () => {
        clearTimeout(docTimer);
        verificarDocumento();
    });
    inputDoc.addEventListener('input', () => {
        clearTimeout(docTimer);
        docFeedback.textContent = '';
        inputDoc.classList.remove('input-error');
        docValido = true;
        // Verificar 800ms después de que el usuario deje de escribir
        docTimer = setTimeout(verificarDocumento, 800);
    });
    selectTipo.addEventListener('change', () => {
        clearTimeout(docTimer);
        docTimer = setTimeout(verificarDocumento, 400);
    });

    // ══════════════════════════════════════════════
    // 3. PREVIEW DE IMÁGENES (subir archivo)
    // ══════════════════════════════════════════════
    function setupPreview(inputId, previewId, uploadAreaId) {
        const input      = document.getElementById(inputId);
        const preview    = document.getElementById(previewId);
        const uploadArea = document.getElementById(uploadAreaId);
        if (!input) return;

        input.addEventListener('change', function () {
            const file = this.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                alert('La imagen es muy grande. Por favor sube una imagen de máximo 5MB.');
                this.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                mostrarPreview(previewId, uploadAreaId, e.target.result);
            };
            reader.readAsDataURL(file);
        });
    }

    function mostrarPreview(previewId, uploadAreaId, dataUrl) {
        const preview    = document.getElementById(previewId);
        const uploadArea = document.getElementById(uploadAreaId);
        if (preview)    preview.innerHTML = `<img src="${dataUrl}" alt="Vista previa">`;
        if (uploadArea) uploadArea.classList.add('uploaded');
        const icon = uploadArea?.querySelector('.upload-icon');
        const text = uploadArea?.querySelector('.upload-text');
        if (icon) icon.style.color = '#2D984F';
        if (text) text.textContent = '✓ Imagen cargada';
    }

    setupPreview('foto_menor',     'preview-menor', 'upload-menor');
    setupPreview('foto_documento', 'preview-doc',   'upload-doc');

    // ══════════════════════════════════════════════
    // 4. CÁMARA INTEGRADA
    // Permite tomar foto directamente desde el navegador
    // ══════════════════════════════════════════════
    let streamActivo  = null; // referencia al stream de la cámara
    let targetPreview = null; // 'menor' o 'doc'
    let capturedBlobs = { menor: null, doc: null }; // fotos tomadas

    const cameraOverlay  = document.getElementById('cameraOverlay');
    const cameraVideo    = document.getElementById('cameraVideo');
    const cameraCanvas   = document.getElementById('cameraCanvas');
    const btnCapturar    = document.getElementById('btnCapturar');
    const btnCerrarCam   = document.getElementById('btnCerrarCam');
    const btnFlip        = document.getElementById('btnFlip');
    let   usandoFrontal  = true;

    // Abrir cámara
    async function abrirCamara(target) {
        targetPreview = target;
        usandoFrontal = true;

        try {
            await iniciarStream();
            cameraOverlay.classList.add('show');
        } catch (err) {
            alert('No se pudo acceder a la cámara. Por favor sube la foto desde tu galería.');
            console.error('Cámara:', err);
        }
    }

    async function iniciarStream(frontal = true) {
        if (streamActivo) {
            streamActivo.getTracks().forEach(t => t.stop());
        }
        streamActivo = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: frontal ? 'user' : 'environment',
                width:  { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        cameraVideo.srcObject = streamActivo;
    }

    // Capturar foto
    btnCapturar?.addEventListener('click', () => {
        const ctx = cameraCanvas.getContext('2d');
        cameraCanvas.width  = cameraVideo.videoWidth;
        cameraCanvas.height = cameraVideo.videoHeight;
        ctx.drawImage(cameraVideo, 0, 0);

        cameraCanvas.toBlob(blob => {
            if (!blob) return;

            // Guardar blob para el envío
            capturedBlobs[targetPreview] = blob;

            // Mostrar preview
            const previewId    = targetPreview === 'menor' ? 'preview-menor' : 'preview-doc';
            const uploadAreaId = targetPreview === 'menor' ? 'upload-menor'  : 'upload-doc';
            const url          = URL.createObjectURL(blob);
            mostrarPreview(previewId, uploadAreaId, url);

            cerrarCamara();

            // Flash de confirmación
            mostrarFlash('📸 ¡Foto tomada correctamente!');
        }, 'image/jpeg', 0.92);
    });

    // Voltear cámara (frontal / trasera)
    btnFlip?.addEventListener('click', async () => {
        usandoFrontal = !usandoFrontal;
        try {
            await iniciarStream(!usandoFrontal);
        } catch (err) {
            alert('No se pudo cambiar de cámara.');
        }
    });

    // Cerrar cámara
    btnCerrarCam?.addEventListener('click', cerrarCamara);
    cameraOverlay?.addEventListener('click', e => {
        if (e.target === cameraOverlay) cerrarCamara();
    });

    function cerrarCamara() {
        if (streamActivo) {
            streamActivo.getTracks().forEach(t => t.stop());
            streamActivo = null;
        }
        cameraOverlay?.classList.remove('show');
    }

    // Botones de abrir cámara en cada sección
    document.getElementById('btnCamaraMenor')?.addEventListener('click', () => abrirCamara('menor'));
    document.getElementById('btnCamaraDoc')?.addEventListener('click',   () => abrirCamara('doc'));

    // ══════════════════════════════════════════════
    // 5. VALIDAR CHECKBOXES
    // ══════════════════════════════════════════════
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

    // ══════════════════════════════════════════════
    // 6. GENERAR NOMBRE DE ARCHIVO DESCRIPTIVO
    // ══════════════════════════════════════════════
    function generarNombreArchivo(tipoDoc, numDoc, nombreMenor, tipo, extension) {
        const limpiar = txt => txt
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .substring(0, 30);

        return `${limpiar(tipoDoc || 'SIN_TIPO')}_${limpiar(numDoc || 'SIN_NUM')}_${limpiar(nombreMenor || 'SIN_NOMBRE')}_${tipo}.${extension}`;
    }

    // ══════════════════════════════════════════════
    // 7. SUBIR FOTO A SUPABASE STORAGE
    // Acepta tanto File (galería) como Blob (cámara)
    // ══════════════════════════════════════════════
    async function subirFoto(inputId, tipoArchivo, tipoDoc, numDoc, nombreMenor, blobOverride = null) {
        let file = blobOverride; // foto tomada con cámara

        if (!file) {
            const input = document.getElementById(inputId);
            if (!input || !input.files[0]) return '';
            file = input.files[0];
        }

        const extension     = file.type === 'image/jpeg' ? 'jpg' : (file.type.split('/')[1] || 'jpg');
        const nombreArchivo = generarNombreArchivo(tipoDoc, numDoc, nombreMenor, tipoArchivo, extension);
        const carpeta       = tipoArchivo === 'foto' ? 'fotos' : 'documentos';
        const ruta          = `${carpeta}/${nombreArchivo}`;

        const respuesta = await fetch(
            `${SUPABASE_URL}/storage/v1/object/fotos-inscripciones/${ruta}`,
            {
                method:  'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type':  file.type || 'image/jpeg',
                    'x-upsert':      'true'
                },
                body: file
            }
        );

        if (!respuesta.ok) {
            console.warn('No se pudo subir la foto:', await respuesta.text());
            return '';
        }

        return `${SUPABASE_URL}/storage/v1/object/public/fotos-inscripciones/${ruta}`;
    }

    // ══════════════════════════════════════════════
    // 8. ENVÍO DEL FORMULARIO
    // ══════════════════════════════════════════════
    const form      = document.getElementById('inscripcionForm');
    const overlay   = document.getElementById('successOverlay');
    const btnSubmit = document.getElementById('btnSubmit');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // ── Validar documento duplicado ──
        if (!docValido) {
            inputDoc.focus();
            inputDoc.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        // ── Validar checkboxes ──
        let checkOk     = true;
        let primerError = null;

        declaraciones.forEach(({ check, bloque }) => {
            const el     = document.getElementById(check);
            const bloqEl = document.getElementById(bloque);
            if (!el.checked) {
                checkOk = false;
                bloqEl.classList.add('error');
                bloqEl.classList.remove('ok');
                if (!primerError) primerError = bloqEl;
            }
        });

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (!checkOk) {
            primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        // ── Verificar duplicado UNA VEZ MÁS antes de enviar (doble seguridad) ──
        const num  = inputDoc.value.trim();
        const tipo = selectTipo.value;

        if (num && num.toLowerCase() !== 'sin documento') {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Verificando...</span>';

            try {
                const checkUrl = `${SUPABASE_URL}/rest/v1/inscripciones?tipo_documento=eq.${encodeURIComponent(tipo)}&numero_documento=eq.${encodeURIComponent(num)}&select=id`;
                const checkRes = await fetch(checkUrl, {
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                });
                const checkData = await checkRes.json();

                if (checkData.length > 0) {
                    docFeedback.textContent = '❌ Este documento ya está inscrito. No es posible duplicar la inscripción.';
                    docFeedback.className   = 'doc-feedback error';
                    inputDoc.classList.add('input-error');
                    inputDoc.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> <span>Enviar Inscripción</span>';
                    return;
                }
            } catch (e) {
                console.warn('No se pudo verificar duplicado en submit, continuando...');
            }
        }

        // ── Mostrar loading ──
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Enviando...</span>';

        try {
            const tipoDoc     = selectTipo.value;
            const numDoc      = inputDoc.value.trim();
            const nombreMenor = document.getElementById('nombre_menor').value.trim();

            // Subir fotos (prioridad: blob de cámara, luego archivo de galería)
            const urlFotoMenor     = await subirFoto('foto_menor',     'foto',      tipoDoc, numDoc, nombreMenor, capturedBlobs.menor || null);
            const urlFotoDocumento = await subirFoto('foto_documento', 'documento', tipoDoc, numDoc, nombreMenor, capturedBlobs.doc   || null);

            const datos = {
                nombre_menor:        nombreMenor,
                fecha_nacimiento:    document.getElementById('fecha_nacimiento').value,
                tipo_documento:      tipoDoc,
                numero_documento:    numDoc,
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
                const error = await respuesta.text();
                throw new Error(error);
            }

            // ── ÉXITO ──
            overlay.classList.add('show');
            limpiarFormulario();

        } catch (error) {
            console.error('Error al enviar inscripción:', error);
            alert('Hubo un error al enviar. Por favor intenta de nuevo o contáctanos por WhatsApp al +57 322 601 2056.');
        } finally {
            btnSubmit.disabled  = false;
            btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> <span>Enviar Inscripción</span>';
        }
    });

    // ══════════════════════════════════════════════
    // 9. LIMPIAR FORMULARIO DESPUÉS DEL ÉXITO
    // ══════════════════════════════════════════════
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
            if (text) text.textContent = texto;
        });

        campoAlergia.classList.remove('visible');
        declaraciones.forEach(({ bloque }) => {
            document.getElementById(bloque)?.classList.remove('error', 'ok');
        });

        docFeedback.textContent = '';
        docFeedback.className   = 'doc-feedback';
        inputDoc.classList.remove('input-error');
        docValido = true;
    }

    // ══════════════════════════════════════════════
    // 10. CERRAR OVERLAY DE ÉXITO
    // ══════════════════════════════════════════════
    overlay?.addEventListener('click', function (e) {
        if (e.target === overlay) overlay.classList.remove('show');
    });

    // ══════════════════════════════════════════════
    // 11. FLASH DE CONFIRMACIÓN
    // ══════════════════════════════════════════════
    function mostrarFlash(msg) {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position:fixed; bottom:2rem; left:50%; transform:translateX(-50%);
            background:#2D984F; color:white; padding:0.75rem 1.75rem;
            border-radius:50px; font-family:'Nunito',sans-serif; font-weight:700;
            font-size:0.95rem; box-shadow:0 8px 24px rgba(45,152,79,0.4);
            z-index:9999; animation:slideUp 0.3s ease;
            white-space:nowrap;
        `;
        flash.textContent = msg;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 3000);
    }

});