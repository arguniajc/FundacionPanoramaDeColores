import { useState } from 'react';
import { beneficiariosRepository } from '@/infrastructure/repositories/beneficiariosRepository';

const INICIAL = { fase: 'idle', numero: '', existente: null };

/**
 * Pregunta al servidor si el número de documento ya está registrado
 * (POST /api/beneficiarios/verificar-documento → { existe, id, nombre }).
 *
 *   fase: 'idle' | 'verificando' | 'libre' | 'existe' | 'error'
 *   existente: { id, nombre } del beneficiario que ya lo tiene (fase 'existe')
 *
 * Al editar se pasa `excluirId` (el propio registro) para no encontrarse a sí mismo.
 * Si la consulta falla, la fase queda en 'error': no se muestra el check verde, pero tampoco
 * se bloquea el formulario (el servidor vuelve a revisar el duplicado al guardar).
 */
export function useVerificarDocumento({ excluirId } = {}) {
  const [estado, setEstado] = useState(INICIAL);

  const verificar = async numero => {
    const num = String(numero ?? '').trim();
    if (!num) { setEstado(INICIAL); return; }
    setEstado({ fase: 'verificando', numero: num, existente: null });
    let siguiente;
    try {
      const { data } = await beneficiariosRepository.verificarDoc(num, excluirId);
      siguiente = data?.existe
        ? { fase: 'existe', numero: num, existente: { id: data.id ?? null, nombre: data.nombre ?? '' } }
        : { fase: 'libre', numero: num, existente: null };
    } catch {
      siguiente = { fase: 'error', numero: num, existente: null };
    }
    // Si mientras tanto cambió el número, esta respuesta ya no aplica
    setEstado(prev => (prev.numero === num ? siguiente : prev));
  };

  const reiniciar = () => setEstado(INICIAL);

  return { ...estado, verificar, reiniciar };
}
