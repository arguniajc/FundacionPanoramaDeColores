// Layout del panel: menú lateral (expandido, compacto u oculto, a elección del usuario),
// barra superior con el módulo actual, alertas, modo oscuro y menú de usuario.
// ControlSesion renueva la sesión y avisa antes de cerrarla.
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, AppBar, Toolbar, Typography, Avatar,
  IconButton, Collapse, Tooltip, Badge, Popover, Menu, MenuItem, Divider, InputBase,
  useMediaQuery, Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon              from '@mui/icons-material/Menu';
import MenuOpenIcon          from '@mui/icons-material/MenuOpen';
import LogoutIcon            from '@mui/icons-material/Logout';
import DashboardIcon         from '@mui/icons-material/Dashboard';
import ChildCareIcon         from '@mui/icons-material/ChildCare';
import EscalatorWarningIcon  from '@mui/icons-material/EscalatorWarning';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import FolderSpecialIcon     from '@mui/icons-material/FolderSpecial';
import EventNoteIcon         from '@mui/icons-material/EventNote';
import PeopleIcon            from '@mui/icons-material/People';
import Diversity3Icon        from '@mui/icons-material/Diversity3';
import BadgeIcon             from '@mui/icons-material/Badge';
import AccountBalanceIcon    from '@mui/icons-material/AccountBalance';
import InventoryIcon         from '@mui/icons-material/Inventory2';
import AssessmentIcon        from '@mui/icons-material/Assessment';
import FolderIcon            from '@mui/icons-material/Folder';
import SecurityIcon          from '@mui/icons-material/Security';
import ManageAccountsIcon    from '@mui/icons-material/ManageAccounts';
import SettingsIcon          from '@mui/icons-material/Settings';
import ExpandLessIcon        from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon        from '@mui/icons-material/ExpandMore';
import DarkModeIcon          from '@mui/icons-material/DarkModeOutlined';
import LightModeIcon         from '@mui/icons-material/LightModeOutlined';
import DownloadIcon          from '@mui/icons-material/Download';
import LocationOnIcon        from '@mui/icons-material/LocationOn';
import HowToRegIcon          from '@mui/icons-material/HowToReg';
import AccountTreeIcon       from '@mui/icons-material/AccountTree';
import NotificationsIcon     from '@mui/icons-material/NotificationsNoneOutlined';
import WarningAmberIcon      from '@mui/icons-material/WarningAmber';
import InfoIcon              from '@mui/icons-material/InfoOutlined';
import ReportProblemIcon     from '@mui/icons-material/ReportProblemOutlined';
import SearchIcon            from '@mui/icons-material/Search';
import KeyboardDoubleArrowLeftIcon  from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import { useAuth } from '@/application/auth/useAuth';
import { useThemeMode } from '@/shared/theme/useThemeMode';
import { useConfiguracion } from '@/shared/context/useConfiguracion';
import { SIDEBAR, colorEstado } from '@/shared/theme/paleta';
import ControlSesion         from '@/shared/components/ControlSesion';
import usePermisos           from '@/shared/hooks/usePermisos';
import { useAlertas }        from '@/shared/hooks/useAlertas';

const ANCHO_EXPANDIDO = 264;
const ANCHO_COMPACTO  = 76;
const VISTA_KEY  = 'sidebarVista';       // 'expandido' | 'compacto' | 'oculto'
const ULTIMA_KEY = 'sidebarUltimaVista'; // 'expandido' | 'compacto'

const NIVEL_TONO = { warning: 'aviso', info: 'info', error: 'error' };
const NIVEL_ICON = {
  warning: <WarningAmberIcon sx={{ fontSize: 16 }} />,
  info:    <InfoIcon         sx={{ fontSize: 16 }} />,
  error:   <ReportProblemIcon sx={{ fontSize: 16 }} />,
};

const MODULO_RUTA = {
  talento_humano: '/sede/talento-humano',
  inventario:     '/sede/inventario',
};

const ROL_LABEL = {
  administrador: 'Administrador', representante_legal: 'Representante legal', sistemas: 'Sistemas',
  coordinador_programas: 'Coordinación de programas', trabajador_social: 'Trabajo social',
};

