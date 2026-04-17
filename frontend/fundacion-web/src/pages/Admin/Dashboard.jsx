import { Box, Typography, Grid, Card, CardActionArea } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ChildCareIcon        from '@mui/icons-material/ChildCare';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import MonetizationOnIcon   from '@mui/icons-material/MonetizationOn';
import FolderSpecialIcon    from '@mui/icons-material/FolderSpecial';
import InventoryIcon        from '@mui/icons-material/Inventory';
import AssessmentIcon       from '@mui/icons-material/Assessment';
import { useAuth }      from '../../contexts/AuthContext';
import { useThemeMode } from '../../contexts/ThemeContext';

const MODULOS = [
  {
    label: 'Beneficiarios',
    desc:  'Niños inscritos en la fundación',
    icon:  <ChildCareIcon sx={{ fontSize: 36 }} />,
    grad:  'linear-gradient(135deg, #4E1B95 0%, #7c3aed 100%)',
    ruta:  '/sede/beneficiarios',
  },
  {
    label: 'Donantes',
    desc:  'Personas y empresas que apoyan',
    icon:  <VolunteerActivismIcon sx={{ fontSize: 36 }} />,
    grad:  'linear-gradient(135deg, #2D984F 0%, #16a34a 100%)',
    ruta:  '/sede/donantes',
  },
  {
    label: 'Donaciones',
    desc:  'Registro de aportes recibidos',
    icon:  <MonetizationOnIcon sx={{ fontSize: 36 }} />,
    grad:  'linear-gradient(135deg, #F59D1E 0%, #d97706 100%)',
    ruta:  '/sede/donaciones',
  },
  {
    label: 'Proyectos',
    desc:  'Programas y proyectos activos',
    icon:  <FolderSpecialIcon sx={{ fontSize: 36 }} />,
    grad:  'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    ruta:  '/sede/proyectos',
  },
  {
    label: 'Inventario',
    desc:  'Control de bienes y materiales',
    icon:  <InventoryIcon sx={{ fontSize: 36 }} />,
    grad:  'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    ruta:  '/sede/inventario',
  },
  {
    label: 'Reportes',
    desc:  'Informes y estadísticas',
    icon:  <AssessmentIcon sx={{ fontSize: 36 }} />,
    grad:  'linear-gradient(135deg, #B4E8E8 0%, #0891b2 100%)',
    ruta:  '/sede/reportes',
  },
];

export default function Dashboard() {
  const { user }  = useAuth();
  const { mode }  = useThemeMode();
  const navigate  = useNavigate();
  const hora      = new Date().getHours();
  const saludo    = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>

      {/* Saludo */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }} gutterBottom>
          {saludo}, {user?.nombre?.split(' ')[0]}
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          Bienvenido al panel administrativo · Fundación Panorama de Colores
        </Typography>
      </Box>

      {/* Separador con acento */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box sx={{ width: 4, height: 22, borderRadius: 1, bgcolor: '#4E1B95' }} />
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
          Acceso rápido
        </Typography>
      </Box>

      {/* Cards con fondo de color — texto siempre blanco */}
      <Grid container spacing={2.5}>
        {MODULOS.map(({ label, desc, icon, grad, ruta }) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={label}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                height: '100%',
                transition: 'transform 0.18s, box-shadow 0.18s',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' },
              }}
            >
              <CardActionArea
                onClick={() => navigate(ruta)}
                sx={{
                  background: grad,
                  p: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                {/* Icono en círculo semitransparente */}
                <Box sx={{
                  width: 56, height: 56, borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#ffffff', mb: 2,
                }}>
                  {icon}
                </Box>

                {/* Texto — siempre blanco sobre el gradiente de color */}
                <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff', lineHeight: 1.2 }}>
                  {label}
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
                  {desc}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
