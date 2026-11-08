import { useMediaQuery } from '@mui/material';

/**
 * true en equipos con mouse/trackpad, false en pantallas táctiles. Úsalo para el `autoFocus`
 * del PRIMER campo de un formulario: en escritorio el cursor queda listo para escribir, y en
 * el celular no se abre el teclado encima del diálogo apenas se muestra.
 *
 *   const autoFocus = useAutoFocus();
 *   <TextField label="Nombre *" autoFocus={autoFocus} … />
 */
export function useAutoFocus() {
  return useMediaQuery('(pointer: fine)', { noSsr: true });
}
