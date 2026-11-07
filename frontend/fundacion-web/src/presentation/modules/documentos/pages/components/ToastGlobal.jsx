import { Snackbar } from '@mui/material';
import MuiAlert from '@mui/material/Alert';

export function ToastGlobal({ toast, onClose }) {
  return (
    <Snackbar open={toast.open} autoHideDuration={toast.severity === 'error' ? 8000 : 3500} onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <MuiAlert onClose={onClose} severity={toast.severity} variant="filled"
        sx={{ width: '100%', borderRadius: 2 }}>
        {toast.msg}
      </MuiAlert>
    </Snackbar>
  );
}
