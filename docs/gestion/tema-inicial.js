// Aplica el tema antes de que React renderice para evitar un destello de color.
// Va en archivo aparte (no en línea dentro de index.html) para que la política de
// seguridad de contenido (CSP) pueda prohibir scripts en línea.
(function () {
  try {
    var mode = localStorage.getItem('themeMode') || 'light';
    var cfgRaw = localStorage.getItem('fundacion_config_cache');
    var data = {};
    if (cfgRaw) {
      var parsed = JSON.parse(cfgRaw);
      data = (parsed && parsed.ts) ? (parsed.data || {}) : (parsed || {});
    }
    var r = document.documentElement;
    r.style.setProperty('--color-sidebar',        data.colorSidebar        || '#F4E3C1');
    r.style.setProperty('--color-oscuro-sidebar', data.colorOscuroSidebar  || '#1B1035');
    r.style.setProperty('--color-oscuro-fondo',   data.colorOscuroFondo    || '#121212');
    r.style.setProperty('--color-oscuro-paper',   data.colorOscuroPaper    || '#1E1A28');
    r.style.setProperty('--color-primario',       data.colorPrimario       || '#6735A6');
    r.setAttribute('data-theme', mode);
  } catch (e) { /* sin localStorage: se usan los valores del tema */ }
})();
