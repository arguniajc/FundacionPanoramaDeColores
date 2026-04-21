/**
 * useBeneficiarioActions
 * Caso de uso: mutaciones sobre beneficiarios (crear, editar, baja, reactivar).
 * Invalida caché y notifica a la página vía callback onExito.
 */
import { useState } from 'react';
import { beneficiariosRepository } from '../../infrastructure/repositories/beneficiariosRepository';
import { limpiarCache } from '../../infrastructure/cache/sessionCache';

export function useBeneficiarioActions({ onExito } = {}) {
  const [error, setError] = useState('');

  const ejecutar = async (fn, mensajeError) => {
    setError('');
    try {
      await fn();
      limpiarCache();
      onExito?.();
    } catch {
      setError(mensajeError);
    }
  };

  const crear = (datos) =>
    ejecutar(
      () => beneficiariosRepository.crear(datos),
      'No se pudo crear el beneficiario.'
    );

  const editar = (id, datos) =>
    ejecutar(
      () => beneficiariosRepository.editar(id, datos),
      'No se pudo actualizar el beneficiario.'
    );

  const darDeBaja = (id, motivo) =>
    ejecutar(
      () => beneficiariosRepository.baja(id, motivo),
      'No se pudo dar de baja al beneficiario.'
    );

  const reactivar = (id) =>
    ejecutar(
      () => beneficiariosRepository.reactivar(id),
      'No se pudo reactivar el beneficiario.'
    );

  return { crear, editar, darDeBaja, reactivar, error };
}
