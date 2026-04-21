import { Navigate }    from 'react-router-dom';
import { useAuth }     from '../../application/auth/AuthContext';
import PantallaCarga   from './PantallaCarga';

export default function RutaProtegida({ children }) {
  const { user, cargando } = useAuth();
  if (cargando) return <PantallaCarga />;
  return user ? children : <Navigate to="/acceso" replace />;
}
