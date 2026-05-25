import { useState, useCallback } from 'react';
import { sedesRepository } from '../../infrastructure/repositories/sedesRepository';

export function useProgramaCampos(programaId) {
  const [campos,   setCampos]   = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error,    setError]    = useState('');

  // [programaId] es intencional: los consumidores hacen useEffect([cargar]) para
  // re-cargar automáticamente cuando cambia el programa. Con useAsyncData el
  // ejecutar es estable y ese disparo no ocurriría.
  const cargar = useCallback(async () => {
    if (!programaId) return;
    setCargando(true);
    setError('');
    try {
      const { data } = await sedesRepository.listarCampos(programaId);
      setCampos(data);
    } catch {
      setError('No se pudieron cargar los campos.');
    } finally {
      setCargando(false);
    }
  }, [programaId]);

  const crearCampo = async (dto) => {
    const { data } = await sedesRepository.crearCampo(programaId, dto);
    setCampos(prev => [...prev, data].sort((a, b) => a.orden - b.orden));
    return data;
  };

  const editarCampo = async (id, dto) => {
    const { data } = await sedesRepository.editarCampo(programaId, id, dto);
    setCampos(prev => prev.map(c => c.id === id ? data : c).sort((a, b) => a.orden - b.orden));
  };

  const eliminarCampo = async (id) => {
    await sedesRepository.eliminarCampo(programaId, id);
    setCampos(prev => prev.filter(c => c.id !== id));
  };

  return { campos, cargando, error, cargar, crearCampo, editarCampo, eliminarCampo };
}
