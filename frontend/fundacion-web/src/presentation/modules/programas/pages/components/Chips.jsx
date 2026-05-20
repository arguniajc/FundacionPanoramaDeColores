import { Chip } from '@mui/material';

export function chipEstado(activo) {
  return activo
    ? <Chip label="Activo"   size="small" color="success" />
    : <Chip label="Inactivo" size="small" color="default" />;
}
