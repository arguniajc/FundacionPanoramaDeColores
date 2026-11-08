/**
 * CampoMoneda — valor en pesos con separador de miles es-CO mientras se escribe ("1.500.000").
 *
 * - Es un TextField type="text" con inputMode="numeric" (o "decimal" si se permiten decimales):
 *   teclado numérico en el celular y la rueda del mouse NO cambia el valor.
 * - onChange recibe el valor LIMPIO como string: '1500000' ('' si se borra; con decimales,
 *   punto decimal: '1500.5'). Así funciona directo con useValidacion + r.monto / r.numero
 *   y al enviar basta Number(form.monto).
 * - `value` acepta ese string limpio o un número (p. ej. el que llega de la API).
 * - El cursor no salta al final al reformatear.
 *
 *   <CampoMoneda label="Monto *" value={form.monto}
 *     onChange={v => set('monto', v)} {...v.props('monto')} />
 *   <CampoMoneda label="Tarifa por hora" decimales={2} value={form.tarifa} onChange={…} />
 *
 * Props: value, onChange(limpio), decimales = 0, simbolo = '$' ('' para quitarlo),
 *        label, size = 'small', fullWidth = true, y cualquier otra prop de TextField
 *        (error, helperText, onBlur, disabled, autoFocus, slotProps…).
 */
import { useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { InputAdornment, TextField } from '@mui/material';
import {
  aValorLimpio, formatearMoneda, limpiarMoneda, posicionCursor, significativosAntes,
} from '@/shared/utils/entradaCampos';

export default function CampoMoneda({
  value, onChange, decimales = 0, simbolo = '$',
  label, size = 'small', fullWidth = true, slotProps, inputRef, ...rest
}) {
  const ref = useRef(null);
  const cursorPendiente = useRef(null);
  const opciones = { decimales };
  const texto = formatearMoneda(value, opciones);

  // Expone el <input> a quien pase inputRef (p. ej. para enfocarlo).
  useImperativeHandle(inputRef, () => ref.current, []);

  const ubicarCursor = (textoVisible, significativos) => {
    const el = ref.current;
    if (!el || el.ownerDocument?.activeElement !== el) return;
    const pos = posicionCursor(textoVisible, significativos, opciones);
    el.setSelectionRange(pos, pos);
  };

  // Tras cada render con un valor nuevo, deja el cursor detrás de los mismos dígitos.
  useLayoutEffect(() => {
    if (cursorPendiente.current === null) return;
    ubicarCursor(texto, cursorPendiente.current);
    cursorPendiente.current = null;
  });

  const manejarCambio = e => {
    let crudo = e.target.value;
    const caret = e.target.selectionStart ?? crudo.length;
    // Con decimales, un '.' recién escrito (teclados que no tienen coma) se toma como coma decimal.
    if (decimales > 0 && !crudo.includes(',') && e.nativeEvent?.data === '.' && crudo[caret - 1] === '.') {
      crudo = `${crudo.slice(0, caret - 1)},${crudo.slice(caret)}`;
    }
    const significativos = significativosAntes(crudo, caret, opciones);
    const limpio = limpiarMoneda(crudo, opciones);
    if (limpio === aValorLimpio(value, opciones)) {
      // Nada cambió (p. ej. se escribió una letra): React repone el texto; reubicar el cursor.
      requestAnimationFrame(() => ubicarCursor(formatearMoneda(limpio, opciones), significativos));
    } else {
      cursorPendiente.current = significativos;
    }
    onChange?.(limpio);
  };

  return (
    <TextField
      {...rest}
      label={label}
      size={size}
      fullWidth={fullWidth}
      type="text"
      value={texto}
      onChange={manejarCambio}
      inputRef={ref}
      slotProps={{
        ...slotProps,
        input: {
          ...(simbolo ? { startAdornment: <InputAdornment position="start">{simbolo}</InputAdornment> } : {}),
          ...slotProps?.input,
        },
        htmlInput: {
          inputMode: decimales > 0 ? 'decimal' : 'numeric',
          autoComplete: 'off',
          ...slotProps?.htmlInput,
        },
      }}
    />
  );
}
