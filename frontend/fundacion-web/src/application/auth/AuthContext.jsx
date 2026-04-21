/**
 * AuthContext
 * Estado global de la sesión del administrador.
 * Delega el acceso a localStorage a authStorage (infrastructure).
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { getToken, getUser, saveSession, clearSession } from '../../infrastructure/storage/authStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,     setUser]     = useState(null);
  const [cargando, setCargando] = useState(true);

  // Restaurar sesión al montar (localStorage → estado React)
  useEffect(() => {
    if (getToken()) setUser(getUser());
    setCargando(false);
  }, []);

  const login  = (token, userData) => { saveSession(token, userData); setUser(userData); };
  const logout = ()                 => { clearSession(); setUser(null); };

  return (
    <AuthContext.Provider value={{ user, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
