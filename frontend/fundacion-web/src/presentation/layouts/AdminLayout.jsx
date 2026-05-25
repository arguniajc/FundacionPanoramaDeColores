// Layout del panel admin: AppBar superior (solo móvil), Drawer lateral con menú
// de módulos colapsables y área de contenido. Incluye auto-logout por inactividad.
import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon,
  AppBar, Toolbar, Typography, Avatar, IconButton, Collapse, Tooltip,
} from '@mui/material';
import MenuIcon              from '@mui/icons-material/Menu';
import LogoutIcon            from '@mui/icons-material/Logout';
import DashboardIcon         from '@mui/icons-material/Dashboard';
import ChildCareIcon         from '@mui/icons-material/ChildCare';
import MonetizationOnIcon    from '@mui/icons-material/MonetizationOn';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
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
import HowToRegIcon          from '@mui/icons-material/HowToReg';
import AccountTreeIcon        from '@mui/icons-material/AccountTree';
import { useAuth }           from '../../application/auth/AuthContext';
import { useThemeMode }      from '../../shared/theme/ThemeContext';
import { useConfiguracion }  from '../../shared/context/ConfiguracionContext';
import useInactividad        from '../../shared/hooks/useInactividad';
import usePermisos           from '../../shared/hooks/usePermisos';
import { LOGIN_URL }         from '../../shared/constants/routes';

const SIDEBAR_WIDTH = 260;

/** Luminancia relativa (0 = negro, 1 = blanco). Umbral 0.35 separa fondos claros de oscuros. */
function luminance(hex) {
  if (!hex?.startsWith('#') || hex.length < 7) return 0;
  const r = parseInt(hex.slice(1,3), 16) / 255;
  const g = parseInt(hex.slice(3,5), 16) / 255;
  const b = parseInt(hex.slice(5,7), 16) / 255;
  return 0.2126*r + 0.7152*g + 0.0722*b;
}

function hexToRgba(hex, a) {
  if (!hex?.startsWith('#') || hex.length < 7) return `rgba(0,0,0,${a})`;
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** Calcula el juego de colores del sidebar según luminancia del fondo */
function sidebarColors(bg, colorPrimario) {
  const claro = luminance(bg) > 0.35;
  const primo = colorPrimario || '#6735A6';
  return {
    claro,
    texto:        claro ? 'rgba(0,0,0,0.78)'  : '#ffffff',
    textoSubtle:  claro ? 'rgba(0,0,0,0.38)'  : 'rgba(255,255,255,0.35)',
    textoEmail:   claro ? 'rgba(0,0,0,0.45)'  : 'rgba(255,255,255,0.4)',
    acento:       claro ? primo               : '#B4E8E8',
    iconInactivo: claro ? 'rgba(0,0,0,0.40)'  : 'rgba(255,255,255,0.50)',
    activoBg:     hexToRgba(primo, claro ? 0.12 : 0.15),
    activoBorde:  claro ? primo               : '#B4E8E8',
    userCardBg:   claro ? 'rgba(0,0,0,0.04)'  : 'rgba(180,232,232,0.07)',
    userCardBrd:  claro ? 'rgba(0,0,0,0.10)'  : 'rgba(180,232,232,0.12)',
    hoverBg:      claro ? 'rgba(0,0,0,0.05)'  : 'rgba(255,255,255,0.06)',
    hoverLogout:  claro ? 'rgba(220,38,38,0.08)' : 'rgba(248,113,113,0.10)',
    divider:      claro ? 'rgba(0,0,0,0.08)'  : 'rgba(180,232,232,0.10)',
    scrollbar:    claro ? 'rgba(0,0,0,0.15)'  : 'rgba(180,232,232,0.25)',
    scrollbarHov: claro ? 'rgba(0,0,0,0.30)'  : 'rgba(180,232,232,0.50)',
    decorBar:     `linear-gradient(180deg, ${claro ? primo : '#B4E8E8'} 0%, ${primo} 100%)`,
    avatarBorder: claro ? primo               : '#B4E8E8',
    logoutColor:  '#ef4444',
    moonColor:    claro ? 'rgba(0,0,0,0.45)'  : '#B4E8E8',
    appBarText:   claro ? 'rgba(0,0,0,0.78)'  : '#ffffff',
  };
}

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
      { label: 'Beneficiarios',             icon: <ChildCareIcon />,         ruta: '/sede/beneficiarios',  modulo: 'beneficiarios' },
      { label: 'Donantes y Donaciones',     icon: <VolunteerActivismIcon />, ruta: '/sede/donaciones',     modulo: 'donaciones' },
      { label: 'Proyectos',                 icon: <FolderSpecialIcon />,     ruta: '/sede/proyectos',      modulo: 'programas' },
      { label: 'Inscripciones a proyectos', icon: <HowToRegIcon />,          ruta: '/sede/inscripciones',  modulo: 'inscripciones' },
      { label: 'Sedes',                     icon: <LocationOnIcon />,        ruta: '/sede/sedes',          modulo: 'sedes' },
      { label: 'Actividades',               icon: <EventNoteIcon />,         ruta: '/sede/actividades',    modulo: 'actividades' },
      { label: 'Voluntarios',               icon: <PeopleIcon />,            ruta: '/sede/voluntarios',    modulo: 'voluntarios' },
    ],
  },
  {
    grupo: 'RECURSOS',
    items: [
      { label: 'Talento Humano', icon: <BadgeIcon />,          ruta: '/sede/talento-humano', modulo: 'talento_humano' },
      { label: 'Organigrama',    icon: <AccountTreeIcon />,    ruta: '/sede/organigrama',    modulo: 'talento_humano' },
      { label: 'Contabilidad',   icon: <AccountBalanceIcon />, ruta: '/sede/contabilidad',   modulo: 'contabilidad' },
      { label: 'Inventario',     icon: <InventoryIcon />,      ruta: '/sede/inventario',     modulo: 'inventario' },
    ],
  },
  {
    grupo: 'REPORTES Y DOCS',
    items: [
      { label: 'Reportes',      icon: <AssessmentIcon />, ruta: '/sede/reportes',      modulo: 'reportes' },
      { label: 'Documentos',    icon: <FolderIcon />,     ruta: '/sede/documentos',    modulo: 'documentos' },
      { label: 'Log Descargas', icon: <DownloadIcon />,   ruta: '/sede/log-descargas', modulo: 'log_descargas' },
    ],
  },
  {
    grupo: 'SISTEMA',
    items: [
      { label: 'Seguridad',     icon: <SecurityIcon />,       ruta: '/sede/seguridad',     modulo: 'seguridad' },
      { label: 'Equipo',        icon: <ManageAccountsIcon />, ruta: '/sede/equipo',         modulo: 'equipo' },
      { label: 'Configuración', icon: <SettingsIcon />,       ruta: '/sede/configuracion',  modulo: 'configuracion' },
    ],
  },
];

