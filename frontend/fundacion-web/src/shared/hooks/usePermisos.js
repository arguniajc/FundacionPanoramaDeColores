import { useAuth } from '@/application/auth/AuthContext';

// Conveniencia: const { puedo, esAdmin, rol } = usePermisos()
export default function usePermisos() {
  const { puedo, esAdmin, rol, permisos } = useAuth();
  return { puedo, esAdmin, rol, permisos };
}