const MENU = [
  {
    grupo: 'Principal',
    items: [
      { label: 'Inicio', icon: <DashboardIcon />, ruta: '/sede' },
    ],
  },
  {
    grupo: 'Gestión social',
    items: [
      {
        label: 'Beneficiarios', icon: <Diversity3Icon />, modulo: 'beneficiarios',
        subItems: [
          { label: 'Niños',   icon: <ChildCareIcon />,        ruta: '/sede/beneficiarios' },
          { label: 'Adultos', icon: <EscalatorWarningIcon />, ruta: '/sede/adultos' },
        ],
      },
      { label: 'Proyectos',     icon: <FolderSpecialIcon />, ruta: '/sede/proyectos',     modulo: 'programas' },
      { label: 'Inscripciones', icon: <HowToRegIcon />,      ruta: '/sede/inscripciones', modulo: 'inscripciones' },
      { label: 'Actividades',   icon: <EventNoteIcon />,     ruta: '/sede/actividades',   modulo: 'actividades' },
      { label: 'Sedes',         icon: <LocationOnIcon />,    ruta: '/sede/sedes',         modulo: 'sedes' },
      { label: 'Voluntarios',   icon: <PeopleIcon />,        ruta: '/sede/voluntarios',   modulo: 'voluntarios' },
    ],
  },
  {
    grupo: 'Recursos',
    items: [
      { label: 'Donaciones',     icon: <VolunteerActivismIcon />, ruta: '/sede/donaciones',     modulo: 'donaciones' },
      { label: 'Contabilidad',   icon: <AccountBalanceIcon />,    ruta: '/sede/contabilidad',   modulo: 'contabilidad' },
      { label: 'Inventario',     icon: <InventoryIcon />,         ruta: '/sede/inventario',     modulo: 'inventario' },
      { label: 'Talento humano', icon: <BadgeIcon />,             ruta: '/sede/talento-humano', modulo: 'talento_humano' },
      { label: 'Organigrama',    icon: <AccountTreeIcon />,       ruta: '/sede/organigrama',    modulo: 'talento_humano' },
    ],
  },
  {
    grupo: 'Informes',
    items: [
      { label: 'Reportes',          icon: <AssessmentIcon />, ruta: '/sede/reportes',      modulo: 'reportes' },
      { label: 'Documentos',        icon: <FolderIcon />,     ruta: '/sede/documentos',    modulo: 'documentos' },
      { label: 'Log de descargas',  icon: <DownloadIcon />,   ruta: '/sede/log-descargas', modulo: 'log_descargas' },
    ],
  },
  {
    grupo: 'Sistema',
    items: [
      { label: 'Seguridad',     icon: <SecurityIcon />,       ruta: '/sede/seguridad',    modulo: 'seguridad' },
      { label: 'Equipo',        icon: <ManageAccountsIcon />, ruta: '/sede/equipo',       modulo: 'equipo' },
      { label: 'Configuración', icon: <SettingsIcon />,       ruta: '/sede/configuracion', modulo: 'configuracion' },
    ],
  },
];

/** Luminancia relativa (0 negro – 1 blanco) para decidir el contraste de un fondo personalizado. */
function luminancia(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex ?? '')) return 0;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Colores del menú: los de la paleta; si la fundación eligió otro fondo en Configuración
 * se respeta y, si es claro, el texto pasa a oscuro para mantener contraste.
 */
function coloresSidebar(modo, fondoConfig) {
  const base = SIDEBAR[modo];
  if (!fondoConfig || fondoConfig.toLowerCase() === base.fondo.toLowerCase()) return base;
  if (luminancia(fondoConfig) <= 0.45) return { ...base, fondo: fondoConfig };
  return {
    fondo: fondoConfig, texto: 'rgba(16,24,40,0.86)', textoTenue: 'rgba(16,24,40,0.5)',
    grupo: 'rgba(16,24,40,0.5)', icono: 'rgba(16,24,40,0.55)', hover: 'rgba(16,24,40,0.06)',
    activoFondo: 'rgba(91,43,179,0.12)', activoTexto: '#43208A', activoIcono: '#5B2BB3', activoBarra: '#5B2BB3',
    borde: 'rgba(16,24,40,0.08)', buscador: 'rgba(16,24,40,0.05)',
  };
}

const normalizar = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const esRutaActiva = (pathname, ruta) =>
  ruta === '/sede' ? pathname === '/sede' : pathname.startsWith(ruta);

