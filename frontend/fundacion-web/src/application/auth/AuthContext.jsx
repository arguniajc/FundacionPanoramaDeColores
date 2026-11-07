import { useState, useCallback } from 'react';
import {
  getToken, getUser, getRol, getPermisos,
  saveSession, clearSession,
} from '@/infrastructure/storage/authStorage';
import { AuthContext } from './useAuth';

export function AuthProvider({ children }) {
  // La sesión guardada se lee una sola vez al crear el estado (antes se copiaba en un efecto)
  const [sesionInicial] = useState(() => (getToken()
    ? { user: getUser(), rol: getRol(), permisos: getPermisos() }
    : { user: null, rol: '', permisos: {} }));
  const [user,     setUser]     = useState(sesionInicial.user);
  const [rol,      setRol]      = useState(sesionInicial.rol);
  const [permisos, setPermisos] = useState(sesionInicial.permisos);
  const cargando = false;

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
