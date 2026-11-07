import { useAuth } from '@/application/auth/useAuth';

// Conveniencia: const { puedo, esAdmin, rol } = usePermisos()
export default function usePermisos() {
  const { puedo, esAdmin, rol, permisos } = useAuth();
  return { puedo, esAdmin, rol, permisos };
}