// CRÍTICO: definido a nivel de módulo, NO dentro de AdminLayout.
// Si se definiera dentro de AdminLayout, React lo trataría como un tipo nuevo
// en cada render y desmontaría todo el árbol del sidebar — parpadeos y pérdida de scroll.
function SidebarContent({
  user, mode, toggleMode, location,
  collapsed, onToggleGrupo, onNavegar, onCerrarSesion,
  bg, sc,
}) {
  const { puedo } = usePermisos();
  const esActivo = (ruta) =>
    ruta === '/sede'
      ? location.pathname === '/sede'
      : location.pathname.startsWith(ruta);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: bg }}>

      <Box sx={{ px: 2.5, py: 2.5, borderBottom: `1px solid ${sc.divider}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box sx={{ width: 5, height: 32, borderRadius: 1, flexShrink: 0, background: sc.decorBar }} />
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: sc.texto, lineHeight: 1.25 }}>
              Fundación
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: sc.acento, lineHeight: 1.25 }}>
              Panorama de Colores
            </Typography>
          </Box>
        </Box>
        <Typography sx={{ fontSize: '0.63rem', color: sc.textoSubtle, mt: 0.8, pl: 0.5 }}>
          Panel Administrativo
        </Typography>
      </Box>

      <Box sx={{
        px: 2, py: 1.5, mx: 1.5, my: 1.5, borderRadius: 2,
        bgcolor: sc.userCardBg, border: `1px solid ${sc.userCardBrd}`,
        display: 'flex', alignItems: 'center', gap: 1.5,
      }}>
        <Avatar
          src={user?.avatarUrl}
          sx={{ width: 34, height: 34, bgcolor: 'var(--color-primario)', border: `2px solid ${sc.avatarBorder}` }}
        />
        <Box sx={{ overflow: 'hidden', flex: 1 }}>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: sc.texto }} noWrap>
            {user?.nombre}
          </Typography>
          <Typography sx={{ fontSize: '0.67rem', color: sc.textoEmail }} noWrap>
            {user?.email}
          </Typography>
        </Box>
      </Box>

      <Box sx={{
        flex: 1, overflowY: 'auto', pb: 1,
        '&::-webkit-scrollbar': { width: '3px' },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: sc.scrollbar, borderRadius: '3px' },
        '&::-webkit-scrollbar-thumb:hover': { background: sc.scrollbarHov },
        scrollbarWidth: 'thin',
        scrollbarColor: `${sc.scrollbar} transparent`,
      }}>
        {MENU.map(({ grupo, items }) => (
          <Box key={grupo}>
            <Box
              onClick={() => onToggleGrupo(grupo)}
              sx={{
                px: 2.5, pt: 2, pb: 0.5, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <Typography component="span" sx={{
                fontSize: '0.6rem', fontWeight: 800,
                letterSpacing: '0.14em', color: sc.acento, userSelect: 'none',
              }}>
                {grupo}
              </Typography>
              {collapsed[grupo]
                ? <ExpandMoreIcon sx={{ fontSize: 12, color: sc.acento }} />
                : <ExpandLessIcon sx={{ fontSize: 12, color: sc.acento }} />}
            </Box>

            <Collapse in={!collapsed[grupo]} timeout="auto">
              <List dense disablePadding>
                {items.filter(({ modulo }) => !modulo || puedo(modulo, 'ver')).map(({ label, icon, ruta }) => {
                  const activo = esActivo(ruta);
                  return (
                    <ListItemButton
                      key={ruta}
                      onClick={() => onNavegar(ruta)}
                      sx={{
                        mx: 1, mb: 0.2, borderRadius: 2, gap: 1,
                        bgcolor:    activo ? sc.activoBg  : 'transparent',
                        borderLeft: activo ? `3px solid ${sc.activoBorde}` : '3px solid transparent',
                        transition: 'background 0.15s',
                        '&:hover':  { bgcolor: sc.hoverBg },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: activo ? sc.activoBorde : sc.iconInactivo, my: 0 }}>
                        {icon}
                      </ListItemIcon>
                      <Typography component="span" sx={{
                        fontSize: '0.85rem',
                        fontWeight: activo ? 700 : 400,
                        color: activo ? sc.activoBorde : sc.texto,
                        lineHeight: 1,
                      }}>
                        {label}
                      </Typography>
                    </ListItemButton>
                  );
                })}
              </List>
            </Collapse>
          </Box>
        ))}
      </Box>

      <Box sx={{ borderTop: `1px solid ${sc.divider}`, p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
        <ListItemButton
          onClick={toggleMode}
          sx={{ borderRadius: 2, gap: 1, '&:hover': { bgcolor: sc.hoverBg } }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: mode === 'dark' ? '#fbbf24' : sc.moonColor }}>
            {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </ListItemIcon>
          <Typography component="span" sx={{ fontSize: '0.84rem', color: sc.texto }}>
            {mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </Typography>
        </ListItemButton>

        <ListItemButton
          onClick={onCerrarSesion}
          sx={{ borderRadius: 2, gap: 1, '&:hover': { bgcolor: sc.hoverLogout } }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: sc.logoutColor }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <Typography component="span" sx={{ fontSize: '0.84rem', color: sc.logoutColor }}>
            Cerrar sesión
          </Typography>
        </ListItemButton>
      </Box>
    </Box>
  );
}

export default function AdminLayout({ children }) {
  const { user, logout }                          = useAuth();
  const { mode, toggleMode }                      = useThemeMode();
  const { colorSidebar, colorOscuroSidebar, colorPrimario } = useConfiguracion();
  const navigate                                  = useNavigate();
  const location                                  = useLocation();
  const [mobileOpen, setMobileOpen]               = useState(false);
  const [collapsed,  setCollapsed]                = useState({});

  const BG = mode === 'dark'
    ? (colorOscuroSidebar || '#1B1035')
    : (colorSidebar       || '#F4E3C1');

  const sc = useMemo(() => sidebarColors(BG, colorPrimario), [BG, colorPrimario]);

  const handleCerrarSesion = useCallback(() => {
    logout();
    navigate('/acceso', { replace: true });
  }, [logout, navigate]);

  const handleNavegar = useCallback((ruta) => {
    navigate(ruta);
    setMobileOpen(false);
  }, [navigate]);

  const toggleGrupo = useCallback((g) =>
    setCollapsed(p => ({ ...p, [g]: !p[g] }))
  , []);

  useInactividad(60, () => {
    logout();
    window.location.href = LOGIN_URL;
  }, !!user);

  const sidebarProps = {
    user, mode, toggleMode, location,
    collapsed, bg: BG, sc,
    onToggleGrupo: toggleGrupo,
    onNavegar:     handleNavegar,
    onCerrarSesion: handleCerrarSesion,
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>

      <Drawer
        variant="permanent"
        sx={{
          width: SIDEBAR_WIDTH, flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box', border: 'none' },
        }}
      >
        <SidebarContent {...sidebarProps} />
      </Drawer>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <SidebarContent {...sidebarProps} />
      </Drawer>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        <AppBar position="static" elevation={0} sx={{ bgcolor: BG, display: { md: 'none' } }} style={{ backgroundColor: BG }}>
          <Toolbar sx={{ minHeight: '52px !important' }}>
            <IconButton edge="start" sx={{ mr: 1, color: sc.appBarText }} onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>
            <Typography sx={{ flex: 1, fontWeight: 700, color: sc.appBarText, fontSize: '0.95rem' }}>
              Fundación Panorama de Colores
            </Typography>
            <Tooltip title={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
              <IconButton size="small" onClick={toggleMode} sx={{ color: sc.moonColor }}>
                {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Box sx={{ flex: 1, bgcolor: 'background.default', overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
