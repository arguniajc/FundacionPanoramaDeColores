// ── inscripcion.js ── Fundación Panorama de Colores
// Conectado a Supabase

const SUPABASE_URL = 'https://hfitfoevyqbhkqjeaegs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmaXRmb2V2eXFiaGtxamVhZWdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MzQwNjgsImV4cCI6MjA4NzExMDA2OH0.rcTZdY7Av2YVU4FMvbbjqOPv76FC5xW9Cs14Gj2Dzmg';

document.addEventListener('DOMContentLoaded', function () {

    // ── 1. MOSTRAR/OCULTAR CAMPO DE ALERGIA ──
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

    // ── 2. PREVIEW DE IMÁGENES ──
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
                preview.innerHTML = `<img src="${e.target.result}" alt="Vista previa">`;
                uploadArea.classList.add('uploaded');
                const icon = uploadArea.querySelector('.upload-icon');
                const text = uploadArea.querySelector('.upload-text');
                if (icon) icon.style.color = '#2D984F';
                if (text) text.textContent  = '✓ Imagen cargada';
            };
            reader.readAsDataURL(file);
        });
    }

    setupPreview('foto_menor',     'preview-menor', 'upload-menor');
    setupPreview('foto_documento', 'preview-doc',   'upload-doc');

    // ── 3. VALIDAR CHECKBOXES ──
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

    // ── 4. GENERAR NOMBRE DESCRIPTIVO PARA LA FOTO ──
    // Resultado: TI_1234567_Juan_Perez_foto.jpg
    //            TI_1234567_Juan_Perez_documento.jpg
    function generarNombreArchivo(tipoDoc, numDoc, nombreMenor, tipo, extension) {
        // Limpiar nombre: quitar tildes, espacios → guion bajo
        const limpiarTexto = (texto) => texto
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')   // quitar tildes
            .replace(/[^a-zA-Z0-9]/g, '_')     // reemplazar caracteres especiales
            .replace(/_+/g, '_')               // evitar dobles guiones
            .substring(0, 30);                 // máximo 30 caracteres

        const docTipo   = limpiarTexto(tipoDoc   || 'SIN_TIPO');
        const docNum    = limpiarTexto(numDoc     || 'SIN_NUM');
        const nombre    = limpiarTexto(nombreMenor|| 'SIN_NOMBRE');

        // tipo = 'foto' o 'documento'
        return `${docTipo}_${docNum}_${nombre}_${tipo}.${extension}`;
    }

    // ── 5. SUBIR FOTO A SUPABASE STORAGE ──
    async function subirFoto(inputId, tipoArchivo, tipoDoc, numDoc, nombreMenor) {
        const input = document.getElementById(inputId);
        if (!input || !input.files[0]) return '';

        const file      = input.files[0];
        const extension = file.name.split('.').pop().toLowerCase();

        // Nombre descriptivo del archivo
        const nombreArchivo = generarNombreArchivo(tipoDoc, numDoc, nombreMenor, tipoArchivo, extension);

        // Carpeta según tipo: fotos/ o documentos/
        const carpeta = tipoArchivo === 'foto' ? 'fotos' : 'documentos';
        const ruta    = `${carpeta}/${nombreArchivo}`;

        const respuesta = await fetch(
            `${SUPABASE_URL}/storage/v1/object/fotos-inscripciones/${ruta}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type':  file.type,
                    'x-upsert':      'true'
                },
                body: file
            }
        );

        if (!respuesta.ok) {
            const err = await respuesta.text();
            console.warn('No se pudo subir la foto:', err);
            return '';
        }

        return `${SUPABASE_URL}/storage/v1/object/public/fotos-inscripciones/${ruta}`;
    }

    // ── 6. ENVÍO DEL FORMULARIO ──
    const form      = document.getElementById('inscripcionForm');
    const overlay   = document.getElementById('successOverlay');
    const btnSubmit = document.getElementById('btnSubmit');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Validar checkboxes
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

        // Mostrar loading
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Enviando...</span>';

        try {
            // Obtener datos del documento y nombre para los nombres de archivo
            const tipoDoc    = document.getElementById('tipo_documento').value;
            const numDoc     = document.getElementById('numero_documento').value.trim();
            const nombreMenor = document.getElementById('nombre_menor').value.trim();

            // Subir fotos con nombres descriptivos
            // Ejemplo: TI_1234567_Juan_Perez_foto.jpg
            // Ejemplo: TI_1234567_Juan_Perez_documento.jpg
            const urlFotoMenor     = await subirFoto('foto_menor',     'foto',      tipoDoc, numDoc, nombreMenor);
            const urlFotoDocumento = await subirFoto('foto_documento', 'documento', tipoDoc, numDoc, nombreMenor);

            // Armar objeto con todos los datos
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

            // Insertar en Supabase
            const respuesta = await fetch(
                `${SUPABASE_URL}/rest/v1/inscripciones`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':  'application/json',
                        'apikey':        SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Prefer':        'return=minimal'
                    },
                    body: JSON.stringify(datos)
                }
            );

            if (!respuesta.ok) {
                const error = await respuesta.text();
                throw new Error(error);
            }

            // ── ÉXITO ──
            overlay.classList.add('show');
            form.reset();

            // Limpiar previews
            ['preview-menor', 'preview-doc'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '';
            });
            ['upload-menor', 'upload-doc'].forEach(id => {
                const area = document.getElementById(id);
                if (!area) return;
                area.classList.remove('uploaded');
                const icon = area.querySelector('.upload-icon');
                const text = area.querySelector('.upload-text');
                if (icon) icon.style.color = '';
                if (text) text.textContent = id === 'upload-menor'
                    ? 'Clic para subir foto'
                    : 'Clic para subir documento';
            });

            campoAlergia.classList.remove('visible');
            declaraciones.forEach(({ bloque }) => {
                const b = document.getElementById(bloque);
                if (b) b.classList.remove('error', 'ok');
            });

        } catch (error) {
            console.error('Error al enviar inscripción:', error);
            alert('Hubo un error al enviar. Por favor intenta de nuevo o contáctanos por WhatsApp al +57 322 601 2056.');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> <span>Enviar Inscripción</span>';
        }
    });

    // ── 7. CERRAR OVERLAY AL HACER CLIC FUERA ──
    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) overlay.classList.remove('show');
        });
    }

});