import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './application/auth/AuthContext';
import { AppThemeProvider } from './shared/theme/ThemeContext';
import ErrorBoundary from './presentation/components/ErrorBoundary';
import logger from './shared/utils/logger';
import App from './App.jsx';

// ── Errores JS globales no capturados ─────────────────────────────────────────
window.addEventListener('error', (e) => {
  logger.error('JS global error:', e.message, '\n', e.filename, 'línea', e.lineno);
});
window.addEventListener('unhandledrejection', (e) => {
  logger.error('Promise sin manejar:', e.reason);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <HashRouter>
        <AppThemeProvider>
          <AuthProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </AuthProvider>
        </AppThemeProvider>
      </HashRouter>
    </GoogleOAuthProvider>
  </StrictMode>
);
