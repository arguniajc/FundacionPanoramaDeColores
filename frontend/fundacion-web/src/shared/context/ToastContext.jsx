import { useState, useCallback, useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { ToastContext } from './useToast';
import { EVENTO_NOTIFICAR } from '@/shared/utils/notificar';

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

  const show = useCallback((msg, severity = 'success') => {
    setToast({ open: true, msg, severity });
  }, []);

  // Avisos lanzados con notificar() desde utilidades que no son componentes
  useEffect(() => {
    const escuchar = e => show(e.detail.mensaje, e.detail.severidad);
    window.addEventListener(EVENTO_NOTIFICAR, escuchar);
    return () => window.removeEventListener(EVENTO_NOTIFICAR, escuchar);
  }, [show]);

  const handleClose = () => setToast(t => ({ ...t, open: false }));

  return (
    <ToastContext.Provider value={show}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={toast.severity === 'error' ? 8000 : 3500}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleClose} severity={toast.severity} variant="filled" sx={{ minWidth: 240 }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}
