import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout          from '../layouts/AdminLayout';
import RutaProtegida        from '../../shared/components/RutaProtegida';
import SinAcceso            from '../../shared/components/SinAcceso';
import ModuloEnDesarrollo   from '../../shared/components/ModuloEnDesarrollo';
import { useAuth }          from '../../application/auth/AuthContext';
import LoginPage            from '../modules/auth/pages/LoginPage';
import DashboardPage        from '../modules/dashboard/pages/DashboardPage';
import BeneficiariosPage    from '../modules/beneficiarios/pages/BeneficiariosPage';
import SedesPage            from '../modules/sedes/pages/SedesPage';
import LogDescargasPage     from '../modules/auditoria/pages/LogDescargasPage';
import DocumentosPage       from '../modules/documentos/pages/DocumentosPage';
import ProgramasPage        from '../modules/programas/pages/ProgramasPage';
import InscripcionesPage    from '../modules/inscripciones/pages/InscripcionesPage';
import InventarioPage       from '../modules/inventario/pages/InventarioPage';
import DonacionesPage       from '../modules/donaciones/pages/DonacionesPage';
import VoluntariosPage      from '../modules/voluntarios/pages/VoluntariosPage';
import ConfiguracionPage    from '../modules/configuracion/pages/ConfiguracionPage';
import EquipoPage           from '../modules/equipo/pages/EquipoPage';
import ActividadesPage      from '../modules/actividades/pages/ActividadesPage';
import SeguridadPage        from '../modules/seguridad/pages/SeguridadPage';
import ReportesPage         from '../modules/reportes/pages/ReportesPage';
import TalentoHumanoPage    from '../modules/talento_humano/pages/TalentoHumanoPage';
import ContabilidadPage     from '../modules/contabilidad/pages/ContabilidadPage';

// Envuelve en layout + auth + permiso de módulo
function Pagina({ modulo, children }) {
  const { puedo, cargando } = useAuth();
  if (cargando) return null;
  return (
    <RutaProtegida>
      <AdminLayout>
        {!modulo || puedo(modulo, 'ver') ? children : <SinAcceso modulo={modulo} />}
      </AdminLayout>
    </RutaProtegida>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/"    element={<Navigate to="/sede" replace />} />
      <Route path="/acceso" element={<LoginPage />} />

      <Route path="/sede"               element={<Pagina><DashboardPage /></Pagina>} />
      <Route path="/sede/beneficiarios" element={<Pagina modulo="beneficiarios"><BeneficiariosPage /></Pagina>} />
      <Route path="/sede/sedes"         element={<Pagina modulo="sedes"><SedesPage /></Pagina>} />
      <Route path="/sede/log-descargas" element={<Pagina modulo="log_descargas"><LogDescargasPage /></Pagina>} />
      <Route path="/sede/donantes"      element={<Navigate to="/sede/donaciones" replace />} />
      <Route path="/sede/donaciones"    element={<Pagina modulo="donaciones"><DonacionesPage /></Pagina>} />
      <Route path="/sede/proyectos"     element={<Pagina modulo="programas"><ProgramasPage /></Pagina>} />
      <Route path="/sede/inscripciones" element={<Pagina modulo="inscripciones"><InscripcionesPage /></Pagina>} />
      <Route path="/sede/actividades"   element={<Pagina modulo="actividades"><ActividadesPage /></Pagina>} />
      <Route path="/sede/voluntarios"   element={<Pagina modulo="voluntarios"><VoluntariosPage /></Pagina>} />
      <Route path="/sede/talento-humano" element={<Pagina modulo="talento_humano"><TalentoHumanoPage /></Pagina>} />
      <Route path="/sede/contabilidad"  element={<Pagina modulo="contabilidad"><ContabilidadPage /></Pagina>} />
      <Route path="/sede/inventario"    element={<Pagina modulo="inventario"><InventarioPage /></Pagina>} />
      <Route path="/sede/reportes"      element={<Pagina modulo="reportes"><ReportesPage /></Pagina>} />
      <Route path="/sede/documentos"    element={<Pagina modulo="documentos"><DocumentosPage /></Pagina>} />
      <Route path="/sede/seguridad"     element={<Pagina modulo="seguridad"><SeguridadPage /></Pagina>} />
      <Route path="/sede/equipo"        element={<Pagina modulo="equipo"><EquipoPage /></Pagina>} />
      <Route path="/sede/configuracion" element={<Pagina modulo="configuracion"><ConfiguracionPage /></Pagina>} />

      <Route path="/sede/*" element={<Navigate to="/sede" replace />} />
      <Route path="*"       element={<Navigate to="/" replace />} />
    </Routes>
  );
}
