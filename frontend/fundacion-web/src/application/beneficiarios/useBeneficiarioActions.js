/**
 * useBeneficiarioActions
 * Caso de uso: mutaciones sobre beneficiarios (crear, editar, baja, reactivar).
 * Invalida caché y notifica a la página vía callback onExito.
 */
import { useState } from 'react';
import { beneficiariosRepository } from '@/infrastructure/repositories/beneficiariosRepository';
import { limpiarCache } from '@/infrastructure/cache/sessionCache';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';

export function useBeneficiarioActions({ onExito } = {}) {
  const [error, setError] = useState('');

  const ejecutar = async (fn, accion) => {
    setError('');
    try {
      await fn();
      limpiarCache();
      onExito?.();
    } catch (err) {
      setError(mensajeErrorApi(err, { accion }));
    }
  };

  const crear = (datos) =>
    ejecutar(
      () => beneficiariosRepository.crear(datos),
      'crear el beneficiario'
    );

  const editar = (id, datos) =>
    ejecutar(
      () => beneficiariosRepository.editar(id, datos),
      'actualizar el beneficiario'
    );

  const darDeBaja = (id, motivo) =>
    ejecutar(
      () => beneficiariosRepository.baja(id, motivo),
      'dar de baja al beneficiario'
    );

  const reactivar = (id) =>
    ejecutar(
      () => beneficiariosRepository.reactivar(id),
      'reactivar el beneficiario'
    );

  return { crear, editar, darDeBaja, reactivar, error };
}
