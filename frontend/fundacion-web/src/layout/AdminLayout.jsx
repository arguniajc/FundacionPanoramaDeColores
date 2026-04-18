import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon,
  AppBar, Toolbar, Typography, Avatar, IconButton, Collapse, Tooltip,
} from '@mui/material';

import MenuIcon              from '@mui/icons-material/Menu';
import LogoutIcon            from '@mui/icons-material/Logout';
import DashboardIcon         from '@mui/icons-material/Dashboard';
import ChildCareIcon         from '@mui/icons-material/ChildCare';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import MonetizationOnIcon    from '@mui/icons-material/MonetizationOn';
import FolderSpecialIcon     from '@mui/icons-material/FolderSpecial';
import EventNoteIcon         from '@mui/icons-material/EventNote';
import PeopleIcon            from '@mui/icons-material/People';
import BadgeIcon             from '@mui/icons-material/Badge';
import AccountBalanceIcon    from '@mui/icons-material/AccountBalance';
import InventoryIcon         from '@mui/icons-material/Inventory';
import AssessmentIcon        from '@mui/icons-material/Assessment';
import FolderIcon            from '@mui/icons-material/Folder';
import SecurityIcon          from '@mui/icons-material/Security';
import ManageAccountsIcon    from '@mui/icons-material/ManageAccounts';
import SettingsIcon          from '@mui/icons-material/Settings';
import ExpandLessIcon        from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon        from '@mui/icons-material/ExpandMore';
import DarkModeIcon          from '@mui/icons-material/DarkMode';
import LightModeIcon         from '@mui/icons-material/LightMode';
import DownloadIcon          from '@mui/icons-material/Download';
import LocationOnIcon        from '@mui/icons-material/LocationOn';

import { useAuth }       from '../contexts/AuthContext';
import { useThemeMode }  from '../contexts/ThemeContext';
import useInactividad    from '../hooks/useInactividad';

const SIDEBAR_WIDTH = 260;

/* ─── Paleta del sidebar ──────────────────────────────────────────────────── */
const CYAN   = '#B4E8E8';   // color 1 — cabeceras de grupo y toque de marca
const WHITE  = '#FFFFFF';   // color 2 — labels de ítems: máxima legibilidad
const ACTIVE = '#B4E8E8';   // ítem activo usa el mismo cyan con fondo suave
const BG     = '#150830';   // fondo del sidebar

const MENU = [
  {
    grupo: 'PRINCIPAL',
    items: [
      { label: 'Dashboard',      icon: <DashboardIcon />,          ruta: '/sede' },
    ],
  },
  {
    grupo: 'MÓDULOS FUNCIONALES',
    items: [
      { label: 'Beneficiarios',  icon: <ChildCareIcon />,          ruta: '/sede/beneficiarios' },
      { label: 'Donantes',       icon: <VolunteerActivismIcon />,  ruta: '/sede/donantes' },
      { label: 'Donaciones',     icon: <MonetizationOnIcon />,     ruta: '/sede/donaciones' },
      { label: 'Proyectos',      icon: <FolderSpecialIcon />,      ruta: '/sede/proyectos' },
      { label: 'Sedes',          icon: <LocationOnIcon />,         ruta: '/sede/sedes' },
      { label: 'Actividades',    icon: <EventNoteIcon />,          ruta: '/sede/actividades' },
      { label: 'Voluntarios',    icon: <PeopleIcon />,             ruta: '/sede/voluntarios' },
    ],
  },
  {
    grupo: 'RECURSOS',
    items: [
      { label: 'Talento Humano', icon: <BadgeIcon />,              ruta: '/sede/talento-humano' },
      { label: 'Contabilidad',   icon: <AccountBalanceIcon />,     ruta: '/sede/contabilidad' },
      { label: 'Inventario',     icon: <InventoryIcon />,          ruta: '/sede/inventario' },
    ],
  },
  {
    grupo: 'REPORTES Y DOCS',
    items: [
      { label: 'Reportes',       icon: <AssessmentIcon />,         ruta: '/sede/reportes' },
      { label: 'Documentos',     icon: <FolderIcon />,             ruta: '/sede/documentos' },
      { label: 'Log Descargas',  icon: <DownloadIcon />,           ruta: '/sede/log-descargas' },
    ],
  },
  {
    grupo: 'SISTEMA',
    items: [
      { label: 'Seguridad',      icon: <SecurityIcon />,           ruta: '/sede/seguridad' },
      { label: 'Equipo',         icon: <ManageAccountsIcon />,     ruta: '/sede/equipo' },
      { label: 'Configuración',  icon: <SettingsIcon />,           ruta: '/sede/configuracion' },
    ],
  },
];

