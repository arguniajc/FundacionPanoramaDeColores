import { useCallback, useContext, useRef } from 'react';
import { ConfirmContext } from '@/shared/components/useConfirm';
import { accionAlCerrar, TEXTOS_DESCARTAR } from '@/shared/utils/cierreDialogo';

export { hayCambiosEn } from '@/shared/utils/cierreDialogo';

/**
 * Cierre de un diálogo con formulario: si hay cambios sin guardar pregunta
 * "¿Descartar los cambios?" (Seguir editando / Descartar); mientras guarda no se cierra.
 * Usa el diálogo global de useConfirm (ConfirmProvider); sin proveedor cae a window.confirm.
 *
 *   const [inicial] = useState(form);              // snapshot al abrir
 *   const hayCambios = hayCambiosEn(form, inicial);
 *   const { confirmarCierre } = useCerrarConCambios({ hayCambios, bloqueado: guardando, onCerrar: onClose });
 *
 *   <Dialog open={open} onClose={confirmarCierre}>   // backdrop y Esc preguntan
 *     …
 *     <AccionesDialogo onCancelar={confirmarCierre} onGuardar={guardar} guardando={guardando} />
 *   </Dialog>
 *
 * Si solo te interesan backdrop/Esc, no hace falta el hook: pasa `hayCambios` y `bloqueado`
 * a DialogResponsive y él lo usa por dentro.
 *
 * @param {{ hayCambios?: boolean, bloqueado?: boolean, onCerrar?: Function,
 *           titulo?: string, mensaje?: string }} opciones
 * @returns {{ confirmarCierre: (event?: any, reason?: string) => Promise<boolean> }}
 *   confirmarCierre resuelve true si se cerró. Llama a onCerrar(event, reason).
 */
export function useCerrarConCambios({
  hayCambios = false, bloqueado = false, onCerrar,
  titulo = TEXTOS_DESCARTAR.titulo, mensaje = TEXTOS_DESCARTAR.mensaje,
} = {}) {
  const confirm = useContext(ConfirmContext);
  const preguntando = useRef(false);

  const confirmarCierre = useCallback(async (event, reason) => {
    const accion = accionAlCerrar({ hayCambios, bloqueado, reason });
    if (accion === 'ignorar' || preguntando.current) return false;
    if (accion === 'confirmar') {
      preguntando.current = true;
      try {
        const ok = confirm
          ? await confirm(mensaje, titulo, {
            textoConfirmar: TEXTOS_DESCARTAR.textoConfirmar,
            textoCancelar:  TEXTOS_DESCARTAR.textoCancelar,
            enfocarCancelar: true,
          })
          : window.confirm(`${titulo}\n${mensaje}`);
        if (!ok) return false;
      } finally {
        preguntando.current = false;
      }
    }
    onCerrar?.(event, reason);
    return true;
  }, [hayCambios, bloqueado, onCerrar, confirm, titulo, mensaje]);

  return { confirmarCierre };
}
