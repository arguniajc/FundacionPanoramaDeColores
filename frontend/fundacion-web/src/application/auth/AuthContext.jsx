import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getToken, getUser, getRol, getPermisos,
  saveSession, clearSession,
} from '@/infrastructure/storage/authStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,     setUser]     = useState(null);
  const [rol,      setRol]      = useState('');
  const [permisos, setPermisos] = useState({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (getToken()) {
      setUser(getUser());
      setRol(getRol());
      setPermisos(getPermisos());
    }
    setCargando(false);
  }, []);

  const login = useCallback((token, userData, rolData, permisosData) => {
    saveSession(token, userData, rolData, permisosData);
    setUser(userData);
    setRol(rolData ?? '');
    setPermisos(permisosData ?? {});
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setRol('');
    setPermisos({});
  }, []);

  const puedo = useCallback((modulo, accion) => {
    if (!user) return false;
    if (rol === 'administrador') return true;
    return permisos[modulo]?.includes(accion) ?? false;
  }, [rol, permisos, user]);

  const esAdmin = rol === 'administrador';

  return (
    <AuthContext.Provider value={{ user, rol, permisos, cargando, esAdmin, login, logout, puedo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