/** Grupo y nombre del módulo de la ruta actual (para la barra superior). */
function moduloActual(pathname) {
  for (const { grupo, items } of MENU)
    for (const it of items) {
      if (it.subItems) {
        const sub = it.subItems.find(s => esRutaActiva(pathname, s.ruta));
        if (sub) return { grupo, titulo: `${it.label} · ${sub.label}` };
      } else if (esRutaActiva(pathname, it.ruta)) return { grupo, titulo: it.label };
    }
  return { grupo: '', titulo: 'Panel' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel de alertas
// ─────────────────────────────────────────────────────────────────────────────
function AlertasPanel({ alertas, onNavegar, onClose, modo }) {
  return (
    <Box sx={{ p: 1.5, width: 320, maxWidth: '90vw' }}>
      <Typography fontWeight={700} fontSize="0.85rem" mb={1}>Alertas</Typography>
      {alertas.length === 0 ? (
        <Typography fontSize="0.8rem" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No hay alertas activas
        </Typography>
      ) : alertas.map((a, i) => {
        const tono = colorEstado(NIVEL_TONO[a.nivel] ?? 'neutro', modo);
        const ruta = MODULO_RUTA[a.modulo];
        return (
          <Box key={i}
            onClick={() => { if (ruta) { onNavegar(ruta); onClose(); } }}
            sx={{
              display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.75, px: 1.25, py: 1, borderRadius: 1.5,
              bgcolor: tono.fondo, color: tono.texto, cursor: ruta ? 'pointer' : 'default',
              '&:hover': ruta ? { filter: 'brightness(0.97)' } : {},
            }}>
            <Box sx={{ mt: '1px', flexShrink: 0 }}>{NIVEL_ICON[a.nivel]}</Box>
            <Typography fontSize="0.8rem" sx={{ flex: 1 }}>{a.mensaje}</Typography>
          </Box>
        );
      })}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ítem del menú. Definido a nivel de módulo (no dentro del layout) para que React
// no desmonte el árbol del menú en cada render (parpadeo y pérdida de scroll).
// ─────────────────────────────────────────────────────────────────────────────
function ItemMenu({ label, icon, activo, compacto, sc, badge, onClick, sangria = false, sufijo }) {
  const boton = (
    <ListItemButton
      onClick={onClick}
      aria-current={activo ? 'page' : undefined}
      sx={{
        position: 'relative', mx: 1, mb: 0.25, minHeight: 40, borderRadius: 2,
        justifyContent: compacto ? 'center' : 'flex-start',
        px: compacto ? 0 : 1.5, pl: compacto ? 0 : (sangria ? 4.5 : 1.5),
        bgcolor: activo ? sc.activoFondo : 'transparent',
        '&:hover': { bgcolor: activo ? sc.activoFondo : sc.hover },
        '&::before': activo && !compacto ? {
          content: '""', position: 'absolute', left: -8, top: 8, bottom: 8, width: 3,
          borderRadius: '0 3px 3px 0', bgcolor: sc.activoBarra,
        } : {},
      }}
    >
      <ListItemIcon sx={{
        minWidth: 0, mr: compacto ? 0 : 1.5, justifyContent: 'center',
        color: activo ? sc.activoIcono : sc.icono, '& svg': { fontSize: sangria ? 19 : 21 },
      }}>
        <Badge badgeContent={badge || null} color="error" overlap="circular"
          sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16, p: 0 } }}>
          {icon}
        </Badge>
      </ListItemIcon>
      {!compacto && (
        <Typography component="span" noWrap sx={{
          flex: 1, fontSize: '0.875rem', fontWeight: activo ? 600 : 500,
          color: activo ? sc.activoTexto : sc.texto,
        }}>
          {label}
        </Typography>
      )}
      {!compacto && sufijo}
    </ListItemButton>
  );
  return compacto ? <Tooltip title={label} placement="right">{boton}</Tooltip> : boton;
}

function SidebarContent({ compacto, sc, pathname, alertas, onNavegar, onAlternarCompacto, mostrarAlternar, nombreFundacion }) {
  const { puedo } = usePermisos();
  const [busqueda, setBusqueda] = useState('');
  const [subAbierto, setSubAbierto] = useState({});

  const porModulo = modulo =>
    modulo ? alertas.filter(a => a.modulo === modulo).reduce((s, a) => s + (a.valor ?? 0), 0) : 0;

  // Filtra por permisos y por el texto del buscador
  const grupos = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return MENU.map(({ grupo, items }) => ({
      grupo,
      items: items
        .filter(({ modulo }) => !modulo || puedo(modulo, 'ver'))
        .map(it => {
          if (!q) return it;
          if (it.subItems) {
            const subs = normalizar(it.label).includes(q) ? it.subItems : it.subItems.filter(s => normalizar(s.label).includes(q));
            return subs.length ? { ...it, subItems: subs } : null;
          }
          return normalizar(it.label).includes(q) ? it : null;
        })
        .filter(Boolean),
    })).filter(g => g.items.length > 0);
  }, [busqueda, puedo]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: sc.fondo, color: sc.texto }}>
      {/* Marca */}
      <Box sx={{
        height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1.25,
        px: compacto ? 0 : 2, justifyContent: compacto ? 'center' : 'flex-start',
        borderBottom: `1px solid ${sc.borde}`,
      }}>
        <Box component="img" src={`${import.meta.env.BASE_URL}logo.png`} alt=""
          sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#fff', p: '3px', objectFit: 'contain', flexShrink: 0 }} />
        {!compacto && (
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 800, fontSize: '0.92rem', lineHeight: 1.2, color: sc.activoTexto }}>
              {nombreFundacion || 'Fundación Panorama de Colores'}
            </Typography>
            <Typography noWrap sx={{ fontSize: '0.7rem', color: sc.textoTenue }}>Sistema de gestión</Typography>
          </Box>
        )}
      </Box>

      {/* Buscador de módulos */}
      {!compacto && (
        <Box sx={{ px: 1.5, pt: 1.5 }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1, px: 1.25, height: 36, borderRadius: 2,
            bgcolor: sc.buscador, border: `1px solid ${sc.borde}`,
          }}>
            <SearchIcon sx={{ fontSize: 18, color: sc.textoTenue }} />
            <InputBase
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar módulo…" inputProps={{ 'aria-label': 'Buscar módulo' }}
              sx={{ flex: 1, fontSize: '0.84rem', color: sc.texto, '& input::placeholder': { color: sc.textoTenue, opacity: 1 } }}
            />
          </Box>
        </Box>
      )}

      {/* Módulos */}
      <Box component="nav" aria-label="Módulos" sx={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1,
        scrollbarWidth: 'thin', scrollbarColor: `${sc.borde} transparent`,
        '&::-webkit-scrollbar-thumb': { backgroundColor: sc.borde },
      }}>
        {grupos.length === 0 && (
          <Typography sx={{ px: 2.5, py: 2, fontSize: '0.8rem', color: sc.textoTenue }}>Sin resultados</Typography>
        )}
        {grupos.map(({ grupo, items }, gi) => (
          <Box key={grupo} sx={{ mb: 0.5 }}>
            {compacto
              ? gi > 0 && <Divider sx={{ mx: 2, my: 1, borderColor: sc.borde }} />
              : (
                <Typography sx={{
                  px: 2.5, pt: gi === 0 ? 0.5 : 1.5, pb: 0.75, fontSize: '0.68rem', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', color: sc.grupo,
                }}>
                  {grupo}
                </Typography>
              )}
            <List dense disablePadding>
              {items.map(({ label, icon, ruta, modulo, subItems }) => {
                if (!subItems) {
                  return (
                    <ItemMenu key={ruta} label={label} icon={icon} compacto={compacto} sc={sc}
                      activo={esRutaActiva(pathname, ruta)} badge={porModulo(modulo)} onClick={() => onNavegar(ruta)} />
                  );
                }
                // En compacto los submódulos se muestran como íconos propios
                if (compacto) {
                  return subItems.map(s => (
                    <ItemMenu key={s.ruta} label={`${label} · ${s.label}`} icon={s.icon} compacto sc={sc}
                      activo={esRutaActiva(pathname, s.ruta)} onClick={() => onNavegar(s.ruta)} />
                  ));
                }
                const algunoActivo = subItems.some(s => esRutaActiva(pathname, s.ruta));
                const abierto = busqueda ? true : (subAbierto[label] ?? algunoActivo);
                return (
                  <Box key={label}>
                    <ItemMenu label={label} icon={icon} sc={sc} activo={algunoActivo && !abierto}
                      badge={porModulo(modulo)}
                      onClick={() => setSubAbierto(p => ({ ...p, [label]: !abierto }))}
                      sufijo={abierto
                        ? <ExpandLessIcon sx={{ fontSize: 18, color: sc.textoTenue }} />
                        : <ExpandMoreIcon sx={{ fontSize: 18, color: sc.textoTenue }} />} />
                    <Collapse in={abierto} timeout="auto">
                      <List dense disablePadding>
                        {subItems.map(s => (
                          <ItemMenu key={s.ruta} label={s.label} icon={s.icon} sc={sc} sangria
                            activo={esRutaActiva(pathname, s.ruta)} onClick={() => onNavegar(s.ruta)} />
                        ))}
                      </List>
                    </Collapse>
                  </Box>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      {/* Contraer / expandir (solo escritorio) */}
      {mostrarAlternar && (
        <Box sx={{ borderTop: `1px solid ${sc.borde}`, p: 1 }}>
          <ItemMenu
            label={compacto ? 'Expandir menú' : 'Contraer menú'}
            icon={compacto ? <KeyboardDoubleArrowRightIcon /> : <KeyboardDoubleArrowLeftIcon />}
            compacto={compacto} sc={sc} onClick={onAlternarCompacto} />
        </Box>
      )}
    </Box>
  );
}

function leer(clave, validos, porDefecto) {
  try {
    const v = localStorage.getItem(clave);
    return validos.includes(v) ? v : porDefecto;
  } catch { return porDefecto; }
}
function guardar(clave, valor) {
  try { localStorage.setItem(clave, valor); } catch { /* solo se pierde la preferencia */ }
}

export default function AdminLayout({ children }) {
  const { user, rol, logout }      = useAuth();
  const { mode, toggleMode }       = useThemeMode();
  const { colorSidebar, colorOscuroSidebar, nombreFundacion } = useConfiguracion();
  const theme                      = useTheme();
  const escritorio                 = useMediaQuery(theme.breakpoints.up('md'));
  const navigate                   = useNavigate();
  const { pathname }               = useLocation();
  const { alertas, totalAlertas }  = useAlertas();

  // Escritorio: vista actual y la última visible (a la que vuelve al mostrar el menú)
  const [vista, setVista] = useState(() => leer(VISTA_KEY, ['expandido', 'compacto', 'oculto'], 'expandido'));
  const [ultimaVisible, setUltimaVisible] = useState(() => leer(ULTIMA_KEY, ['expandido', 'compacto'], 'expandido'));
  const [movilAbierto, setMovilAbierto] = useState(false);     // celular/tablet
  const [anclaAlertas, setAnclaAlertas] = useState(null);
  const [anclaUsuario, setAnclaUsuario] = useState(null);

  const sc = useMemo(
    () => coloresSidebar(mode, mode === 'dark' ? colorOscuroSidebar : colorSidebar),
    [mode, colorSidebar, colorOscuroSidebar],
  );

  const cambiarVista = useCallback(v => {
    setVista(v);
    guardar(VISTA_KEY, v);
    if (v !== 'oculto') { setUltimaVisible(v); guardar(ULTIMA_KEY, v); }
  }, []);

  // ☰: en escritorio oculta/muestra el menú; en celular abre el menú deslizable
  const alternarMenu = useCallback(() => {
    if (!escritorio) { setMovilAbierto(true); return; }
    cambiarVista(vista === 'oculto' ? ultimaVisible : 'oculto');
  }, [escritorio, vista, ultimaVisible, cambiarVista]);

  // Atajo Ctrl/Cmd + B para ocultar o mostrar el menú
  useEffect(() => {
    const alPresionar = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); alternarMenu(); }
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [alternarMenu]);

  const handleNavegar = useCallback(ruta => { navigate(ruta); setMovilAbierto(false); }, [navigate]);
  const handleCerrarSesion = useCallback(() => {
    setAnclaUsuario(null);
    logout();
    navigate('/acceso', { replace: true });
  }, [logout, navigate]);

  const compacto = escritorio && vista === 'compacto';
  const anchoEscritorio = vista === 'oculto' ? 0 : (compacto ? ANCHO_COMPACTO : ANCHO_EXPANDIDO);
  const { grupo, titulo } = moduloActual(pathname);

  const props = {
    sc, pathname, alertas, onNavegar: handleNavegar, nombreFundacion,
    onAlternarCompacto: () => cambiarVista(compacto ? 'expandido' : 'compacto'),
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Renueva la sesión de quien está activo y avisa antes de cerrarla por inactividad */}
      <ControlSesion />

      {/* Menú en escritorio: expandido, compacto u oculto */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: anchoEscritorio, flexShrink: 0,
          transition: theme.transitions.create('width', { duration: theme.transitions.duration.shorter }),
          '& .MuiDrawer-paper': {
            width: anchoEscritorio, overflowX: 'hidden', border: 'none', boxSizing: 'border-box',
            transition: theme.transitions.create('width', { duration: theme.transitions.duration.shorter }),
          },
        }}
      >
        {vista !== 'oculto' && <SidebarContent {...props} compacto={compacto} mostrarAlternar />}
      </Drawer>

      {/* Menú en celular/tablet: deslizable */}
      <Drawer
        variant="temporary" open={movilAbierto} onClose={() => setMovilAbierto(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: ANCHO_EXPANDIDO, border: 'none' } }}
      >
        <SidebarContent {...props} compacto={false} mostrarAlternar={false} />
      </Drawer>

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Barra superior */}
        <AppBar position="sticky" sx={{
          bgcolor: 'background.paper', color: 'text.primary',
          borderBottom: 1, borderColor: 'divider', zIndex: theme.zIndex.drawer - 1,
        }}>
          <Toolbar sx={{ minHeight: { xs: 56, md: 64 }, gap: 1, px: { xs: 1, sm: 2 } }}>
            <Tooltip title={escritorio ? (vista === 'oculto' ? 'Mostrar menú (Ctrl+B)' : 'Ocultar menú (Ctrl+B)') : 'Menú'}>
              <IconButton onClick={alternarMenu} aria-label="Mostrar u ocultar el menú" edge="start">
                {escritorio && vista !== 'oculto' ? <MenuOpenIcon /> : <MenuIcon />}
              </IconButton>
            </Tooltip>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              {grupo && (
                <Typography noWrap sx={{ fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.2, display: { xs: 'none', sm: 'block' } }}>
                  {grupo}
                </Typography>
              )}
              <Typography noWrap component="h1" sx={{ fontWeight: 700, fontSize: { xs: '1rem', md: '1.05rem' }, lineHeight: 1.3 }}>
                {titulo}
              </Typography>
            </Box>

            <Tooltip title={totalAlertas > 0 ? `${totalAlertas} alerta(s)` : 'Sin alertas'}>
              <IconButton onClick={e => setAnclaAlertas(e.currentTarget)} aria-label="Alertas">
                <Badge badgeContent={totalAlertas || null} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title={mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
              <IconButton onClick={toggleMode} aria-label="Cambiar modo de color">
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Mi cuenta">
              <IconButton onClick={e => setAnclaUsuario(e.currentTarget)} aria-label="Mi cuenta" sx={{ p: 0.5, ml: 0.5 }}>
                <Avatar src={user?.avatarUrl} alt={user?.nombre}
                  sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: '0.9rem' }}>
                  {(user?.nombre || '?').charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Popover
          open={Boolean(anclaAlertas)} anchorEl={anclaAlertas} onClose={() => setAnclaAlertas(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { mt: 1, borderRadius: 2 } } }}
        >
          <AlertasPanel alertas={alertas} modo={mode} onNavegar={handleNavegar} onClose={() => setAnclaAlertas(null)} />
        </Popover>

        <Menu
          open={Boolean(anclaUsuario)} anchorEl={anclaUsuario} onClose={() => setAnclaUsuario(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { mt: 1, minWidth: 240, borderRadius: 2 } } }}
        >
          <Box sx={{ px: 2, py: 1.25 }}>
            <Typography fontWeight={700} fontSize="0.9rem" noWrap>{user?.nombre}</Typography>
            <Typography fontSize="0.78rem" color="text.secondary" noWrap>{user?.email}</Typography>
            {rol && <Chip size="small" label={ROL_LABEL[rol] ?? rol} sx={{ mt: 1, height: 22 }} />}
          </Box>
          <Divider />
          <MenuItem onClick={() => { toggleMode(); setAnclaUsuario(null); }}>
            <ListItemIcon>{mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}</ListItemIcon>
            {mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </MenuItem>
          <MenuItem onClick={handleCerrarSesion} sx={{ color: 'error.main' }}>
            <ListItemIcon sx={{ color: 'inherit' }}><LogoutIcon fontSize="small" /></ListItemIcon>
            Cerrar sesión
          </MenuItem>
        </Menu>

        {/* overflowX: una tabla ancha se desplaza dentro del contenido, sin mover la barra ni la página */}
        <Box component="main" sx={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
