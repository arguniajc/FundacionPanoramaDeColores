import { useState, useCallback } from 'react';
import { inscripcionesRepository } from '../../infrastructure/repositories/inscripcionesRepository';

export function useInscripciones(filtros = {}) {
  const [inscripciones, setInscripciones] = useState([]);
  const [cargando,      setCargando]      = useState(false);
  const [error,         setError]         = useState('');

  const cargar = useCallback(async (params = filtros) => {
    setCargando(true);
    setError('');
    try {
      const { data } = await inscripcionesRepository.listar(params);
      setInscripciones(data);
    } catch {
      setError('No se pudieron cargar las inscripciones.');
    } finally {
      setCargando(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const crear = async (dto) => {
    const { data } = await inscripcionesRepository.crear(dto);
    setInscripciones(prev => [data, ...prev]);
    return data;
  };

  const actualizar = async (id, dto) => {
    const { data } = await inscripcionesRepository.actualizar(id, dto);
    setInscripciones(prev => prev.map(i => i.id === id ? data : i));
    return data;
  };

  const cambiarEstado = async (id, estado) => {
    const { data } = await inscripcionesRepository.cambiarEstado(id, estado);
    setInscripciones(prev => prev.map(i => i.id === id ? data : i));
  };

  const eliminar = async (id) => {
    await inscripcionesRepository.eliminar(id);
    setInscripciones(prev => prev.filter(i => i.id !== id));
  };

  return { inscripciones, cargando, error, cargar, crear, actualizar, cambiarEstado, eliminar };
}
