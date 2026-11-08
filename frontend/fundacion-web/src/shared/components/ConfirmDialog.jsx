import { useState, useCallback, useRef } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { ConfirmContext } from './useConfirm';

/**
 * Proveedor del diálogo de confirmación global.
 *   const confirm = useConfirm();
 *   if (await confirm('¿Eliminar el registro?', 'Eliminar')) …
 *   // Textos propios de los botones (opcional):
 *   await confirm('Hay datos sin guardar.', '¿Descartar los cambios?',
 *                 { textoConfirmar: 'Descartar', textoCancelar: 'Seguir editando', enfocarCancelar: true });
 *
 * @param {{ children: React.ReactNode }} props
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false, msg: '', title: 'Confirmar', opciones: {} });
  const resolveRef = useRef(null);

  const confirm = useCallback((msg, title = 'Confirmar', opciones = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ open: true, msg, title, opciones: opciones ?? {} });
    });
  }, []);

  const handle = (result) => {
    setState(s => ({ ...s, open: false }));
    resolveRef.current?.(result);
  };

  const { textoConfirmar = 'Confirmar', textoCancelar = 'Cancelar', colorConfirmar = 'error', enfocarCancelar = false } = state.opciones;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={state.open} onClose={() => handle(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{state.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{state.msg}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handle(false)} color="inherit" autoFocus={enfocarCancelar}>{textoCancelar}</Button>
          <Button onClick={() => handle(true)} color={colorConfirmar} variant="contained" autoFocus={!enfocarCancelar}>
            {textoConfirmar}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
