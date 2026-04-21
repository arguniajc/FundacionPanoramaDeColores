import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './application/auth/AuthContext';
import { AppThemeProvider } from './shared/theme/ThemeContext';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <HashRouter>
        <AppThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AppThemeProvider>
      </HashRouter>
    </GoogleOAuthProvider>
  </StrictMode>
);
