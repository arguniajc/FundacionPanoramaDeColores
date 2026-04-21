/**
 * useSedes
 * Caso de uso: cargar, crear, editar, toggle y eliminar sedes y programas.
 */
import { useState, useEffect, useCallback } from 'react';
import { sedesRepository } from '../../infrastructure/repositories/sedesRepository';

export function useSedes() {
  const [sedes,    setSedes]    = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error,    setError]    = useState('');
  const [toast,    setToast]    = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const { data } = await sedesRepository.listar();
      setSedes(data);
    } catch {
      setError('No se pudieron cargar las sedes.');
    } finally {
      setCargando(false);
    }
  }, []);

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
    } catch {
      return false;
    }
  };

  const toggleSede = async (sede) => {
    try {
      const { data } = await sedesRepository.toggle(sede.id);
      setSedes(prev => prev.map(s => s.id === data.id ? data : s));
    } catch { setError('Error al cambiar estado de la sede.'); }
  };

  const eliminarSede = async (id) => {
    try {
      await sedesRepository.eliminar(id);
      setSedes(prev => prev.filter(s => s.id !== id));
      setToast('Sede eliminada');
      return true;
    } catch {
      setError('No se pudo eliminar la sede. Puede que tenga programas activos.');
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
    } catch {
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
    } catch { setError('Error al cambiar estado del programa.'); }
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
    } catch {
      setError('No se pudo eliminar el programa.');
      return false;
    }
  };

  return {
    sedes, cargando, error, toast, setToast, setError,
    guardarSede, toggleSede, eliminarSede,
    guardarPrograma, togglePrograma, eliminarPrograma,
  };
}
