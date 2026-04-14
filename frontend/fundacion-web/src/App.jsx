import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/Admin/AdminLogin';
import Dashboard from './pages/Admin/Dashboard';
import AdminDashboard from './pages/Admin/AdminDashboard';
import ModuloEnDesarrollo from './pages/Admin/ModuloEnDesarrollo';
import AdminLayout from './layout/AdminLayout';
import RutaProtegida from './components/RutaProtegida';

function AdminConLayout({ children }) {
  return (
    <RutaProtegida>
      <AdminLayout>{children}</AdminLayout>
    </RutaProtegida>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Raíz: redirige al panel (RutaProtegida manda a /acceso si no hay sesión) */}
      <Route path="/" element={<Navigate to="/sede" replace />} />

      {/* Acceso — ruta de autenticación */}
      <Route path="/acceso" element={<AdminLogin />} />

      {/* Sede — área privada con layout y sidebar */}
      <Route path="/sede" element={<AdminConLayout><Dashboard /></AdminConLayout>} />

      <Route path="/sede/beneficiarios"   element={<AdminConLayout><AdminDashboard /></AdminConLayout>} />

      <Route path="/sede/donantes"        element={<AdminConLayout><ModuloEnDesarrollo nombre="Donantes" /></AdminConLayout>} />
      <Route path="/sede/donaciones"      element={<AdminConLayout><ModuloEnDesarrollo nombre="Donaciones" /></AdminConLayout>} />
      <Route path="/sede/proyectos"       element={<AdminConLayout><ModuloEnDesarrollo nombre="Proyectos / Programas" /></AdminConLayout>} />
      <Route path="/sede/actividades"     element={<AdminConLayout><ModuloEnDesarrollo nombre="Actividades" /></AdminConLayout>} />
      <Route path="/sede/voluntarios"     element={<AdminConLayout><ModuloEnDesarrollo nombre="Voluntarios" /></AdminConLayout>} />
      <Route path="/sede/talento-humano"  element={<AdminConLayout><ModuloEnDesarrollo nombre="Talento Humano" /></AdminConLayout>} />
      <Route path="/sede/contabilidad"    element={<AdminConLayout><ModuloEnDesarrollo nombre="Contabilidad" /></AdminConLayout>} />
      <Route path="/sede/inventario"      element={<AdminConLayout><ModuloEnDesarrollo nombre="Inventario" /></AdminConLayout>} />
      <Route path="/sede/reportes"        element={<AdminConLayout><ModuloEnDesarrollo nombre="Reportes" /></AdminConLayout>} />
      <Route path="/sede/documentos"      element={<AdminConLayout><ModuloEnDesarrollo nombre="Documentos" /></AdminConLayout>} />
      <Route path="/sede/seguridad"       element={<AdminConLayout><ModuloEnDesarrollo nombre="Seguridad" /></AdminConLayout>} />
      <Route path="/sede/equipo"          element={<AdminConLayout><ModuloEnDesarrollo nombre="Usuarios" /></AdminConLayout>} />
      <Route path="/sede/configuracion"   element={<AdminConLayout><ModuloEnDesarrollo nombre="Configuración" /></AdminConLayout>} />

      {/* Fallbacks */}
      <Route path="/sede/*" element={<Navigate to="/sede" replace />} />
      <Route path="*"       element={<Navigate to="/" replace />} />
    </Routes>
  );
}
