// Árbol de rutas de la app. Todas las rutas /sede/* requieren autenticación (RutaProtegida).
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout          from '../layouts/AdminLayout';
import RutaProtegida        from '../../shared/components/RutaProtegida';
import ModuloEnDesarrollo   from '../../shared/components/ModuloEnDesarrollo';
import LoginPage            from '../modules/auth/pages/LoginPage';
import DashboardPage        from '../modules/dashboard/pages/DashboardPage';
import BeneficiariosPage    from '../modules/beneficiarios/pages/BeneficiariosPage';
import SedesPage            from '../modules/sedes/pages/SedesPage';
import LogDescargasPage     from '../modules/auditoria/pages/LogDescargasPage';
import DocumentosPage       from '../modules/documentos/pages/DocumentosPage';
import ProgramasPage        from '../modules/programas/pages/ProgramasPage';
import InscripcionesPage    from '../modules/inscripciones/pages/InscripcionesPage';
import InventarioPage       from '../modules/inventario/pages/InventarioPage';
import DonantesPage         from '../modules/donantes/pages/DonantesPage';
import DonacionesPage       from '../modules/donaciones/pages/DonacionesPage';

function AdminConLayout({ children }) {
  return (
    <RutaProtegida>
      <AdminLayout>{children}</AdminLayout>
    </RutaProtegida>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/sede" replace />} />
      <Route path="/acceso" element={<LoginPage />} />

      <Route path="/sede"                element={<AdminConLayout><DashboardPage /></AdminConLayout>} />
      <Route path="/sede/beneficiarios"  element={<AdminConLayout><BeneficiariosPage /></AdminConLayout>} />
      <Route path="/sede/sedes"          element={<AdminConLayout><SedesPage /></AdminConLayout>} />
      <Route path="/sede/log-descargas"  element={<AdminConLayout><LogDescargasPage /></AdminConLayout>} />

      <Route path="/sede/donantes"       element={<AdminConLayout><DonantesPage /></AdminConLayout>} />
      <Route path="/sede/donaciones"     element={<AdminConLayout><DonacionesPage /></AdminConLayout>} />
      <Route path="/sede/proyectos"      element={<AdminConLayout><ProgramasPage /></AdminConLayout>} />
      <Route path="/sede/inscripciones"  element={<AdminConLayout><InscripcionesPage /></AdminConLayout>} />
      <Route path="/sede/actividades"    element={<AdminConLayout><ModuloEnDesarrollo nombre="Actividades" /></AdminConLayout>} />
      <Route path="/sede/voluntarios"    element={<AdminConLayout><ModuloEnDesarrollo nombre="Voluntarios" /></AdminConLayout>} />
      <Route path="/sede/talento-humano" element={<AdminConLayout><ModuloEnDesarrollo nombre="Talento Humano" /></AdminConLayout>} />
      <Route path="/sede/contabilidad"   element={<AdminConLayout><ModuloEnDesarrollo nombre="Contabilidad" /></AdminConLayout>} />
      <Route path="/sede/inventario"     element={<AdminConLayout><InventarioPage /></AdminConLayout>} />
      <Route path="/sede/reportes"       element={<AdminConLayout><ModuloEnDesarrollo nombre="Reportes" /></AdminConLayout>} />
      <Route path="/sede/documentos"     element={<AdminConLayout><DocumentosPage /></AdminConLayout>} />
      <Route path="/sede/seguridad"      element={<AdminConLayout><ModuloEnDesarrollo nombre="Seguridad" /></AdminConLayout>} />
      <Route path="/sede/equipo"         element={<AdminConLayout><ModuloEnDesarrollo nombre="Usuarios" /></AdminConLayout>} />
      <Route path="/sede/configuracion"  element={<AdminConLayout><ModuloEnDesarrollo nombre="Configuración" /></AdminConLayout>} />

      <Route path="/sede/*" element={<Navigate to="/sede" replace />} />
      <Route path="*"       element={<Navigate to="/" replace />} />
    </Routes>
  );
}
