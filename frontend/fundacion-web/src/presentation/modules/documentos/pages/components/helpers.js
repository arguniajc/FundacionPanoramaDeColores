import { useState, useCallback } from 'react';

export const CATEGORIAS = ['Actas', 'Políticas', 'Formularios', 'Informes', 'Certificados', 'Otros'];
export const HEADER_GRADIENT = 'linear-gradient(135deg, var(--color-primario), #2D984F)';

export function fmt(fecha) {
  return new Date(fecha).toLocaleString('es-CO', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function sinExtension(nombre) {
  return nombre?.replace(/\.[^/.]+$/, '') ?? nombre;
}

export function useToast() {
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });
  const show  = useCallback((msg, severity = 'success') => setToast({ open: true, msg, severity }), []);
  const close = useCallback(() => setToast(t => ({ ...t, open: false })), []);
  return { toast, show, close };
}
