/**
 * useSedes
 * Caso de uso: cargar, crear, editar, toggle y eliminar sedes y programas.
 */
import { useState, useEffect } from 'react';
import { sedesRepository } from '@/infrastructure/repositories/sedesRepository';
import { useAsyncData } from '@/shared/hooks/useAsyncData';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';

export function useSedes() {
  const [toast, setToast] = useState('');

  const {
    data: sedes, cargando, error, setError, ejecutar: cargar, setData: setSedes,
  } = useAsyncData(
    async () => (await sedesRepository.listar()).data,
    { inicial: [], errorMsg: 'No se pudieron cargar las sedes.' }
  );

  useEffect(() => { cargar(); }, [cargar]);

  // ── Sedes ────────────────────────────────────────────────────────────────

  const guardarSede = async (datos, idExistente) => {
    try {
      const { data } = idExistente
        ? await sedesRepository.editar(idExistente, datos)
        : await sedesRepository.crear(datos);
      setSedes(prev => {
        const existe = prev.find(s => s.id === data.id);
        return existe ? prev.map(s => s.id === data.id ? data : s) : [...prev, data];
      });
      setToast('Sede guardada correctamente');
      return true;
    } catch (err) {
      setError(mensajeErrorApi(err, { accion: 'guardar la sede' }));
      return false;
    }
  };

  const toggleSede = async (sede) => {
    try {
      const { data } = await sedesRepository.toggle(sede.id);
      setSedes(prev => prev.map(s => s.id === data.id ? data : s));
    } catch (err) { setError(mensajeErrorApi(err, { accion: 'cambiar el estado de la sede' })); }
  };

  const eliminarSede = async (id) => {
    try {
      await sedesRepository.eliminar(id);
      setSedes(prev => prev.filter(s => s.id !== id));
      setToast('Sede eliminada');
      return true;
    } catch (err) {
      setError(mensajeErrorApi(err, { accion: 'eliminar la sede', conflicto: 'No se pudo eliminar la sede. Puede que tenga programas activos.' }));
      return false;
    }
  };

  // ── Programas ────────────────────────────────────────────────────────────

  const guardarPrograma = async (datos, idExistente) => {
    try {
      const { data } = idExistente
        ? await sedesRepository.editarPrograma(idExistente, datos)
        : await sedesRepository.crearPrograma(datos);
      setSedes(prev => prev.map(s => {
        if (s.id !== data.sedeId) return s;
        const existe   = s.programas?.find(p => p.id === data.id);
        const programas = existe
          ? s.programas.map(p => p.id === data.id ? data : p)
          : [...(s.programas ?? []), data];
        return { ...s, programas };
      }));
      setToast('Programa guardado correctamente');
      return true;
    } catch (err) {
      setError(mensajeErrorApi(err, { accion: 'guardar el programa' }));
      return false;
    }
  };

  const togglePrograma = async (prog) => {
    try {
      const { data } = await sedesRepository.togglePrograma(prog.id);
      setSedes(prev => prev.map(s => {
        if (s.id !== data.sedeId) return s;
        return { ...s, programas: s.programas.map(p => p.id === data.id ? data : p) };
      }));
    } catch (err) { setError(mensajeErrorApi(err, { accion: 'cambiar el estado del programa' })); }
  };

  const eliminarPrograma = async (id) => {
    try {
      await sedesRepository.eliminarPrograma(id);
      setSedes(prev => prev.map(s => ({
        ...s,
        programas: s.programas?.filter(p => p.id !== id) ?? [],
      })));
      setToast('Programa eliminado');
      return true;
    } catch (err) {
      setError(mensajeErrorApi(err, { accion: 'eliminar el programa' }));
      return false;
    }
  };

  const actualizarPrograma = (data) => {
    setSedes(prev => prev.map(s => {
      if (s.id !== data.sedeId) return s;
      return { ...s, programas: s.programas.map(p => p.id === data.id ? data : p) };
    }));
  };

  const autorizarRepPrograma = async (id) => {
    try {
      const { data } = await sedesRepository.autorizarRepPrograma(id);
      actualizarPrograma(data);
      setToast('Representante legal autorizado en este proyecto');
      return true;
    } catch (err) {
      setError(mensajeErrorApi(err, { accion: 'autorizar al representante legal' }));
      return false;
    }
  };

  const revocarRepPrograma = async (id) => {
    try {
      const { data } = await sedesRepository.revocarRepPrograma(id);
      actualizarPrograma(data);
      setToast('Autorización revocada');
      return true;
    } catch (err) {
      setError(mensajeErrorApi(err, { accion: 'revocar la autorización' }));
      return false;
    }
  };

  return {
    sedes, cargando, error, toast, setToast, setError,
    guardarSede, toggleSede, eliminarSede,
    guardarPrograma, togglePrograma, eliminarPrograma,
    autorizarRepPrograma, revocarRepPrograma,
  };
}
