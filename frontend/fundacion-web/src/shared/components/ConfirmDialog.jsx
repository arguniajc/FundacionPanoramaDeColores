import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false, msg: '', title: 'Confirmar' });
  const resolveRef = useRef(null);

  const confirm = useCallback((msg, title = 'Confirmar') => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ open: true, msg, title });
    });
  }, []);

  const handle = (result) => {
    setState(s => ({ ...s, open: false }));
    resolveRef.current?.(result);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={state.open} onClose={() => handle(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{state.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{state.msg}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handle(false)} color="inherit">Cancelar</Button>
          <Button onClick={() => handle(true)} color="error" variant="contained" autoFocus>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de ConfirmProvider');
  return ctx;
}
