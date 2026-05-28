import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout        from '@/presentation/layouts/AdminLayout';
import RutaProtegida      from '@/shared/components/RutaProtegida';
import SinAcceso          from '@/shared/components/SinAcceso';
import PantallaCarga      from '@/shared/components/PantallaCarga';
import { useAuth }        from '@/application/auth/AuthContext';
import LoginPage          from '@/presentation/modules/auth/pages/LoginPage';

// Módulos cargados bajo demanda — el bundle principal pasa de ~2.6 MB a ~800 KB
const DashboardPage      = lazy(() => import('@/presentation/modules/dashboard/pages/DashboardPage'));
const BeneficiariosPage  = lazy(() => import('@/presentation/modules/beneficiarios/pages/BeneficiariosPage'));
const SedesPage          = lazy(() => import('@/presentation/modules/sedes/pages/SedesPage'));
const LogDescargasPage   = lazy(() => import('@/presentation/modules/auditoria/pages/LogDescargasPage'));
const DocumentosPage     = lazy(() => import('@/presentation/modules/documentos/pages/DocumentosPage'));
const ProgramasPage      = lazy(() => import('@/presentation/modules/programas/pages/ProgramasPage'));
const InscripcionesPage  = lazy(() => import('@/presentation/modules/inscripciones/pages/InscripcionesPage'));
const InventarioPage     = lazy(() => import('@/presentation/modules/inventario/pages/InventarioPage'));
const DonacionesPage     = lazy(() => import('@/presentation/modules/donaciones/pages/DonacionesPage'));
const VoluntariosPage    = lazy(() => import('@/presentation/modules/voluntarios/pages/VoluntariosPage'));
const ConfiguracionPage  = lazy(() => import('@/presentation/modules/configuracion/pages/ConfiguracionPage'));
const EquipoPage         = lazy(() => import('@/presentation/modules/equipo/pages/EquipoPage'));
const ActividadesPage    = lazy(() => import('@/presentation/modules/actividades/pages/ActividadesPage'));
const SeguridadPage      = lazy(() => import('@/presentation/modules/seguridad/pages/SeguridadPage'));
const ReportesPage       = lazy(() => import('@/presentation/modules/reportes/pages/ReportesPage'));
const TalentoHumanoPage  = lazy(() => import('@/presentation/modules/talento_humano/pages/TalentoHumanoPage'));
const ContabilidadPage   = lazy(() => import('@/presentation/modules/contabilidad/pages/ContabilidadPage'));
const OrganigramaPage    = lazy(() => import('@/presentation/modules/organigrama/pages/OrganigramaPage'));

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
    <Suspense fallback={<PantallaCarga />}>
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
      <Route path="/sede/organigrama"    element={<Pagina modulo="talento_humano"><OrganigramaPage /></Pagina>} />
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
    </Suspense>
  );
}