/* ─── Componentes reutilizables del sidebar ──────────────────────────────── */
function GrupoLabel({ texto }) {
  return (
    <Typography
      component="span"
      sx={{
        fontSize: '0.6rem',
        fontWeight: 800,
        letterSpacing: '0.14em',
        color: CYAN,           // cyan sobre oscuro = siempre visible
        userSelect: 'none',
      }}
    >
      {texto}
    </Typography>
  );
}

function ItemLabel({ texto, activo }) {
  return (
    <Typography
      component="span"
      sx={{
        fontSize: '0.85rem',
        fontWeight: activo ? 700 : 400,
        color: activo ? CYAN : WHITE,   // cyan si activo, blanco si no
        lineHeight: 1,
      }}
    >
      {texto}
    </Typography>
  );
}

function FooterLabel({ texto, color }) {
  return (
    <Typography component="span" sx={{ fontSize: '0.84rem', color }}>
      {texto}
    </Typography>
  );
}

/* ─── Layout principal ───────────────────────────────────────────────────── */
export default function AdminLayout({ children }) {
  const { user, logout }     = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const navigate             = useNavigate();
  const location             = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed,  setCollapsed]  = useState({});

  const handleCerrarSesion = () => { logout(); navigate('/acceso', { replace: true }); };

  // Auto-logout tras 5 minutos de inactividad → redirige al sitio público
  useInactividad(5, () => {
    logout();
    window.location.href = 'https://fundacionpanoramadecolores.org';
  }, !!user);

  const esActivo = (ruta) =>
    ruta === '/sede'
      ? location.pathname === '/sede'
      : location.pathname.startsWith(ruta);

  const toggleGrupo = (g) => setCollapsed(p => ({ ...p, [g]: !p[g] }));

  /* ── Contenido del sidebar ─────────────────────────────────────────────── */
  const SidebarContent = () => (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: BG,
    }}>

      {/* Logo */}
      <Box sx={{ px: 2.5, py: 2.5, borderBottom: `1px solid rgba(180,232,232,0.1)` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          {/* Barra decorativa bicolor */}
          <Box sx={{
            width: 5, height: 32, borderRadius: 1, flexShrink: 0,
            background: `linear-gradient(180deg, ${CYAN} 0%, #4E1B95 100%)`,
          }} />
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: WHITE, lineHeight: 1.25 }}>
              Fundación
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: CYAN, lineHeight: 1.25 }}>
              Panorama de Colores
            </Typography>
          </Box>
        </Box>
        <Typography sx={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.35)', mt: 0.8, pl: 0.5 }}>
          Panel Administrativo
        </Typography>
      </Box>

      {/* Usuario */}
      <Box sx={{
        px: 2, py: 1.5, mx: 1.5, my: 1.5,
        borderRadius: 2,
        bgcolor: 'rgba(180,232,232,0.07)',
        border: `1px solid rgba(180,232,232,0.12)`,
        display: 'flex', alignItems: 'center', gap: 1.5,
      }}>
        <Avatar src={user?.avatarUrl} sx={{ width: 34, height: 34, bgcolor: '#4E1B95', border: `2px solid ${CYAN}` }} />
        <Box sx={{ overflow: 'hidden', flex: 1 }}>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: WHITE }} noWrap>
            {user?.nombre}
          </Typography>
          <Typography sx={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.4)' }} noWrap>
            {user?.email}
          </Typography>
        </Box>
      </Box>

      {/* Menú con scroll */}
      <Box sx={{
        flex: 1, overflowY: 'auto', pb: 1,
        '&::-webkit-scrollbar': { width: '3px' },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: `rgba(180,232,232,0.25)`, borderRadius: '3px' },
        '&::-webkit-scrollbar-thumb:hover': { background: `rgba(180,232,232,0.5)` },
        scrollbarWidth: 'thin',
        scrollbarColor: `rgba(180,232,232,0.25) transparent`,
      }}>
        {MENU.map(({ grupo, items }) => (
          <Box key={grupo}>
            {/* Cabecera de grupo */}
            <Box
              onClick={() => toggleGrupo(grupo)}
              sx={{
                px: 2.5, pt: 2, pb: 0.5, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <GrupoLabel texto={grupo} />
              {collapsed[grupo]
                ? <ExpandMoreIcon sx={{ fontSize: 12, color: CYAN }} />
                : <ExpandLessIcon sx={{ fontSize: 12, color: CYAN }} />}
            </Box>

            <Collapse in={!collapsed[grupo]} timeout="auto">
              <List dense disablePadding>
                {items.map(({ label, icon, ruta }) => {
                  const activo = esActivo(ruta);
                  return (
                    <ListItemButton
                      key={ruta}
                      onClick={() => { navigate(ruta); setMobileOpen(false); }}
                      sx={{
                        mx: 1, mb: 0.2, borderRadius: 2,
                        bgcolor: activo ? 'rgba(180,232,232,0.12)' : 'transparent',
                        borderLeft: activo ? `3px solid ${CYAN}` : '3px solid transparent',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                        transition: 'background 0.15s',
                        gap: 1,
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: activo ? CYAN : 'rgba(255,255,255,0.55)', my: 0 }}>
                        {icon}
                      </ListItemIcon>
                      <ItemLabel texto={label} activo={activo} />
                    </ListItemButton>
                  );
                })}
              </List>
            </Collapse>
          </Box>
        ))}
      </Box>

      {/* Footer */}
      <Box sx={{ borderTop: `1px solid rgba(180,232,232,0.1)`, p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
        {/* Toggle dark/light */}
        <ListItemButton
          onClick={toggleMode}
          sx={{ borderRadius: 2, gap: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: mode === 'dark' ? '#fbbf24' : CYAN }}>
            {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </ListItemIcon>
          <FooterLabel texto={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'} color={WHITE} />
        </ListItemButton>

        {/* Cerrar sesión */}
        <ListItemButton
          onClick={handleCerrarSesion}
          sx={{ borderRadius: 2, gap: 1, '&:hover': { bgcolor: 'rgba(248,113,113,0.1)' } }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: '#f87171' }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <FooterLabel texto="Cerrar sesión" color="#f87171" />
        </ListItemButton>
      </Box>
    </Box>
  );

  /* ── Estructura del layout ─────────────────────────────────────────────── */
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>

      {/* Sidebar desktop */}
      <Drawer
        variant="permanent"
        sx={{
          width: SIDEBAR_WIDTH, flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box', border: 'none' },
        }}
      >
        <SidebarContent />
      </Drawer>

      {/* Sidebar móvil */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <SidebarContent />
      </Drawer>

      {/* Área de contenido */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* AppBar solo en móvil */}
        <AppBar position="static" elevation={0} sx={{ bgcolor: BG, display: { md: 'none' } }}>
          <Toolbar sx={{ minHeight: '52px !important' }}>
            <IconButton edge="start" sx={{ mr: 1, color: WHITE }} onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>
            <Typography sx={{ flex: 1, fontWeight: 700, color: WHITE, fontSize: '0.95rem' }}>
              Fundación Panorama de Colores
            </Typography>
            <Tooltip title={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
              <IconButton size="small" onClick={toggleMode} sx={{ color: CYAN }}>
                {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        {/* Contenido de la página activa */}
        <Box sx={{ flex: 1, bgcolor: 'background.default', overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
