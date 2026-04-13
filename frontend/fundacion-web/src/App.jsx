import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home/Home';
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
      {/* Página principal pública */}
      <Route path="/" element={<Home />} />

      {/* Login */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Panel admin — todas las rutas usan el mismo layout con sidebar */}
      <Route path="/admin" element={<AdminConLayout><Dashboard /></AdminConLayout>} />

      <Route path="/admin/beneficiarios" element={<AdminConLayout><AdminDashboard /></AdminConLayout>} />

      <Route path="/admin/donantes"      element={<AdminConLayout><ModuloEnDesarrollo nombre="Donantes" /></AdminConLayout>} />
      <Route path="/admin/donaciones"    element={<AdminConLayout><ModuloEnDesarrollo nombre="Donaciones" /></AdminConLayout>} />
      <Route path="/admin/proyectos"     element={<AdminConLayout><ModuloEnDesarrollo nombre="Proyectos / Programas" /></AdminConLayout>} />
      <Route path="/admin/actividades"   element={<AdminConLayout><ModuloEnDesarrollo nombre="Actividades" /></AdminConLayout>} />
      <Route path="/admin/voluntarios"   element={<AdminConLayout><ModuloEnDesarrollo nombre="Voluntarios" /></AdminConLayout>} />
      <Route path="/admin/talento-humano" element={<AdminConLayout><ModuloEnDesarrollo nombre="Talento Humano" /></AdminConLayout>} />
      <Route path="/admin/contabilidad"  element={<AdminConLayout><ModuloEnDesarrollo nombre="Contabilidad" /></AdminConLayout>} />
      <Route path="/admin/inventario"    element={<AdminConLayout><ModuloEnDesarrollo nombre="Inventario" /></AdminConLayout>} />
      <Route path="/admin/reportes"      element={<AdminConLayout><ModuloEnDesarrollo nombre="Reportes" /></AdminConLayout>} />
      <Route path="/admin/documentos"    element={<AdminConLayout><ModuloEnDesarrollo nombre="Documentos" /></AdminConLayout>} />
      <Route path="/admin/seguridad"     element={<AdminConLayout><ModuloEnDesarrollo nombre="Seguridad" /></AdminConLayout>} />
      <Route path="/admin/usuarios"      element={<AdminConLayout><ModuloEnDesarrollo nombre="Usuarios" /></AdminConLayout>} />
      <Route path="/admin/configuracion" element={<AdminConLayout><ModuloEnDesarrollo nombre="Configuración" /></AdminConLayout>} />

      {/* Fallbacks */}
      <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
      <Route path="*"        element={<Navigate to="/" replace />} />
    </Routes>
  );
}
